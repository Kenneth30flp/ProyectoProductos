const express = require('express');
const router = express.Router();

const productosController = require('../controllers/productosController');

router.get('/', productosController.listar);

router.get('/nuevo', productosController.formNuevo);

router.post('/crear', productosController.crear);

router.get('/editar/:id', productosController.formEditar);

router.post('/editar/:id', productosController.actualizar);

router.get('/eliminar/:id', productosController.eliminar);

module.exports = router;