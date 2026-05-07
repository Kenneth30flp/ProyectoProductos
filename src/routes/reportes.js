const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');

router.post('/pdf', reportesController.exportarPDF);
router.get('/', reportesController.index);

module.exports = router;