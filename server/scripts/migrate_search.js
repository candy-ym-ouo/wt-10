require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移搜索中心...');

db.exec('PRAGMA foreign_keys = OFF');

db.exec(`
  CREATE TABLE IF NOT EXISTS search_hot_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    search_count INTEGER DEFAULT 1,
    is_pinned INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(keyword)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS search_ad_placements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT NOT NULL,
    link_type TEXT DEFAULT 'internal',
    position TEXT DEFAULT 'search_top',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    start_time DATETIME,
    end_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS search_histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    keyword TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_hot_queries_active ON search_hot_queries(is_active, is_pinned, search_count DESC);
  CREATE INDEX IF NOT EXISTS idx_ad_placements_active ON search_ad_placements(is_active, position, sort_order);
  CREATE INDEX IF NOT EXISTS idx_search_histories_user ON search_histories(user_id, created_at DESC);
`);

db.exec('PRAGMA foreign_keys = ON');

console.log('搜索中心迁移完成！');
