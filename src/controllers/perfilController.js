const bcrypt = require('bcrypt');
const sql = require('mssql');
const poolPromise = require('../db');

function obtenerIdUsuarioSesion(usuarioSesion) {
    return (
        usuarioSesion?.IdUsuario ||
        usuarioSesion?.idUsuario ||
        usuarioSesion?.id ||
        null
    );
}

function limpiarTexto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

function validarEmail(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

exports.mostrarPerfil = async (req, res) => {
    try {
        const idUsuario = obtenerIdUsuarioSesion(req.session.usuario);

        if (!idUsuario) {
            return res.redirect('/auth/login?error=Sesión inválida');
        }

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input('IdUsuario', sql.Int, idUsuario)
            .query(`
                SELECT
                    IdUsuario,
                    NombreUsuario,
                    CorreoElectronico,
                    FechaRegistro,
                    Nombres,
                    Apellidos,
                    Telefono,
                    Direccion,
                    Foto
                FROM Usuarios
                WHERE IdUsuario = @IdUsuario
            `);

        if (resultado.recordset.length === 0) {
            return res.redirect('/?error=Usuario no encontrado');
        }

        const usuario = resultado.recordset[0];

        return res.render('perfil/index', { usuario });
    } catch (error) {
        console.error('Error al mostrar perfil:', error);
        return res.redirect('/?error=No se pudo cargar el perfil');
    }
};

exports.actualizarPerfil = async (req, res) => {
    try {
        const idUsuario = obtenerIdUsuarioSesion(req.session.usuario);

        if (!idUsuario) {
            return res.redirect('/auth/login?error=Sesión inválida');
        }

        const nombres = limpiarTexto(req.body.nombres);
        const apellidos = limpiarTexto(req.body.apellidos);
        const nombreUsuario = limpiarTexto(req.body.nombreUsuario);
        const correoElectronico = limpiarTexto(req.body.correoElectronico);
        const telefono = limpiarTexto(req.body.telefono);
        const direccion = limpiarTexto(req.body.direccion);

        if (!nombreUsuario || !correoElectronico) {
            return res.redirect('/perfil?error=El nombre de usuario y el correo son obligatorios');
        }

        if (!validarEmail(correoElectronico)) {
            return res.redirect('/perfil?error=El correo electrónico no es válido');
        }

        if (nombres.length > 100 || apellidos.length > 100 || nombreUsuario.length > 100) {
            return res.redirect('/perfil?error=Uno o más campos exceden la longitud permitida');
        }

        if (telefono.length > 20) {
            return res.redirect('/perfil?error=El teléfono no puede exceder 20 caracteres');
        }

        if (direccion.length > 255) {
            return res.redirect('/perfil?error=La dirección no puede exceder 255 caracteres');
        }

        const pool = await poolPromise;

        const duplicado = await pool.request()
            .input('IdUsuario', sql.Int, idUsuario)
            .input('NombreUsuario', sql.NVarChar, nombreUsuario)
            .input('CorreoElectronico', sql.NVarChar, correoElectronico)
            .query(`
                SELECT IdUsuario
                FROM Usuarios
                WHERE (NombreUsuario = @NombreUsuario OR CorreoElectronico = @CorreoElectronico)
                  AND IdUsuario <> @IdUsuario
            `);

        if (duplicado.recordset.length > 0) {
            return res.redirect('/perfil?error=El nombre de usuario o el correo ya están en uso');
        }

        await pool.request()
            .input('IdUsuario', sql.Int, idUsuario)
            .input('Nombres', sql.NVarChar, nombres || null)
            .input('Apellidos', sql.NVarChar, apellidos || null)
            .input('NombreUsuario', sql.NVarChar, nombreUsuario)
            .input('CorreoElectronico', sql.NVarChar, correoElectronico)
            .input('Telefono', sql.NVarChar, telefono || null)
            .input('Direccion', sql.NVarChar, direccion || null)
            .query(`
                UPDATE Usuarios
                SET
                    Nombres = @Nombres,
                    Apellidos = @Apellidos,
                    NombreUsuario = @NombreUsuario,
                    CorreoElectronico = @CorreoElectronico,
                    Telefono = @Telefono,
                    Direccion = @Direccion
                WHERE IdUsuario = @IdUsuario
            `);

        if (req.session.usuario) {
            req.session.usuario.NombreUsuario = nombreUsuario;
            req.session.usuario.CorreoElectronico = correoElectronico;
            req.session.usuario.Nombres = nombres;
            req.session.usuario.Apellidos = apellidos;
        }

        return res.redirect('/perfil?success=Perfil actualizado correctamente');
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        return res.redirect('/perfil?error=No se pudo actualizar el perfil');
    }
};

exports.cambiarPassword = async (req, res) => {
    try {
        const idUsuario = obtenerIdUsuarioSesion(req.session.usuario);

        if (!idUsuario) {
            return res.redirect('/auth/login?error=Sesión inválida');
        }

        const passwordActual = limpiarTexto(req.body.passwordActual);
        const nuevaPassword = limpiarTexto(req.body.nuevaPassword);
        const confirmarPassword = limpiarTexto(req.body.confirmarPassword);

        if (!passwordActual || !nuevaPassword || !confirmarPassword) {
            return res.redirect('/perfil?error=Todos los campos de contraseña son obligatorios');
        }

        if (nuevaPassword.length < 6) {
            return res.redirect('/perfil?error=La nueva contraseña debe tener al menos 6 caracteres');
        }

        if (nuevaPassword !== confirmarPassword) {
            return res.redirect('/perfil?error=La confirmación de contraseña no coincide');
        }

        const pool = await poolPromise;

        const resultado = await pool.request()
            .input('IdUsuario', sql.Int, idUsuario)
            .query(`
                SELECT IdUsuario, Contrasena
                FROM Usuarios
                WHERE IdUsuario = @IdUsuario
            `);

        if (resultado.recordset.length === 0) {
            return res.redirect('/perfil?error=Usuario no encontrado');
        }

        const usuario = resultado.recordset[0];

        const passwordCorrecta = await bcrypt.compare(passwordActual, usuario.Contrasena);

        if (!passwordCorrecta) {
            return res.redirect('/perfil?error=La contraseña actual es incorrecta');
        }

        const mismaPassword = await bcrypt.compare(nuevaPassword, usuario.Contrasena);

        if (mismaPassword) {
            return res.redirect('/perfil?error=La nueva contraseña no puede ser igual a la actual');
        }

        const hashNuevaPassword = await bcrypt.hash(nuevaPassword, 10);

        await pool.request()
            .input('IdUsuario', sql.Int, idUsuario)
            .input('Contrasena', sql.NVarChar, hashNuevaPassword)
            .query(`
                UPDATE Usuarios
                SET Contrasena = @Contrasena
                WHERE IdUsuario = @IdUsuario
            `);

        return res.redirect('/perfil?success=Contraseña actualizada correctamente');
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        return res.redirect('/perfil?error=No se pudo cambiar la contraseña');
    }
};

exports.actualizarFoto = async (req, res) => {
    try {
        const idUsuario = obtenerIdUsuarioSesion(req.session.usuario);

        if (!idUsuario) {
            return res.redirect('/auth/login?error=Sesión inválida');
        }

        if (!req.file) {
            return res.redirect('/perfil?error=Debes seleccionar una imagen');
        }

        const rutaFoto = `/uploads/perfiles/${req.file.filename}`;
        const pool = await poolPromise;

        await pool.request()
            .input('IdUsuario', sql.Int, idUsuario)
            .input('Foto', sql.NVarChar, rutaFoto)
            .query(`
                UPDATE Usuarios
                SET Foto = @Foto
                WHERE IdUsuario = @IdUsuario
            `);

        if (req.session.usuario) {
            req.session.usuario.Foto = rutaFoto;
        }

        return res.redirect('/perfil?success=Foto de perfil actualizada correctamente');
    } catch (error) {
        console.error('Error al actualizar foto:', error);
        return res.redirect('/perfil?error=No se pudo actualizar la foto');
    }
};