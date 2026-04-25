const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/tasks — list tasks, optionally filtered by machine_id and/or frequency
router.get('/', async (req, res) => {
  try {
    let sql = 'SELECT t.*, m.name as machine_name, m.line_id FROM maintenance_tasks t JOIN machines m ON t.machine_id = m.id WHERE t.active = TRUE';
    const params = [];

    if (req.query.machine_id) {
      sql += ' AND t.machine_id = ?';
      params.push(req.query.machine_id);
    }

    if (req.query.frequency) {
      sql += ' AND t.frequency = ?';
      params.push(req.query.frequency);
    }

    if (req.query.line_id) {
      sql += ' AND m.line_id = ?';
      params.push(req.query.line_id);
    }

    sql += ' ORDER BY t.machine_id, t.display_order, t.id';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Error obteniendo tareas' });
  }
});

// GET /api/tasks/all — all tasks including inactive (admin)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    let sql = 'SELECT t.*, m.name as machine_name, m.line_id FROM maintenance_tasks t JOIN machines m ON t.machine_id = m.id';
    const params = [];
    const conditions = [];

    if (req.query.machine_id) {
      conditions.push('t.machine_id = ?');
      params.push(req.query.machine_id);
    }
    if (req.query.line_id) {
      conditions.push('m.line_id = ?');
      params.push(req.query.line_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY t.machine_id, t.display_order, t.id';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching all tasks:', err);
    res.status(500).json({ message: 'Error obteniendo tareas' });
  }
});

// POST /api/tasks — create a new task
router.post('/', authenticateToken, async (req, res) => {
  const { machine_id, description, frequency, requires_photo, display_order } = req.body;
  if (!machine_id || !description || !frequency) {
    return res.status(400).json({ message: 'machine_id, description y frequency requeridos' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO maintenance_tasks (machine_id, description, frequency, requires_photo, display_order) VALUES (?, ?, ?, ?, ?)',
      [machine_id, description, frequency, requires_photo || false, display_order || 0]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Error creando tarea' });
  }
});

// POST /api/tasks/bulk — create multiple tasks at once
router.post('/bulk', authenticateToken, async (req, res) => {
  const { tasks } = req.body;
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ message: 'Array de tareas requerido' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const ids = [];
    for (const task of tasks) {
      const [result] = await conn.execute(
        'INSERT INTO maintenance_tasks (machine_id, description, frequency, requires_photo, display_order) VALUES (?, ?, ?, ?, ?)',
        [task.machine_id, task.description, task.frequency, task.requires_photo || false, task.display_order || 0]
      );
      ids.push(result.insertId);
    }
    await conn.commit();
    res.json({ success: true, ids });
  } catch (err) {
    await conn.rollback();
    console.error('Error creating tasks:', err);
    res.status(500).json({ message: 'Error creando tareas' });
  } finally {
    conn.release();
  }
});

// PUT /api/tasks/:id — update a task
router.put('/:id', authenticateToken, async (req, res) => {
  const { machine_id, description, frequency, requires_photo, display_order, active } = req.body;
  try {
    await pool.execute(
      'UPDATE maintenance_tasks SET machine_id = COALESCE(?, machine_id), description = COALESCE(?, description), frequency = COALESCE(?, frequency), requires_photo = COALESCE(?, requires_photo), display_order = COALESCE(?, display_order), active = COALESCE(?, active) WHERE id = ?',
      [machine_id, description, frequency, requires_photo, display_order, active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ message: 'Error actualizando tarea' });
  }
});

// DELETE /api/tasks/:id — soft-delete a task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('UPDATE maintenance_tasks SET active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'Error eliminando tarea' });
  }
});

module.exports = router;
