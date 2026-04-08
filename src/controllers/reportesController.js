const poolPromise = require('../db');

const reportesController = {};

// DASHBOARD / MENÚ PRINCIPAL
reportesController.dashboard = async (req, res) => {
    try {
        res.render('index');
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        res.status(500).send('Error al cargar dashboard');
    }
};

// REPORTES
reportesController.index = async (req, res) => {
    try {
        const pool = await poolPromise;

        const resumenResult = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM Productos) AS TotalProductos,
                (SELECT COUNT(*) FROM Proveedores) AS TotalProveedores,
                (SELECT COUNT(*) FROM Producto_Proveedor) AS TotalRelaciones,
                (SELECT ISNULL(SUM(Stock), 0) FROM Productos) AS StockTotal
        `);

        const stockPorProductoResult = await pool.request().query(`
            SELECT 
                IdProducto,
                NombreProducto,
                Descripcion,
                Precio,
                Stock,
                CONVERT(VARCHAR(10), FechaIngreso, 103) + ' ' +
                RIGHT(CONVERT(VARCHAR(20), FechaIngreso, 100), 7) AS FechaIngresoFormateada
            FROM Productos
            ORDER BY Stock DESC, NombreProducto ASC
        `);

        const suministradoPorProveedorResult = await pool.request().query(`
            SELECT 
                pr.IdProveedor,
                pr.NombreProveedor,
                pr.Telefono,
                pr.CorreoElectronico,
                ISNULL(COUNT(pp.IdProducto), 0) AS ProductosRelacionados,
                ISNULL(SUM(pp.CantidadSuministrada), 0) AS TotalSuministrado
            FROM Proveedores pr
            LEFT JOIN Producto_Proveedor pp
                ON pr.IdProveedor = pp.IdProveedor
            GROUP BY
                pr.IdProveedor,
                pr.NombreProveedor,
                pr.Telefono,
                pr.CorreoElectronico
            ORDER BY TotalSuministrado DESC, pr.NombreProveedor ASC
        `);

        const topProductosDistribuidosResult = await pool.request().query(`
            SELECT 
                p.IdProducto,
                p.NombreProducto,
                ISNULL(SUM(pp.CantidadSuministrada), 0) AS TotalDistribuido,
                ISNULL(COUNT(pp.IdProveedor), 0) AS TotalProveedores
            FROM Productos p
            LEFT JOIN Producto_Proveedor pp
                ON p.IdProducto = pp.IdProducto
            GROUP BY
                p.IdProducto,
                p.NombreProducto
            ORDER BY TotalDistribuido DESC, p.NombreProducto ASC
        `);

        res.render('reportes/index', {
            resumen: resumenResult.recordset[0],
            stockPorProducto: stockPorProductoResult.recordset,
            suministradoPorProveedor: suministradoPorProveedorResult.recordset,
            topProductosDistribuidos: topProductosDistribuidosResult.recordset
        });

    } catch (error) {
        console.error('Error al cargar reportes:', error);
        res.status(500).send('Error al cargar reportes');
    }
};

module.exports = reportesController;