const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/machines — list machines, optionally filtered by line
router.get('/', async (req, res) => {
  try {
    let sql = 'SELECT m.*, l.name as line_name FROM machines m JOIN `lines` l ON m.line_id = l.id WHERE m.active = TRUE';
    const params = [];

    if (req.query.line_id) {
      sql += ' AND m.line_id = ?';
      params.push(req.query.line_id);
    }

    sql += ' ORDER BY m.line_id, m.display_order, m.id';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching machines:', err);
    res.status(500).json({ message: 'Error obteniendo máquinas' });
  }
});

// GET /api/machines/all — list all machines including inactive (admin)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    let sql = 'SELECT m.*, l.name as line_name FROM machines m JOIN `lines` l ON m.line_id = l.id';
    const params = [];

    if (req.query.line_id) {
      sql += ' WHERE m.line_id = ?';
      params.push(req.query.line_id);
    }

    sql += ' ORDER BY m.line_id, m.display_order, m.id';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching all machines:', err);
    res.status(500).json({ message: 'Error obteniendo máquinas' });
  }
});

// POST /api/machines — create a new machine
router.post('/', authenticateToken, async (req, res) => {
  const { line_id, name, display_order } = req.body;
  if (!line_id || !name) return res.status(400).json({ message: 'line_id y nombre requeridos' });

  try {
    const [result] = await pool.execute(
      'INSERT INTO machines (line_id, name, display_order) VALUES (?, ?, ?)',
      [line_id, name, display_order || 0]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error creating machine:', err);
    res.status(500).json({ message: 'Error creando máquina' });
  }
});

// PUT /api/machines/:id — update a machine
router.put('/:id', authenticateToken, async (req, res) => {
  const { line_id, name, display_order, active } = req.body;
  try {
    await pool.execute(
      'UPDATE machines SET line_id = COALESCE(?, line_id), name = COALESCE(?, name), display_order = COALESCE(?, display_order), active = COALESCE(?, active) WHERE id = ?',
      [line_id, name, display_order, active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating machine:', err);
    res.status(500).json({ message: 'Error actualizando máquina' });
  }
});

// DELETE /api/machines/:id — soft-delete a machine
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('UPDATE machines SET active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting machine:', err);
    res.status(500).json({ message: 'Error eliminando máquina' });
  }
});

module.exports = router;
