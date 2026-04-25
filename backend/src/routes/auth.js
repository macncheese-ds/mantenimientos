const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();

// Credential database connection pool (cached) — same as pastas
let _credPool = null;
function getCredPool() {
  if (!_credPool) {
    _credPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.CRED_DB_NAME || 'credenciales',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return _credPool;
}

// Normalizar entrada de empleado — same as deadtimes/pastas
function normalizeEmployeeInput(input) {
  let normalized = String(input).trim();
  const match = normalized.match(/^0*(\d+)([A-Za-z])?$/);
  if (match) {
    const number = match[1];
    const letter = match[2] || 'A';
    normalized = `${number}${letter}`;
  } else {
    normalized = normalized.replace(/^0+/, '') + 'A';
  }
  return normalized;
}

// POST /api/auth/login — authenticate with credenciales database
router.post('/login', async (req, res) => {
  const { employee_input, password } = req.body;
  if (!employee_input || !password) {
    return res.status(400).json({ message: 'employee_input y password requeridos' });
  }

  let conn;
  try {
    const normalized = normalizeEmployeeInput(employee_input);
    conn = await getCredPool().getConnection();

    const [rows] = await conn.execute(
      'SELECT id, nombre, usuario, num_empleado, pass_hash, rol FROM users WHERE num_empleado = ? OR usuario = ? LIMIT 1',
      [normalized, normalized]
    );
    conn.release();
    conn = null;

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];
    const hash = Buffer.isBuffer(user.pass_hash) ? user.pass_hash.toString() : user.pass_hash;
    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ message: 'Contraseña incorrecta' });

    // Roles for mantenimientos: admin can manage config, operator can do maintenance
    const adminRoles = ['The Goat', 'Ingeniero', 'Supervisor'];
    const isAdmin = adminRoles.includes(user.rol);

    const token = jwt.sign(
      {
        id: user.id,
        num_empleado: user.num_empleado,
        nombre: user.nombre,
        rol: isAdmin ? 'admin' : 'operator',
        rolOriginal: user.rol,
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        num_empleado: user.num_empleado,
        nombre: user.nombre,
        rol: isAdmin ? 'admin' : 'operator',
        rolOriginal: user.rol,
      }
    });
  } catch (err) {
    if (conn) try { conn.release(); } catch (_) { }
    console.error('Auth error:', err);
    res.status(500).json({ message: 'Error de autenticación' });
  }
});

module.exports = router;
