const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const perfilController = require('../controllers/perfilController');
const { verificarSesion } = require('../middlewares/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/perfiles'));
    },
    filename: (req, file, cb) => {
        const nombreUnico = `perfil-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, nombreUnico);
    }
});

const fileFilter = (req, file, cb) => {
    const extensionesValidas = ['.jpg', '.jpeg', '.png', '.webp'];
    const extension = path.extname(file.originalname).toLowerCase();

    if (extensionesValidas.includes(extension)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes JPG, JPEG, PNG o WEBP'));
    }
};

const upload = multer({ storage, fileFilter });

router.get('/', verificarSesion, perfilController.mostrarPerfil);
router.post('/actualizar', verificarSesion, perfilController.actualizarPerfil);
router.post('/password', verificarSesion, perfilController.cambiarPassword);
router.post('/foto', verificarSesion, upload.single('foto'), perfilController.actualizarFoto);

module.exports = router;