const poolPromise = require('../db');
const PDFDocument = require('pdfkit-table');

const reportesController = {};

async function obtenerDatosReportes() {
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

    return {
        resumen: resumenResult.recordset[0],
        stockPorProducto: stockPorProductoResult.recordset,
        suministradoPorProveedor: suministradoPorProveedorResult.recordset,
        topProductosDistribuidos: topProductosDistribuidosResult.recordset
    };
}

function limpiarImagenBase64(imagen) {
    if (!imagen) return null;

    return imagen
        .replace(/^data:image\/png;base64,/, '')
        .replace(/^data:image\/jpeg;base64,/, '')
        .replace(/^data:image\/jpg;base64,/, '');
}

function encabezado(doc) {
    doc.rect(0, 0, doc.page.width, 80).fill('#111827');

    doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(24)
        .text('ProyectoProductos', 40, 20, { align: 'center' });

    doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#d1d5db')
        .text('Reporte general del inventario', 40, 52, { align: 'center' });

    doc.y = 105;
}

function tituloSeccion(doc, titulo) {
    doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor('#111827')
        .text(titulo);

    doc
        .moveTo(40, doc.y + 5)
        .lineTo(doc.page.width - 40, doc.y + 5)
        .strokeColor('#d1d5db')
        .stroke();

    doc.moveDown(1);
}

function piePagina(doc) {
    doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6b7280')
        .text(
            'Documento generado automáticamente por el sistema ProyectoProductos.',
            40,
            doc.page.height - 35,
            { align: 'center' }
        );
}

reportesController.dashboard = async (req, res) => {
    try {
        res.render('index');
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        res.status(500).send('Error al cargar dashboard');
    }
};

reportesController.index = async (req, res) => {
    try {
        const datos = await obtenerDatosReportes();
        res.render('reportes/index', datos);
    } catch (error) {
        console.error('Error al cargar reportes:', error);
        res.status(500).send('Error al cargar reportes');
    }
};

reportesController.exportarPDF = async (req, res) => {
    try {
        const {
            resumen,
            stockPorProducto,
            suministradoPorProveedor,
            topProductosDistribuidos
        } = await obtenerDatosReportes();

        const {
            graficoStock,
            graficoProveedor,
            graficoProductosDistribuidos
        } = req.body;

        const fechaGeneracion = new Date().toLocaleString('es-GT', {
            dateStyle: 'full',
            timeStyle: 'medium'
        });

        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 40
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="Reporte_Profesional_ProyectoProductos.pdf"'
        );

        doc.pipe(res);

        encabezado(doc);

        doc
            .font('Helvetica-Bold')
            .fontSize(20)
            .fillColor('#111827')
            .text('Informe profesional de reportes', { align: 'center' });

        doc.moveDown(0.5);

        doc
            .font('Helvetica')
            .fontSize(11)
            .fillColor('#374151')
            .text(`Fecha y hora de generación: ${fechaGeneracion}`, { align: 'center' });

        doc.moveDown(1.5);

        tituloSeccion(doc, 'Resumen general del inventario');

        await doc.table({
            headers: [
                'Total productos',
                'Total proveedores',
                'Total relaciones',
                'Stock total'
            ],
            rows: [[
                String(resumen.TotalProductos),
                String(resumen.TotalProveedores),
                String(resumen.TotalRelaciones),
                String(resumen.StockTotal)
            ]]
        }, {
            columnsSize: [180, 180, 180, 180],
            padding: 8,
            headerBackground: '#1d4ed8',
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff'),
            prepareRow: () => doc.font('Helvetica').fontSize(12).fillColor('#111827')
        });

        doc.moveDown(1);

        tituloSeccion(doc, 'Análisis gráfico del inventario');

        const imagenStock = limpiarImagenBase64(graficoStock);
        const imagenProveedor = limpiarImagenBase64(graficoProveedor);
        const imagenDistribuidos = limpiarImagenBase64(graficoProductosDistribuidos);

        if (imagenStock) {
            doc
                .font('Helvetica-Bold')
                .fontSize(12)
                .fillColor('#111827')
                .text('Gráfica de stock por producto');

            doc.moveDown(0.5);

            doc.image(Buffer.from(imagenStock, 'base64'), 80, doc.y, {
                width: 660
            });
        }

        piePagina(doc);

        doc.addPage();
        encabezado(doc);

        if (imagenProveedor) {
            tituloSeccion(doc, 'Gráfica de cantidad suministrada por proveedor');

            doc.image(Buffer.from(imagenProveedor, 'base64'), 150, doc.y, {
                width: 520
            });
        }

        piePagina(doc);

        doc.addPage();
        encabezado(doc);

        if (imagenDistribuidos) {
            tituloSeccion(doc, 'Gráfica de productos más distribuidos');

            doc.image(Buffer.from(imagenDistribuidos, 'base64'), 75, doc.y, {
                width: 680
            });
        }

        piePagina(doc);

        doc.addPage();
        encabezado(doc);
        tituloSeccion(doc, 'Detalle: stock por producto');

        await doc.table({
            headers: ['ID', 'Producto', 'Descripción', 'Precio', 'Stock', 'Fecha ingreso'],
            rows: stockPorProducto.map(producto => [
                String(producto.IdProducto),
                producto.NombreProducto || '-',
                producto.Descripcion || 'Sin descripción',
                `Q ${producto.Precio || '0.00'}`,
                String(producto.Stock),
                producto.FechaIngresoFormateada || '-'
            ])
        }, {
            columnsSize: [45, 130, 220, 70, 60, 130],
            padding: 5,
            headerBackground: '#2563eb',
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff'),
            prepareRow: () => doc.font('Helvetica').fontSize(7.5).fillColor('#111827')
        });

        piePagina(doc);

        doc.addPage();
        encabezado(doc);
        tituloSeccion(doc, 'Detalle: cantidad suministrada por proveedor');

        await doc.table({
            headers: [
                'ID',
                'Proveedor',
                'Teléfono',
                'Correo',
                'Productos relacionados',
                'Total suministrado'
            ],
            rows: suministradoPorProveedor.map(proveedor => [
                String(proveedor.IdProveedor),
                proveedor.NombreProveedor || '-',
                proveedor.Telefono || '-',
                proveedor.CorreoElectronico || '-',
                String(proveedor.ProductosRelacionados),
                String(proveedor.TotalSuministrado)
            ])
        }, {
            columnsSize: [45, 150, 95, 210, 130, 120],
            padding: 5,
            headerBackground: '#15803d',
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff'),
            prepareRow: () => doc.font('Helvetica').fontSize(7.5).fillColor('#111827')
        });

        piePagina(doc);

        doc.addPage();
        encabezado(doc);
        tituloSeccion(doc, 'Detalle: productos más distribuidos');

        await doc.table({
            headers: [
                'ID',
                'Producto',
                'Total distribuido',
                'Total proveedores relacionados'
            ],
            rows: topProductosDistribuidos.map(producto => [
                String(producto.IdProducto),
                producto.NombreProducto || '-',
                String(producto.TotalDistribuido),
                String(producto.TotalProveedores)
            ])
        }, {
            columnsSize: [70, 310, 170, 220],
            padding: 6,
            headerBackground: '#111827',
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff'),
            prepareRow: () => doc.font('Helvetica').fontSize(8).fillColor('#111827')
        });

        piePagina(doc);

        doc.end();

    } catch (error) {
        console.error('Error al exportar PDF:', error);
        res.status(500).send('Error al exportar PDF');
    }
};

module.exports = reportesController;