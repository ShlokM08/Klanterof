require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,   // only the DB must exist
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
});

async function initSchema() {
  const conn = await pool.getConnection();
  try {
    // Create tables (these IF NOT EXISTS clauses are fine on MySQL)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS AdminUser (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        hashed_password VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS MediaAsset (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL,
        file_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS MediaViewLog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        media_id INT NOT NULL,
        ip VARCHAR(45) NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_media FOREIGN KEY (media_id) REFERENCES MediaAsset(id) ON DELETE CASCADE
      )
    `);

    // Create index ONLY if missing (MySQL doesn't support CREATE INDEX IF NOT EXISTS)
    const [rows] = await conn.query(
      `SELECT COUNT(1) AS cnt
         FROM information_schema.statistics
        WHERE table_schema = ?
          AND table_name = 'MediaAsset'
          AND index_name = 'idx_media_type'`,
      [process.env.DB_NAME]
    );
    if (!rows[0].cnt) {
      await conn.query(`CREATE INDEX idx_media_type ON MediaAsset (type)`);
    }

    console.log('✅ DB schema ready');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initSchema };
