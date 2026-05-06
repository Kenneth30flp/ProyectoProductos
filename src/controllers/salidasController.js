const sql = require('mssql');
const poolPromise = require('../db');
const mysqlPool = require('../dbMysql');
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

        const [clientes] = await mysqlPool.query(`
            SELECT
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) AS nit,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nombre')) AS nombre,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.direccion')) AS direccion,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.telefono')) AS telefono,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.correo')) AS correo
            FROM Clientes
            ORDER BY nombre ASC
        `);

        res.render('salidas/nueva', {
            productos: productos.recordset,
            clientes,
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
    const { idProducto, cantidad, nitCliente } = req.body;
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
            .input('NIT_Cliente', sql.VarChar(50), nitCliente || null)
            .query(`
                INSERT INTO dbo.SalidaProductos (IdProducto, Cantidad, NIT_Cliente)
            VALUES (@IdProducto, @Cantidad, @NIT_Cliente)
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
// Buscar cliente por NIT desde MySQL usando JSON_EXTRACT
salidasController.buscarClientePorNit = async (req, res) => {
    try {
        const nit = limpiarNit(req.params.nit);

        if (!nit) {
            return res.status(400).json({
                encontrado: false,
                mensaje: 'Debe ingresar un NIT.'
            });
        }

        const [rows] = await mysqlPool.query(`
            SELECT
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) AS nit,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nombre')) AS nombre,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.direccion')) AS direccion,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.telefono')) AS telefono,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.correo')) AS correo
            FROM Clientes
            WHERE JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) = ?
            LIMIT 1
        `, [nit]);

        if (rows.length > 0) {
            return res.json({
                encontrado: true,
                cliente: rows[0]
            });
        }

        const [cf] = await mysqlPool.query(`
            SELECT
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) AS nit,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nombre')) AS nombre,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.direccion')) AS direccion,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.telefono')) AS telefono,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.correo')) AS correo
            FROM Clientes
            WHERE JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) = 'CF'
            LIMIT 1
        `);

        return res.json({
            encontrado: false,
            usarCF: true,
            cliente: cf[0] || null,
            mensaje: 'Cliente no encontrado. Se usará Consumidor Final.'
        });

    } catch (error) {
        console.error('Error buscando cliente:', error);
        return res.status(500).json({
            encontrado: false,
            mensaje: 'Error al consultar cliente.'
        });
    }
};

function limpiarNit(nit) {
    return String(nit || '').trim().toUpperCase();
}

salidasController.listarClientes = async (req, res) => {
    try {
        const [clientes] = await mysqlPool.query(`
            SELECT 
                id_cliente,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) AS nit,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nombre')) AS nombre,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.direccion')) AS direccion,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.telefono')) AS telefono,
                JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.correo')) AS correo
            FROM Clientes
            ORDER BY id_cliente DESC
        `);

        res.render('salidas/clientes', {
            clientes,
            success: req.query.success || null,
            error: req.query.error || null
        });

    } catch (error) {
        console.error('Error al listar clientes:', error);
        res.redirect('/salidas?error=No se pudieron cargar los clientes');
    }
};

salidasController.crearCliente = async (req, res) => {
    try {
        let { nit, nombre, direccion, telefono, correo } = req.body;
        nit = limpiarNit(nit);

        if (!nit || !nombre || !direccion || !telefono || !correo) {
            return res.redirect('/salidas/clientes?error=Todos los campos son obligatorios');
        }

        if (nit !== 'CF') {
            const [existe] = await mysqlPool.query(`
                SELECT id_cliente
                FROM Clientes
                WHERE JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) = ?
                LIMIT 1
            `, [nit]);

            if (existe.length > 0) {
                return res.redirect('/salidas/clientes?error=Ya existe un cliente con ese NIT');
            }
        }

        await mysqlPool.query(`
            INSERT INTO Clientes (datos_cliente)
            VALUES (JSON_OBJECT(
                'nit', ?,
                'nombre', ?,
                'direccion', ?,
                'telefono', ?,
                'correo', ?
            ))
        `, [nit, nombre, direccion, telefono, correo]);

        res.redirect('/salidas/clientes?success=Cliente registrado correctamente');

    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.redirect('/salidas/clientes?error=No se pudo registrar el cliente');
    }
};

salidasController.editarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        let { nit, nombre, direccion, telefono, correo } = req.body;
        nit = limpiarNit(nit);

        if (!nit || !nombre || !direccion || !telefono || !correo) {
            return res.redirect('/salidas/clientes?error=Todos los campos son obligatorios');
        }

        if (nit !== 'CF') {
            const [duplicado] = await mysqlPool.query(`
                SELECT id_cliente
                FROM Clientes
                WHERE JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) = ?
                AND id_cliente <> ?
                LIMIT 1
            `, [nit, id]);

            if (duplicado.length > 0) {
                return res.redirect('/salidas/clientes?error=El NIT ya está registrado en otro cliente');
            }
        }

        await mysqlPool.query(`
            UPDATE Clientes
            SET datos_cliente = JSON_OBJECT(
                'nit', ?,
                'nombre', ?,
                'direccion', ?,
                'telefono', ?,
                'correo', ?
            )
            WHERE id_cliente = ?
        `, [nit, nombre, direccion, telefono, correo, id]);

        res.redirect('/salidas/clientes?success=Cliente actualizado correctamente');

    } catch (error) {
        console.error('Error al editar cliente:', error);
        res.redirect('/salidas/clientes?error=No se pudo actualizar el cliente');
    }
};

salidasController.eliminarCliente = async (req, res) => {
    try {
        const { id } = req.params;

        const [cliente] = await mysqlPool.query(`
            SELECT JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) AS nit
            FROM Clientes
            WHERE id_cliente = ?
        `, [id]);

        if (cliente.length === 0) {
            return res.redirect('/salidas/clientes?error=Cliente no encontrado');
        }

        await mysqlPool.query(`
            DELETE FROM Clientes
            WHERE id_cliente = ?
        `, [id]);

        res.redirect('/salidas/clientes?success=Cliente eliminado correctamente');

    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.redirect('/salidas/clientes?error=No se pudo eliminar el cliente');
    }
};

salidasController.validarNitCliente = async (req, res) => {
    try {
        const nit = limpiarNit(req.params.nit);

        if (!nit) {
            return res.json({ existe: false });
        }

        if (nit === 'CF') {
            return res.json({
                existe: false,
                permitido: true,
                mensaje: 'CF permitido. Puede repetirse.'
            });
        }

        const [rows] = await mysqlPool.query(`
            SELECT id_cliente
            FROM Clientes
            WHERE JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) = ?
            LIMIT 1
        `, [nit]);

        return res.json({
            existe: rows.length > 0,
            permitido: rows.length === 0,
            mensaje: rows.length > 0
                ? 'Este NIT ya está registrado.'
                : 'NIT disponible.'
        });

    } catch (error) {
        console.error('Error validando NIT:', error);
        return res.status(500).json({
            existe: false,
            permitido: false,
            mensaje: 'Error al validar NIT.'
        });
    }
};

salidasController.validarNitCliente = async (req, res) => {
    try {
        const nit = limpiarNit(req.params.nit);

        if (!nit) {
            return res.json({
                permitido: false,
                mensaje: 'Debe ingresar un NIT.'
            });
        }

        if (nit === 'CF') {
            return res.json({
                permitido: true,
                mensaje: 'CF permitido. Puede repetirse.'
            });
        }

        const [rows] = await mysqlPool.query(`
            SELECT id_cliente
            FROM Clientes
            WHERE JSON_UNQUOTE(JSON_EXTRACT(datos_cliente, '$.nit')) = ?
            LIMIT 1
        `, [nit]);

        if (rows.length > 0) {
            return res.json({
                permitido: false,
                mensaje: 'Este NIT ya está registrado.'
            });
        }

        return res.json({
            permitido: true,
            mensaje: 'NIT disponible.'
        });

    } catch (error) {
        console.error('Error validando NIT:', error);

        return res.status(500).json({
            permitido: false,
            mensaje: 'No se pudo validar el NIT.'
        });
    }
};

module.exports = salidasController;