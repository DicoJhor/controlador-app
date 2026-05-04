const express = require('express')
const router  = express.Router()
const { authMiddleware, requireRol } = require('../middleware/authMiddleware')
const {
  getClientes,
  getClienteDetalle,
  updateCliente,
  exportarExcel,
  exportarPDF,
} = require('../controllers/clientesController')

const roles = ['admin', 'superadmin', 'controlador']

// ── Exportar (deben ir ANTES de /:id para que Express no los confunda) ────────
router.get('/exportar/excel', authMiddleware, requireRol(roles), exportarExcel)
router.get('/exportar/pdf',   authMiddleware, requireRol(roles), exportarPDF)

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/',    authMiddleware, requireRol(roles), getClientes)
router.get('/:id', authMiddleware, requireRol(roles), getClienteDetalle)
router.put('/:id', authMiddleware, requireRol(roles), updateCliente)

module.exports = router