const express = require('express');
const router = express.Router();

const salidasController = require('../controllers/salidasController');

// Listado
router.get('/', salidasController.listar);

// Formulario nueva salida
router.get('/nueva', salidasController.formularioNueva);

// Guardar salida
router.post('/nueva', salidasController.registrar);

module.exports = router;