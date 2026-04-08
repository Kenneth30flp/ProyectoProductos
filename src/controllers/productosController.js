const sql = require('mssql');
const poolPromise = require('../db');

const productosController = {};

// LISTAR PRODUCTOS
productosController.listar = async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT 
                IdProducto,
                NombreProducto,
                Descripcion,
                Precio,
                Stock,
                CONVERT(VARCHAR(10), FechaIngreso, 103) + ' ' +
                RIGHT(CONVERT(VARCHAR(20), FechaIngreso, 100), 7) AS FechaIngresoFormateada
            FROM Productos
            ORDER BY IdProducto DESC
        `);

        res.render('productos/index', {
            productos: result.recordset,
            success: req.query.success || '',
            error: req.query.error || ''
        });

    } catch (error) {
        console.error('Error al listar productos:', error);
        res.redirect('/productos?error=error_servidor');
    }
};

// FORMULARIO NUEVO PRODUCTO
productosController.formNuevo = (req, res) => {
    res.render('productos/nuevo', {
        success: req.query.success || '',
        error: req.query.error || ''
    });
};

// CREAR PRODUCTO
productosController.crear = async (req, res) => {
    const { NombreProducto, Descripcion, Precio, Stock } = req.body;

    try {
        const pool = await poolPromise;

        const existe = await pool.request()
            .input('NombreProducto', sql.VarChar(100), NombreProducto)
            .query(`
                SELECT COUNT(*) AS total
                FROM Productos
                WHERE NombreProducto = @NombreProducto
            `);

        if (existe.recordset[0].total > 0) {
            return res.redirect('/productos?error=producto_duplicado');
        }

        await pool.request()
            .input('NombreProducto', sql.VarChar(100), NombreProducto)
            .input('Descripcion', sql.Text, Descripcion)
            .input('Precio', sql.Decimal(10, 2), Precio)
            .input('Stock', sql.Int, Stock)
            .query(`
                INSERT INTO Productos
                (NombreProducto, Descripcion, Precio, Stock)
                VALUES
                (@NombreProducto, @Descripcion, @Precio, @Stock)
            `);

        res.redirect('/productos?success=producto_creado');

    } catch (error) {
        console.error('Error al crear producto:', error);
        res.redirect('/productos?error=error_servidor');
    }
};

// FORMULARIO EDITAR PRODUCTO
productosController.formEditar = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('IdProducto', sql.Int, id)
            .query(`
                SELECT 
                    IdProducto,
                    NombreProducto,
                    Descripcion,
                    Precio,
                    Stock,
                    CONVERT(VARCHAR(10), FechaIngreso, 103) + ' ' +
                    RIGHT(CONVERT(VARCHAR(20), FechaIngreso, 100), 7) AS FechaIngresoFormateada
                FROM Productos
                WHERE IdProducto = @IdProducto
            `);

        if (result.recordset.length === 0) {
            return res.redirect('/productos?error=producto_no_encontrado');
        }

        res.render('productos/editar', {
            producto: result.recordset[0],
            success: req.query.success || '',
            error: req.query.error || ''
        });

    } catch (error) {
        console.error('Error al cargar producto:', error);
        res.redirect('/productos?error=error_servidor');
    }
};

// ACTUALIZAR PRODUCTO
productosController.actualizar = async (req, res) => {
    const { id } = req.params;
    const { NombreProducto, Descripcion, Precio, Stock } = req.body;

    try {
        const pool = await poolPromise;

        const existe = await pool.request()
            .input('NombreProducto', sql.VarChar(100), NombreProducto)
            .input('IdProducto', sql.Int, id)
            .query(`
                SELECT COUNT(*) AS total
                FROM Productos
                WHERE NombreProducto = @NombreProducto
                AND IdProducto <> @IdProducto
            `);

        if (existe.recordset[0].total > 0) {
            return res.redirect('/productos?error=producto_duplicado');
        }

        await pool.request()
            .input('IdProducto', sql.Int, id)
            .input('NombreProducto', sql.VarChar(100), NombreProducto)
            .input('Descripcion', sql.Text, Descripcion)
            .input('Precio', sql.Decimal(10, 2), Precio)
            .input('Stock', sql.Int, Stock)
            .query(`
                UPDATE Productos
                SET
                    NombreProducto = @NombreProducto,
                    Descripcion = @Descripcion,
                    Precio = @Precio,
                    Stock = @Stock
                WHERE IdProducto = @IdProducto
            `);

        res.redirect('/productos?success=producto_actualizado');

    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.redirect('/productos?error=error_servidor');
    }
};

// ELIMINAR PRODUCTO
productosController.eliminar = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('IdProducto', sql.Int, id)
            .query(`
                DELETE FROM Productos
                WHERE IdProducto = @IdProducto
            `);

        res.redirect('/productos?success=producto_eliminado');

    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.redirect('/productos?error=error_servidor');
    }
};

module.exports = productosController;