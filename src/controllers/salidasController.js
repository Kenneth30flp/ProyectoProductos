const sql = require('mssql');
const poolPromise = require('../db');

const salidasController = {};

// Listado de salidass


// Listado de salidas
salidasController.listar = async (req, res) => {
    try {
        const pool = await poolPromise;

        const resultado = await pool.request().query(`
            SELECT 
                sp.IdSalida AS ID,
                sp.Cantidad,
                CONVERT(varchar(10), sp.FechaSalida, 103) 
                    + ' ' + 
                    LTRIM(RIGHT(CONVERT(varchar(20), sp.FechaSalida, 100), 7)) AS FechaSalidaTexto,
                p.IdProducto,
                p.NombreProducto AS Producto,
                p.Stock
            FROM dbo.SalidaProductos sp
            INNER JOIN dbo.Productos p ON sp.IdProducto = p.IdProducto
            ORDER BY sp.FechaSalida DESC, sp.IdSalida DESC
        `);

        res.render('salidas/index', {
            salidas: resultado.recordset,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Error al listar salidas:', error);
        res.redirect('/?error=No se pudo cargar el módulo de salidas');
    }
};

// Formulario nueva salida
salidasController.formularioNueva = async (req, res) => {
    try {
        const pool = await poolPromise;

        const productos = await pool.request().query(`
            SELECT IdProducto, NombreProducto, Stock
            FROM dbo.Productos
            ORDER BY NombreProducto ASC
        `);

        res.render('salidas/nueva', {
            productos: productos.recordset,
            old: {
                idProducto: '',
                cantidad: ''
            },
            errorLocal: null
        });
    } catch (error) {
        console.error('Error al cargar formulario de salida:', error);
        res.redirect('/salidas?error=No se pudo cargar el formulario');
    }
};

// Registrar salida
salidasController.registrar = async (req, res) => {
    const { idProducto, cantidad } = req.body;
    const old = {
        idProducto: idProducto || '',
        cantidad: cantidad || ''
    };

    let transaction;

    try {
        const pool = await poolPromise;

        if (!idProducto || !cantidad) {
            const productos = await pool.request().query(`
                SELECT IdProducto, NombreProducto, Stock
                FROM dbo.Productos
                ORDER BY NombreProducto ASC
            `);

            return res.status(400).render('salidas/nueva', {
                productos: productos.recordset,
                old,
                errorLocal: 'Todos los campos son obligatorios.'
            });
        }

        const cantidadNumero = parseInt(cantidad, 10);
        const idProductoNumero = parseInt(idProducto, 10);

        if (isNaN(cantidadNumero) || cantidadNumero <= 0) {
            const productos = await pool.request().query(`
                SELECT IdProducto, NombreProducto, Stock
                FROM dbo.Productos
                ORDER BY NombreProducto ASC
            `);

            return res.status(400).render('salidas/nueva', {
                productos: productos.recordset,
                old,
                errorLocal: 'La cantidad debe ser un número mayor que 0.'
            });
        }

        if (isNaN(idProductoNumero) || idProductoNumero <= 0) {
            const productos = await pool.request().query(`
                SELECT IdProducto, NombreProducto, Stock
                FROM dbo.Productos
                ORDER BY NombreProducto ASC
            `);

            return res.status(400).render('salidas/nueva', {
                productos: productos.recordset,
                old,
                errorLocal: 'El producto seleccionado no es válido.'
            });
        }

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const productoResult = await new sql.Request(transaction)
            .input('IdProducto', sql.Int, idProductoNumero)
            .query(`
                SELECT IdProducto, NombreProducto, Stock
                FROM dbo.Productos
                WHERE IdProducto = @IdProducto
            `);

        if (productoResult.recordset.length === 0) {
            await transaction.rollback();

            const productos = await pool.request().query(`
                SELECT IdProducto, NombreProducto, Stock
                FROM dbo.Productos
                ORDER BY NombreProducto ASC
            `);

            return res.status(404).render('salidas/nueva', {
                productos: productos.recordset,
                old,
                errorLocal: 'El producto seleccionado no existe.'
            });
        }

        const producto = productoResult.recordset[0];

        if (producto.Stock < cantidadNumero) {
            await transaction.rollback();

            const productos = await pool.request().query(`
                SELECT IdProducto, NombreProducto, Stock
                FROM dbo.Productos
                ORDER BY NombreProducto ASC
            `);

            return res.status(400).render('salidas/nueva', {
                productos: productos.recordset,
                old,
                errorLocal: `Stock insuficiente. Disponible: ${producto.Stock}`
            });
        }

        await new sql.Request(transaction)
            .input('IdProducto', sql.Int, idProductoNumero)
            .input('Cantidad', sql.Int, cantidadNumero)
            .query(`
                INSERT INTO dbo.SalidaProductos (IdProducto, Cantidad)
                VALUES (@IdProducto, @Cantidad)
            `);

        await new sql.Request(transaction)
            .input('IdProducto', sql.Int, idProductoNumero)
            .input('Cantidad', sql.Int, cantidadNumero)
            .query(`
                UPDATE dbo.Productos
                SET Stock = Stock - @Cantidad
                WHERE IdProducto = @IdProducto
            `);

        await transaction.commit();

        return res.redirect('/salidas?success=Salida registrada correctamente y stock actualizado');
    } catch (error) {
        console.error('Error al registrar salida:', error);

        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Error al revertir transacción:', rollbackError);
            }
        }

        try {
            const pool = await poolPromise;
            const productos = await pool.request().query(`
                SELECT IdProducto, NombreProducto, Stock
                FROM dbo.Productos
                ORDER BY NombreProducto ASC
            `);

            return res.status(500).render('salidas/nueva', {
                productos: productos.recordset,
                old,
                errorLocal: 'Ocurrió un error al registrar la salida.'
            });
        } catch {
            return res.redirect('/salidas?error=Ocurrió un error al registrar la salida');
        }
    }
};

module.exports = salidasController;