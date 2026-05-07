const sql = require('mssql');
const poolPromise = require('../db');

const distribucionController = {};

// LISTAR DISTRIBUCIONES
distribucionController.listar = async (req, res) => {
    try {
        const pool = await poolPromise;

        const distribuciones = await pool.request().query(`
            SELECT 
                pp.IdDistribucion,
                pp.IdProducto,
                pp.IdProveedor,
                p.NombreProducto,
                pr.NombreProveedor,
                pp.CantidadSuministrada,
                p.Stock,
                CONVERT(VARCHAR(10), GETDATE(), 103) + ' ' +
                RIGHT(CONVERT(VARCHAR(20), GETDATE(), 100), 7) AS FechaIngresoFormateada
            FROM Producto_Proveedor pp
            INNER JOIN Productos p ON pp.IdProducto = p.IdProducto
            INNER JOIN Proveedores pr ON pp.IdProveedor = pr.IdProveedor
            ORDER BY pp.IdDistribucion DESC
        `);

        const productos = await pool.request().query(`
            SELECT IdProducto, NombreProducto, Stock
            FROM Productos
            ORDER BY NombreProducto
        `);

        const proveedores = await pool.request().query(`
            SELECT IdProveedor, NombreProveedor
            FROM Proveedores
            ORDER BY NombreProveedor
        `);

        res.render('distribucion/index', {
            distribuciones: distribuciones.recordset,
            productos: productos.recordset,
            proveedores: proveedores.recordset,
            success: req.query.success || '',
            error: req.query.error || ''
        });
    } catch (error) {
        console.error('Error al listar distribución:', error);
        res.redirect('/distribucion?error=error_servidor');
    }
};

// CREAR DISTRIBUCIÓN
distribucionController.crear = async (req, res) => {
    const { IdProducto, IdProveedor, CantidadSuministrada } = req.body;

    try {
        const cantidad = parseInt(CantidadSuministrada);

        if (!IdProducto || !IdProveedor || isNaN(cantidad) || cantidad <= 0) {
            return res.redirect('/distribucion?error=datos_invalidos_distribucion');
        }

        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            await request
                .input('IdProducto', sql.Int, IdProducto)
                .input('IdProveedor', sql.Int, IdProveedor)
                .input('CantidadSuministrada', sql.Int, cantidad)
                .query(`
                    INSERT INTO Producto_Proveedor 
                    (IdProducto, IdProveedor, CantidadSuministrada)
                    VALUES 
                    (@IdProducto, @IdProveedor, @CantidadSuministrada)
                `);

            await request.query(`
                UPDATE Productos
                SET Stock = Stock + @CantidadSuministrada
                WHERE IdProducto = @IdProducto
            `);

            await transaction.commit();
            res.redirect('/distribucion?success=distribucion_creada');

        } catch (error) {
            await transaction.rollback();
            console.error('Error al crear distribución:', error);
            res.redirect('/distribucion?error=error_servidor');
        }

    } catch (error) {
        console.error('Error general al crear distribución:', error);
        res.redirect('/distribucion?error=error_servidor');
    }
};

// FORMULARIO EDITAR DISTRIBUCIÓN
distribucionController.formEditar = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;

        const relacion = await pool.request()
            .input('IdDistribucion', sql.Int, id)
            .query(`
                SELECT 
                    pp.IdDistribucion,
                    pp.IdProducto,
                    pp.IdProveedor,
                    pp.CantidadSuministrada,
                    p.NombreProducto,
                    p.Stock,
                    pr.NombreProveedor
                FROM Producto_Proveedor pp
                INNER JOIN Productos p ON pp.IdProducto = p.IdProducto
                INNER JOIN Proveedores pr ON pp.IdProveedor = pr.IdProveedor
                WHERE pp.IdDistribucion = @IdDistribucion
            `);

        if (relacion.recordset.length === 0) {
            return res.redirect('/distribucion?error=relacion_no_encontrada');
        }

        res.render('distribucion/editar', {
            relacion: relacion.recordset[0],
            success: req.query.success || '',
            error: req.query.error || ''
        });
    } catch (error) {
        console.error('Error al cargar formulario de edición:', error);
        res.redirect('/distribucion?error=error_servidor');
    }
};

// ACTUALIZAR DISTRIBUCIÓN
distribucionController.actualizar = async (req, res) => {
    const { id } = req.params;
    const { CantidadSuministrada } = req.body;

    try {
        const nuevaCantidad = parseInt(CantidadSuministrada);

        if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
            return res.redirect('/distribucion?error=cantidad_invalida');
        }

        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            const relacionActual = await request
                .input('IdDistribucion', sql.Int, id)
                .query(`
                    SELECT IdProducto, CantidadSuministrada
                    FROM Producto_Proveedor
                    WHERE IdDistribucion = @IdDistribucion
                `);

            if (relacionActual.recordset.length === 0) {
                await transaction.rollback();
                return res.redirect('/distribucion?error=relacion_no_encontrada');
            }

            const actual = relacionActual.recordset[0];
            const diferencia = nuevaCantidad - actual.CantidadSuministrada;

            await request
                .input('NuevaCantidad', sql.Int, nuevaCantidad)
                .query(`
                    UPDATE Producto_Proveedor
                    SET CantidadSuministrada = @NuevaCantidad
                    WHERE IdDistribucion = @IdDistribucion
                `);

            await request
                .input('Diferencia', sql.Int, diferencia)
                .input('IdProducto', sql.Int, actual.IdProducto)
                .query(`
                    UPDATE Productos
                    SET Stock = Stock + @Diferencia
                    WHERE IdProducto = @IdProducto
                `);

            await transaction.commit();
            res.redirect('/distribucion?success=distribucion_actualizada');

        } catch (error) {
            await transaction.rollback();
            console.error('Error al actualizar distribución:', error);
            res.redirect('/distribucion?error=error_servidor');
        }

    } catch (error) {
        console.error('Error general al actualizar distribución:', error);
        res.redirect('/distribucion?error=error_servidor');
    }
};

// ELIMINAR DISTRIBUCIÓN
distribucionController.eliminar = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            const request = new sql.Request(transaction);

            const relacion = await request
                .input('IdDistribucion', sql.Int, id)
                .query(`
                    SELECT IdProducto, CantidadSuministrada
                    FROM Producto_Proveedor
                    WHERE IdDistribucion = @IdDistribucion
                `);

            if (relacion.recordset.length === 0) {
                await transaction.rollback();
                return res.redirect('/distribucion?error=relacion_no_encontrada');
            }

            const actual = relacion.recordset[0];

            await request
                .input('Cantidad', sql.Int, actual.CantidadSuministrada)
                .input('IdProducto', sql.Int, actual.IdProducto)
                .query(`
                    UPDATE Productos
                    SET Stock = Stock - @Cantidad
                    WHERE IdProducto = @IdProducto
                `);

            await request.query(`
                DELETE FROM Producto_Proveedor
                WHERE IdDistribucion = @IdDistribucion
            `);

            await transaction.commit();
            res.redirect('/distribucion?success=distribucion_eliminada');

        } catch (error) {
            await transaction.rollback();
            console.error('Error al eliminar distribución:', error);
            res.redirect('/distribucion?error=error_servidor');
        }

    } catch (error) {
        console.error('Error general al eliminar distribución:', error);
        res.redirect('/distribucion?error=error_servidor');
    }
};

module.exports = distribucionController;