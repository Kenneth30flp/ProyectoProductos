const bcrypt = require('bcrypt');
const poolPromise = require('../db');

const authController = {};

// Mostrar login
authController.mostrarLogin = (req, res) => {
    res.render('auth/login', {
        success: req.query.success || null,
        error: req.query.error || null
    });
};

// Mostrar registro
authController.mostrarRegistro = (req, res) => {
    res.render('auth/register', {
        success: req.query.success || null,
        error: req.query.error || null,
        old: {
            nombreUsuario: '',
            correoElectronico: ''
        }
    });
};

// Registrar usuario
authController.registrarUsuario = async (req, res) => {
    const { nombreUsuario, correoElectronico, contrasena, confirmarContrasena } = req.body;

    try {
        const pool = await poolPromise;

        const old = {
            nombreUsuario: nombreUsuario || '',
            correoElectronico: correoElectronico || ''
        };

        if (!nombreUsuario || !correoElectronico || !contrasena || !confirmarContrasena) {
            return res.render('auth/register', {
                success: null,
                error: 'Todos los campos son obligatorios.',
                old
            });
        }

        if (nombreUsuario.trim().length < 3) {
            return res.render('auth/register', {
                success: null,
                error: 'El nombre de usuario debe tener al menos 3 caracteres.',
                old
            });
        }

        if (correoElectronico.trim().length < 5 || !correoElectronico.includes('@')) {
            return res.render('auth/register', {
                success: null,
                error: 'Debes ingresar un correo electrónico válido.',
                old
            });
        }

        if (contrasena.length < 6) {
            return res.render('auth/register', {
                success: null,
                error: 'La contraseña debe tener al menos 6 caracteres.',
                old
            });
        }

        if (contrasena !== confirmarContrasena) {
            return res.render('auth/register', {
                success: null,
                error: 'Las contraseñas no coinciden.',
                old
            });
        }

        const usuarioExistente = await pool.request()
            .input('NombreUsuario', nombreUsuario.trim())
            .input('CorreoElectronico', correoElectronico.trim())
            .query(`
                SELECT IdUsuario
                FROM Usuarios
                WHERE NombreUsuario = @NombreUsuario
                   OR CorreoElectronico = @CorreoElectronico
            `);

        if (usuarioExistente.recordset.length > 0) {
            return res.render('auth/register', {
                success: null,
                error: 'El nombre de usuario o el correo ya están registrados.',
                old
            });
        }

        const hash = await bcrypt.hash(contrasena, 10);

        await pool.request()
            .input('NombreUsuario', nombreUsuario.trim())
            .input('CorreoElectronico', correoElectronico.trim())
            .input('Contrasena', hash)
            .query(`
                INSERT INTO Usuarios (NombreUsuario, CorreoElectronico, Contrasena)
                VALUES (@NombreUsuario, @CorreoElectronico, @Contrasena)
            `);

        return res.redirect('/auth/login?success=Usuario registrado correctamente. Ahora puedes iniciar sesión');
    } catch (error) {
        console.error('Error al registrar usuario:', error);

        return res.render('auth/register', {
            success: null,
            error: 'Ocurrió un error al registrar el usuario.',
            old: {
                nombreUsuario: nombreUsuario || '',
                correoElectronico: correoElectronico || ''
            }
        });
    }
};

// Iniciar sesión
authController.iniciarSesion = async (req, res) => {
    const { usuario, contrasena } = req.body;

    try {
        if (!usuario || !contrasena) {
            return res.render('auth/login', {
                success: null,
                error: 'Debes completar todos los campos.'
            });
        }

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input('Usuario', usuario.trim())
            .query(`
                SELECT IdUsuario, NombreUsuario, CorreoElectronico, Contrasena
                FROM Usuarios
                WHERE NombreUsuario = @Usuario
                   OR CorreoElectronico = @Usuario
            `);

        if (resultado.recordset.length === 0) {
            return res.render('auth/login', {
                success: null,
                error: 'Credenciales incorrectas.'
            });
        }

        const usuarioDB = resultado.recordset[0];

        const coincide = await bcrypt.compare(contrasena, usuarioDB.Contrasena);

        if (!coincide) {
            return res.render('auth/login', {
                success: null,
                error: 'Credenciales incorrectas.'
            });
        }

        req.session.usuario = {
            id: usuarioDB.IdUsuario,
            nombreUsuario: usuarioDB.NombreUsuario,
            correoElectronico: usuarioDB.CorreoElectronico
        };

        return res.redirect('/?success=Bienvenido al sistema');
    } catch (error) {
        console.error('Error al iniciar sesión:', error);

        return res.render('auth/login', {
            success: null,
            error: 'Ocurrió un error al iniciar sesión.'
        });
    }
};

// Cerrar sesión
authController.cerrarSesion = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Error al cerrar sesión:', error);
            return res.redirect('/?error=No se pudo cerrar la sesión');
        }

        res.clearCookie('connect.sid');
        return res.redirect('/auth/login?success=Sesión cerrada correctamente');
    });
};

module.exports = authController;