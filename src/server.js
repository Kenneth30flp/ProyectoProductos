const express = require('express');
const path = require('path');
const session = require('express-session');
const sql = require('mssql');
require('dotenv').config();

const app = express();

const poolPromise = require('./db');

const perfilRoutes = require('./routes/perfilRoutes');
const productosRoutes = require('./routes/productos');
const proveedoresRoutes = require('./routes/proveedores');
const distribucionRoutes = require('./routes/distribucion');
const reportesRoutes = require('./routes/reportes');
const authRoutes = require('./routes/auth');
const salidasRoutes = require('./routes/salidas');

const { verificarSesion } = require('./middlewares/authMiddleware');

const PORT = process.env.PORT || 3000;

app.set('port', PORT);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// IMPORTANTE: permite enviar gráficas en Base64 al PDF
app.use(express.urlencoded({
    extended: true,
    limit: '100mb'
}));

app.use(express.json({
    limit: '100mb'
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_temporal_proyecto',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 8
    }
}));

app.use(async (req, res, next) => {
    try {
        const usuarioSesion = req.session.usuario || null;

        const idUsuario =
            usuarioSesion?.IdUsuario ||
            usuarioSesion?.idUsuario ||
            usuarioSesion?.id ||
            null;

        if (idUsuario) {
            const pool = await poolPromise;

            const resultado = await pool.request()
                .input('IdUsuario', sql.Int, idUsuario)
                .query(`
                    SELECT
                        IdUsuario,
                        NombreUsuario,
                        CorreoElectronico,
                        Nombres,
                        Apellidos,
                        Foto
                    FROM Usuarios
                    WHERE IdUsuario = @IdUsuario
                `);

            if (resultado.recordset.length > 0) {
                req.session.usuario = {
                    ...req.session.usuario,
                    ...resultado.recordset[0]
                };
            }
        }

        res.locals.usuarioSesion = req.session.usuario || null;
        res.locals.success = req.query.success || null;
        res.locals.error = req.query.error || null;
        next();
    } catch (error) {
        console.error('Error actualizando datos de sesión:', error);
        res.locals.usuarioSesion = req.session.usuario || null;
        res.locals.success = req.query.success || null;
        res.locals.error = req.query.error || null;
        next();
    }
});

app.use('/auth', authRoutes);

app.get('/', verificarSesion, async (req, res) => {
    try {
        const pool = await poolPromise;

        const totalProductos = await pool.request().query(`
            SELECT COUNT(*) AS total FROM Productos
        `);

        const totalProveedores = await pool.request().query(`
            SELECT COUNT(*) AS total FROM Proveedores
        `);

        const totalRelaciones = await pool.request().query(`
            SELECT COUNT(*) AS total FROM Producto_Proveedor
        `);

        const stockTotal = await pool.request().query(`
            SELECT SUM(Stock) AS total FROM Productos
        `);

        const resumen = {
            TotalProductos: totalProductos.recordset[0].total,
            TotalProveedores: totalProveedores.recordset[0].total,
            TotalRelaciones: totalRelaciones.recordset[0].total,
            StockTotal: stockTotal.recordset[0].total || 0
        };

        res.render('index', { resumen });
    } catch (error) {
        console.error('Error cargando dashboard:', error);

        res.render('index', {
            resumen: {
                TotalProductos: 0,
                TotalProveedores: 0,
                TotalRelaciones: 0,
                StockTotal: 0
            }
        });
    }
});

app.use('/productos', verificarSesion, productosRoutes);
app.use('/proveedores', verificarSesion, proveedoresRoutes);
app.use('/distribucion', verificarSesion, distribucionRoutes);
app.use('/reportes', verificarSesion, reportesRoutes);
app.use('/salidas', verificarSesion, salidasRoutes);
app.use('/perfil', verificarSesion, perfilRoutes);

app.use((req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/auth/login?error=Debes iniciar sesión');
    }

    return res.redirect('/?error=La ruta solicitada no existe');
});

const server = app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error('Error del servidor:', err);
});

process.on('exit', (code) => {
    console.log('El proceso terminó con código:', code);
});

process.on('uncaughtException', (err) => {
    console.error('Excepción no capturada:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Promesa rechazada no manejada:', reason);
});