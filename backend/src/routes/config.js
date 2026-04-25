const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/config — get all config values
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM config ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching config:', err);
    res.status(500).json({ message: 'Error obteniendo configuración' });
  }
});

// PUT /api/config/:key — update a config value
router.put('/:key', authenticateToken, async (req, res) => {
  const { value } = req.body;
  if (value === undefined || value === null) {
    return res.status(400).json({ message: 'value requerido' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE config SET config_value = ? WHERE config_key = ?',
      [value, req.params.key]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating config:', err);
    res.status(500).json({ message: 'Error actualizando configuración' });
  }
});

module.exports = router;
