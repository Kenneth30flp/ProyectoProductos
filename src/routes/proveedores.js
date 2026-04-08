const express = require('express');
const router = express.Router();

const proveedoresController = require('../controllers/proveedoresController');

router.get('/', proveedoresController.listar);
router.get('/nuevo', proveedoresController.formNuevo);
router.post('/crear', proveedoresController.crear);
router.get('/editar/:id', proveedoresController.formEditar);
router.post('/editar/:id', proveedoresController.actualizar);
router.get('/eliminar/:id', proveedoresController.eliminar);

module.exports = router;