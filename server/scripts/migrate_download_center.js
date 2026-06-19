require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移下载资源中心数据库...');

db.exec('PRAGMA foreign_keys = OFF');

db.exec(`
  CREATE TABLE IF NOT EXISTS download_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    file_type TEXT,
    resource_type TEXT DEFAULT 'other',
    patch_id INTEGER,
    version TEXT DEFAULT '1.0.0',
    user_id INTEGER NOT NULL,
    access_level TEXT DEFAULT 'public',
    risk_level TEXT DEFAULT 'low',
    risk_description TEXT,
    status TEXT DEFAULT 'pending',
    review_note TEXT,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    download_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_resources_status ON download_resources(status);
  CREATE INDEX IF NOT EXISTS idx_resources_user ON download_resources(user_id);
  CREATE INDEX IF NOT EXISTS idx_resources_type ON download_resources(resource_type);
  CREATE INDEX IF NOT EXISTS idx_resources_patch ON download_resources(patch_id);
  CREATE INDEX IF NOT EXISTS idx_resources_created ON download_resources(created_at DESC);

  CREATE TABLE IF NOT EXISTS download_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    user_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES download_resources(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_records_resource ON download_records(resource_id);
  CREATE INDEX IF NOT EXISTS idx_records_user ON download_records(user_id);
  CREATE INDEX IF NOT EXISTS idx_records_downloaded ON download_records(downloaded_at DESC);
`);

db.exec('PRAGMA foreign_keys = ON');

console.log('下载资源中心数据库迁移完成！');
