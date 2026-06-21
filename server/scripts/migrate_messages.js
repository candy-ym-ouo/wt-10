require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移消息中心...');

db.exec('PRAGMA foreign_keys = OFF');

const tableExists = (table) => {
  const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  return !!result;
};

const getColumns = (table) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.map(c => c.name);
};

if (!tableExists('messages')) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      from_user_id INTEGER,
      target_type TEXT,
      target_id INTEGER,
      title TEXT,
      content TEXT NOT NULL,
      link_url TEXT,
      extra_data TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
  console.log('已创建 messages 表');
} else {
  console.log('messages 表已存在');
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_messages_user_category ON messages(user_id, category, is_read);
  CREATE INDEX IF NOT EXISTS idx_messages_user_read ON messages(user_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);
`);

console.log('已创建 messages 表索引');

db.exec('PRAGMA foreign_keys = ON');

console.log('消息中心迁移完成！');
