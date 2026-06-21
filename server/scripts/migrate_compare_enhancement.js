require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移 Patch 对比功能增强...');

db.exec('PRAGMA foreign_keys = OFF');

const tableExists = (table) => {
  const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  return !!result;
};

if (!tableExists('compare_schemes')) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS compare_schemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      patch_ids TEXT NOT NULL,
      share_token TEXT UNIQUE,
      is_public INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  console.log('已创建 compare_schemes 表');
}

if (!tableExists('compare_history')) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS compare_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      patch_ids TEXT NOT NULL,
      patch_titles TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  console.log('已创建 compare_history 表');
}

const getColumns = (table) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.map(c => c.name);
};

const compareListColumns = getColumns('compare_lists');
if (!compareListColumns.includes('is_current')) {
  db.exec(`ALTER TABLE compare_lists ADD COLUMN is_current INTEGER DEFAULT 1`);
  console.log('已为 compare_lists 添加 is_current 列');
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_compare_schemes_user ON compare_schemes(user_id);
  CREATE INDEX IF NOT EXISTS idx_compare_schemes_share ON compare_schemes(share_token);
  CREATE INDEX IF NOT EXISTS idx_compare_history_user ON compare_history(user_id, created_at DESC);
`);

db.exec('PRAGMA foreign_keys = ON');

console.log('Patch 对比功能增强迁移完成！');
