require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移：Patch 访问来源统计与热度趋势...');

db.exec(`
  CREATE TABLE IF NOT EXISTS patch_view_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patch_id INTEGER NOT NULL,
    user_id INTEGER,
    source TEXT DEFAULT 'direct',
    referer TEXT,
    ip TEXT,
    user_agent TEXT,
    session_id TEXT,
    view_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_view_logs_patch ON patch_view_logs(patch_id);
  CREATE INDEX IF NOT EXISTS idx_view_logs_user ON patch_view_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_view_logs_date ON patch_view_logs(view_date);
  CREATE INDEX IF NOT EXISTS idx_view_logs_source ON patch_view_logs(source);
  CREATE INDEX IF NOT EXISTS idx_view_logs_patch_date ON patch_view_logs(patch_id, view_date);

  CREATE TABLE IF NOT EXISTS patch_view_daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patch_id INTEGER NOT NULL,
    view_date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    source TEXT DEFAULT 'all',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(patch_id, view_date, source),
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_daily_stats_patch ON patch_view_daily_stats(patch_id);
  CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON patch_view_daily_stats(view_date);
  CREATE INDEX IF NOT EXISTS idx_daily_stats_source ON patch_view_daily_stats(source);
`);

console.log('Patch 访问统计相关表创建完成！');

const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='patch_view_logs'").get();
if (existingTables) {
  console.log('验证：patch_view_logs 表已存在');
}
const existingStatsTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='patch_view_daily_stats'").get();
if (existingStatsTables) {
  console.log('验证：patch_view_daily_stats 表已存在');
}

console.log('迁移完成！');
