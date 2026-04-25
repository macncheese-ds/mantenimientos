const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ── Photo upload configuration ──
const uploadDir = path.join(__dirname, '../../uploads/maintenance');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${req.params.recordId}_${req.params.taskId}_${req.params.photoType}_${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext || mime);
  }
});

// ── Cycle calculation logic ──
function getWeekNumber(startDateStr) {
  const start = new Date(startDateStr);
  const now = new Date();
  if (now < start) return 1;
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return Math.min(weekNumber, 52);
}

function getActiveFrequencies(weekNumber) {
  const frequencies = ['weekly'];
  if (weekNumber % 4 === 0) frequencies.push('monthly');
  if (weekNumber % 26 === 0) frequencies.push('semiannual');
  if (weekNumber % 52 === 0) frequencies.push('annual');
  return frequencies;
}

async function getCycleStartDate() {
  const [rows] = await pool.execute(
    "SELECT config_value FROM config WHERE config_key = 'cycle_start_date'"
  );
  return rows.length > 0 ? rows[0].config_value : '2026-01-05';
}

async function getCycleYear() {
  const [rows] = await pool.execute(
    "SELECT config_value FROM config WHERE config_key = 'cycle_year'"
  );
  return rows.length > 0 ? rows[0].config_value : '2026';
}

// ── Routes ──

// GET /api/maintenance/current-cycle
router.get('/current-cycle', async (req, res) => {
  try {
    const startDate = await getCycleStartDate();
    const year = await getCycleYear();
    const weekNumber = getWeekNumber(startDate);
    const frequencies = getActiveFrequencies(weekNumber);

    const start = new Date(startDate);
    const weekStart = new Date(start.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      data: {
        weekNumber,
        year,
        frequencies,
        cycleStartDate: startDate,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
      }
    });
  } catch (err) {
    console.error('Error getting current cycle:', err);
    res.status(500).json({ message: 'Error obteniendo ciclo actual' });
  }
});

// GET /api/maintenance/checklist/:lineId
router.get('/checklist/:lineId', async (req, res) => {
  try {
    const startDate = await getCycleStartDate();
    const year = await getCycleYear();
    const weekNumber = getWeekNumber(startDate);
    const frequencies = getActiveFrequencies(weekNumber);

    const [machines] = await pool.execute(
      'SELECT * FROM machines WHERE line_id = ? AND active = TRUE ORDER BY display_order, id',
      [req.params.lineId]
    );

    const machineIds = machines.map(m => m.id);
    if (machineIds.length === 0) {
      return res.json({ success: true, data: { weekNumber, year, frequencies, machines: [] } });
    }

    const placeholders = frequencies.map(() => '?').join(',');
    const machinePlaceholders = machineIds.map(() => '?').join(',');
    const [tasks] = await pool.execute(
      `SELECT * FROM maintenance_tasks WHERE machine_id IN (${machinePlaceholders}) AND frequency IN (${placeholders}) AND active = TRUE ORDER BY machine_id, display_order, id`,
      [...machineIds, ...frequencies]
    );

    const [existingRecords] = await pool.execute(
      'SELECT * FROM maintenance_records WHERE line_id = ? AND week_number = ? AND year = ? ORDER BY started_at DESC LIMIT 1',
      [req.params.lineId, weekNumber, year]
    );

    let completions = [];
    let photos = [];
    if (existingRecords.length > 0) {
      const recordId = existingRecords[0].id;
      const [compRows] = await pool.execute(
        'SELECT * FROM task_completions WHERE record_id = ?',
        [recordId]
      );
      completions = compRows;

      if (compRows.length > 0) {
        const compIds = compRows.map(c => c.id);
        const compPlaceholders = compIds.map(() => '?').join(',');
        const [photoRows] = await pool.execute(
          `SELECT * FROM task_photos WHERE completion_id IN (${compPlaceholders})`,
          compIds
        );
        photos = photoRows;
      }
    }

    const machinesWithTasks = machines.map(machine => ({
      ...machine,
      tasks: tasks
        .filter(t => t.machine_id === machine.id)
        .map(task => {
          const completion = completions.find(c => c.task_id === task.id);
          const taskPhotos = completion ? photos.filter(p => p.completion_id === completion.id) : [];
          return {
            ...task,
            completion: completion || null,
            photos: taskPhotos,
          };
        })
    }));

    res.json({
      success: true,
      data: {
        weekNumber,
        year,
        frequencies,
        record: existingRecords[0] || null,
        machines: machinesWithTasks,
      }
    });
  } catch (err) {
    console.error('Error getting checklist:', err);
    res.status(500).json({ message: 'Error obteniendo checklist' });
  }
});

// POST /api/maintenance/records — create/get a maintenance record for current cycle
router.post('/records', authenticateToken, async (req, res) => {
  const { line_id } = req.body;
  if (!line_id) return res.status(400).json({ message: 'line_id requerido' });

  try {
    const startDate = await getCycleStartDate();
    const year = await getCycleYear();
    const weekNumber = getWeekNumber(startDate);

    const [existing] = await pool.execute(
      'SELECT * FROM maintenance_records WHERE line_id = ? AND week_number = ? AND year = ?',
      [line_id, weekNumber, year]
    );

    if (existing.length > 0) {
      return res.json({ success: true, data: existing[0], existed: true });
    }

    const [result] = await pool.execute(
      'INSERT INTO maintenance_records (line_id, week_number, year, operator_num_empleado, operator_name) VALUES (?, ?, ?, ?, ?)',
      [line_id, weekNumber, year, req.user.num_empleado, req.user.nombre]
    );

    const [newRecord] = await pool.execute(
      'SELECT * FROM maintenance_records WHERE id = ?',
      [result.insertId]
    );

    res.json({ success: true, data: newRecord[0], existed: false });
  } catch (err) {
    console.error('Error creating record:', err);
    res.status(500).json({ message: 'Error creando registro' });
  }
});

// POST /api/maintenance/records/:recordId/tasks/:taskId/complete — toggle task completion
router.post('/records/:recordId/tasks/:taskId/complete', authenticateToken, async (req, res) => {
  const { recordId, taskId } = req.params;
  const { completed, notes } = req.body;

  try {
    const [existing] = await pool.execute(
      'SELECT * FROM task_completions WHERE record_id = ? AND task_id = ?',
      [recordId, taskId]
    );

    if (existing.length > 0) {
      await pool.execute(
        'UPDATE task_completions SET completed = ?, completed_at = ?, completed_by = ?, notes = COALESCE(?, notes) WHERE id = ?',
        [completed, completed ? new Date() : null, req.user.num_empleado, notes, existing[0].id]
      );
      res.json({ success: true, id: existing[0].id });
    } else {
      const [result] = await pool.execute(
        'INSERT INTO task_completions (record_id, task_id, completed, completed_at, completed_by, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [recordId, taskId, completed, completed ? new Date() : null, req.user.num_empleado, notes || null]
      );
      res.json({ success: true, id: result.insertId });
    }
  } catch (err) {
    console.error('Error completing task:', err);
    res.status(500).json({ message: 'Error completando tarea' });
  }
});

// POST /api/maintenance/records/:recordId/save — batch save all task completions + finalize
// This is called when user clicks "Guardar Mantenimiento" with credentials
router.post('/records/:recordId/save', authenticateToken, async (req, res) => {
  const { recordId } = req.params;
  const { completions } = req.body;
  // completions = [{ task_id, completed, notes }]

  if (!completions || !Array.isArray(completions)) {
    return res.status(400).json({ message: 'Array de completions requerido' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validate: incomplete tasks MUST have notes
    for (const comp of completions) {
      if (!comp.completed && (!comp.notes || !comp.notes.trim())) {
        await conn.rollback();
        return res.status(400).json({
          message: `La tarea ${comp.task_id} no está completada y requiere un comentario explicando por qué.`,
          task_id: comp.task_id,
        });
      }
    }

    // Upsert each completion
    for (const comp of completions) {
      const [existing] = await conn.execute(
        'SELECT id FROM task_completions WHERE record_id = ? AND task_id = ?',
        [recordId, comp.task_id]
      );

      if (existing.length > 0) {
        await conn.execute(
          'UPDATE task_completions SET completed = ?, completed_at = ?, completed_by = ?, notes = ? WHERE id = ?',
          [comp.completed, comp.completed ? new Date() : null, req.user.num_empleado, comp.notes || null, existing[0].id]
        );
      } else {
        await conn.execute(
          'INSERT INTO task_completions (record_id, task_id, completed, completed_at, completed_by, notes) VALUES (?, ?, ?, ?, ?, ?)',
          [recordId, comp.task_id, comp.completed, comp.completed ? new Date() : null, req.user.num_empleado, comp.notes || null]
        );
      }
    }

    // Check if all tasks are completed → update record status
    const [record] = await conn.execute('SELECT * FROM maintenance_records WHERE id = ?', [recordId]);
    if (record.length > 0) {
      const startDate = await getCycleStartDate();
      const weekNumber = getWeekNumber(startDate);
      const frequencies = getActiveFrequencies(weekNumber);
      const freqPlaceholders = frequencies.map(() => '?').join(',');

      const [totalTasks] = await conn.execute(
        `SELECT COUNT(*) as total FROM maintenance_tasks t JOIN machines m ON t.machine_id = m.id WHERE m.line_id = ? AND t.frequency IN (${freqPlaceholders}) AND t.active = TRUE`,
        [record[0].line_id, ...frequencies]
      );
      const [completedTasks] = await conn.execute(
        'SELECT COUNT(*) as total FROM task_completions WHERE record_id = ? AND completed = TRUE',
        [recordId]
      );

      // Count all task_completions (completed + not completed but with notes)
      const [allSubmitted] = await conn.execute(
        'SELECT COUNT(*) as total FROM task_completions WHERE record_id = ?',
        [recordId]
      );

      // All tasks submitted (even if some not completed) → mark as completed
      if (allSubmitted[0].total >= totalTasks[0].total && totalTasks[0].total > 0) {
        await conn.execute(
          'UPDATE maintenance_records SET status = "completed", completed_at = NOW() WHERE id = ?',
          [recordId]
        );
      } else {
        await conn.execute(
          'UPDATE maintenance_records SET status = "in_progress", completed_at = NULL WHERE id = ?',
          [recordId]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Mantenimiento guardado correctamente' });
  } catch (err) {
    await conn.rollback();
    console.error('Error saving maintenance:', err);
    res.status(500).json({ message: 'Error guardando mantenimiento' });
  } finally {
    conn.release();
  }
});

// POST /api/maintenance/records/:recordId/tasks/:taskId/photo/:photoType — upload photo
router.post('/records/:recordId/tasks/:taskId/photo/:photoType', authenticateToken, upload.single('photo'), async (req, res) => {
  const { recordId, taskId, photoType } = req.params;

  if (!['before', 'after'].includes(photoType)) {
    return res.status(400).json({ message: 'photoType debe ser "before" o "after"' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Archivo requerido' });
  }

  try {
    let [existing] = await pool.execute(
      'SELECT * FROM task_completions WHERE record_id = ? AND task_id = ?',
      [recordId, taskId]
    );

    let completionId;
    if (existing.length === 0) {
      const [result] = await pool.execute(
        'INSERT INTO task_completions (record_id, task_id, completed, completed_by) VALUES (?, ?, FALSE, ?)',
        [recordId, taskId, req.user.num_empleado]
      );
      completionId = result.insertId;
    } else {
      completionId = existing[0].id;
    }

    // Delete existing photo of same type if exists
    const [existingPhotos] = await pool.execute(
      'SELECT * FROM task_photos WHERE completion_id = ? AND photo_type = ?',
      [completionId, photoType]
    );
    for (const photo of existingPhotos) {
      const oldPath = path.join(uploadDir, path.basename(photo.file_path));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      await pool.execute('DELETE FROM task_photos WHERE id = ?', [photo.id]);
    }

    const filePath = `/uploads/maintenance/${req.file.filename}`;
    const [result] = await pool.execute(
      'INSERT INTO task_photos (completion_id, photo_type, file_path, original_name, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [completionId, photoType, filePath, req.file.originalname, req.user.num_empleado]
    );

    res.json({
      success: true,
      data: {
        id: result.insertId,
        completion_id: completionId,
        photo_type: photoType,
        file_path: filePath,
        original_name: req.file.originalname,
      }
    });
  } catch (err) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ message: 'Error subiendo foto' });
  }
});

// GET /api/maintenance/records — list historical records
router.get('/records', async (req, res) => {
  try {
    let sql = `
      SELECT mr.*, l.name as line_name,
        (SELECT COUNT(*) FROM task_completions tc WHERE tc.record_id = mr.id AND tc.completed = TRUE) as completed_tasks
      FROM maintenance_records mr
      JOIN \`lines\` l ON mr.line_id = l.id
    `;
    const conditions = [];
    const params = [];

    if (req.query.line_id) {
      conditions.push('mr.line_id = ?');
      params.push(req.query.line_id);
    }
    if (req.query.year) {
      conditions.push('mr.year = ?');
      params.push(req.query.year);
    }
    if (req.query.week_number) {
      conditions.push('mr.week_number = ?');
      params.push(req.query.week_number);
    }
    if (req.query.status) {
      conditions.push('mr.status = ?');
      params.push(req.query.status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY mr.year DESC, mr.week_number DESC, mr.line_id';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching records:', err);
    res.status(500).json({ message: 'Error obteniendo registros' });
  }
});

// GET /api/maintenance/records/:id — get full record detail
router.get('/records/:id', async (req, res) => {
  try {
    const [records] = await pool.execute(
      `SELECT mr.*, l.name as line_name FROM maintenance_records mr JOIN \`lines\` l ON mr.line_id = l.id WHERE mr.id = ?`,
      [req.params.id]
    );

    if (records.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    const record = records[0];

    const [completions] = await pool.execute(
      `SELECT tc.*, mt.description as task_description, mt.frequency, mt.requires_photo, m.name as machine_name, m.id as machine_id
       FROM task_completions tc
       JOIN maintenance_tasks mt ON tc.task_id = mt.id
       JOIN machines m ON mt.machine_id = m.id
       WHERE tc.record_id = ?
       ORDER BY m.display_order, mt.display_order`,
      [req.params.id]
    );

    const compIds = completions.map(c => c.id);
    let photos = [];
    if (compIds.length > 0) {
      const placeholders = compIds.map(() => '?').join(',');
      const [photoRows] = await pool.execute(
        `SELECT * FROM task_photos WHERE completion_id IN (${placeholders})`,
        compIds
      );
      photos = photoRows;
    }

    const completionsWithPhotos = completions.map(c => ({
      ...c,
      photos: photos.filter(p => p.completion_id === c.id),
    }));

    res.json({
      success: true,
      data: {
        ...record,
        completions: completionsWithPhotos,
      }
    });
  } catch (err) {
    console.error('Error fetching record detail:', err);
    res.status(500).json({ message: 'Error obteniendo detalle de registro' });
  }
});

// PUT /api/maintenance/records/:id/complete — manually complete a record
router.put('/records/:id/complete', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE maintenance_records SET status = "completed", completed_at = NOW() WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error completing record:', err);
    res.status(500).json({ message: 'Error completando registro' });
  }
});

module.exports = router;
