require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移举报中心数据库...');

db.exec('PRAGMA foreign_keys = OFF');

db.exec(`
  CREATE TABLE IF NOT EXISTS content_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    target_user_id INTEGER,
    category TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    evidence_urls TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    handler_id INTEGER,
    handle_result TEXT,
    handle_note TEXT,
    handled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (handler_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS report_punishments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    target_user_id INTEGER,
    punishment_type TEXT NOT NULL,
    punishment_duration INTEGER,
    punishment_reason TEXT,
    starts_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ends_at DATETIME,
    is_permanent INTEGER DEFAULT 0,
    handler_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES content_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (handler_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reports_status ON content_reports(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_target ON content_reports(target_type, target_id);
  CREATE INDEX IF NOT EXISTS idx_reports_reporter ON content_reports(reporter_id);
  CREATE INDEX IF NOT EXISTS idx_reports_target_user ON content_reports(target_user_id);
  CREATE INDEX IF NOT EXISTS idx_punishments_user ON report_punishments(target_user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_punishments_target ON report_punishments(target_type, target_id);
`);

db.exec('PRAGMA foreign_keys = ON');

console.log('举报中心数据库迁移完成！');
