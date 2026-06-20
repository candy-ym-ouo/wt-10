require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移补丁实验室...');

db.exec(`
  CREATE TABLE IF NOT EXISTS patch_lab_experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'draft',
    patch_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS patch_lab_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    parameters TEXT DEFAULT '{}',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (experiment_id) REFERENCES patch_lab_experiments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS patch_lab_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id INTEGER NOT NULL,
    preferred_snapshot_id INTEGER,
    result_notes TEXT DEFAULT '',
    rating INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (experiment_id) REFERENCES patch_lab_experiments(id) ON DELETE CASCADE,
    FOREIGN KEY (preferred_snapshot_id) REFERENCES patch_lab_snapshots(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_lab_exp_user ON patch_lab_experiments(user_id);
  CREATE INDEX IF NOT EXISTS idx_lab_exp_status ON patch_lab_experiments(status);
  CREATE INDEX IF NOT EXISTS idx_lab_snap_exp ON patch_lab_snapshots(experiment_id);
  CREATE INDEX IF NOT EXISTS idx_lab_result_exp ON patch_lab_results(experiment_id);
`);

console.log('补丁实验室迁移完成！');
process.exit(0);
