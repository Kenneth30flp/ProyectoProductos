const express = require('express');
const router = express.Router();
const distribucionController = require('../controllers/distribucionController');

router.get('/', distribucionController.listar);
router.post('/crear', distribucionController.crear);

router.get('/editar/:idProducto/:idProveedor', distribucionController.formEditar);
router.post('/editar/:idProducto/:idProveedor', distribucionController.actualizar);

router.get('/eliminar/:idProducto/:idProveedor', distribucionController.eliminar);

module.exports = router;