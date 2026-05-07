const express = require('express');
const router = express.Router();
const distribucionController = require('../controllers/distribucionController');

router.get('/', distribucionController.listar);
router.post('/crear', distribucionController.crear);

router.get('/editar/:id', distribucionController.formEditar);
router.post('/editar/:id', distribucionController.actualizar);

router.get('/eliminar/:id', distribucionController.eliminar);

module.exports = router;