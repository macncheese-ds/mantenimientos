const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/lines — list all active lines
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM `lines` WHERE active = TRUE ORDER BY display_order, id'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching lines:', err);
    res.status(500).json({ message: 'Error obteniendo líneas' });
  }
});

// GET /api/lines/all — list all lines including inactive (admin)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM `lines` ORDER BY display_order, id'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching all lines:', err);
    res.status(500).json({ message: 'Error obteniendo líneas' });
  }
});

// POST /api/lines — create a new line
router.post('/', authenticateToken, async (req, res) => {
  const { name, display_order } = req.body;
  if (!name) return res.status(400).json({ message: 'Nombre requerido' });

  try {
    const [result] = await pool.execute(
      'INSERT INTO `lines` (name, display_order) VALUES (?, ?)',
      [name, display_order || 0]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error creating line:', err);
    res.status(500).json({ message: 'Error creando línea' });
  }
});

// PUT /api/lines/:id — update a line
router.put('/:id', authenticateToken, async (req, res) => {
  const { name, display_order, active } = req.body;
  try {
    await pool.execute(
      'UPDATE `lines` SET name = COALESCE(?, name), display_order = COALESCE(?, display_order), active = COALESCE(?, active) WHERE id = ?',
      [name, display_order, active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating line:', err);
    res.status(500).json({ message: 'Error actualizando línea' });
  }
});

// DELETE /api/lines/:id — soft-delete a line
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('UPDATE `lines` SET active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting line:', err);
    res.status(500).json({ message: 'Error eliminando línea' });
  }
});

module.exports = router;
