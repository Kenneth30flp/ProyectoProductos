const express = require('express');
const router = express.Router();

const salidasController = require('../controllers/salidasController');

router.get('/', salidasController.listar);
router.get('/nueva', salidasController.formularioNueva);
router.post('/nueva', salidasController.registrar);

router.get('/buscar-cliente/:nit', salidasController.buscarClientePorNit);
// CRUD Clientes JSON
router.get('/clientes', salidasController.listarClientes);
router.post('/clientes', salidasController.crearCliente);
router.post('/clientes/:id/editar', salidasController.editarCliente);
router.post('/clientes/:id/eliminar', salidasController.eliminarCliente);

// Validar NIT en vivo
router.get('/clientes/validar-nit/:nit', salidasController.validarNitCliente);

module.exports = router;