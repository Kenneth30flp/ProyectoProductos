function verificarSesion(req, res, next) {
    if (req.session && req.session.usuario) {
        return next();
    }

    return res.redirect('/auth/login?error=Debes iniciar sesión para continuar');
}

function soloInvitados(req, res, next) {
    if (req.session && req.session.usuario) {
        return res.redirect('/');
    }

    next();
}

module.exports = {
    verificarSesion,
    soloInvitados
};