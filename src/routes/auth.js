const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { soloInvitados } = require('../middlewares/authMiddleware');

router.get('/login', soloInvitados, authController.mostrarLogin);
router.post('/login', soloInvitados, authController.iniciarSesion);

router.get('/register', soloInvitados, authController.mostrarRegistro);
router.post('/register', soloInvitados, authController.registrarUsuario);

router.get('/logout', authController.cerrarSesion);

module.exports = router;