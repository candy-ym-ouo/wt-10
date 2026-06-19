require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移通知与订阅中心...');

db.exec('PRAGMA foreign_keys = OFF');

const tableExists = (table) => {
  const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  return !!result;
};

const getColumns = (table) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.map(c => c.name);
};

if (tableExists('notifications')) {
  const notificationColumns = getColumns('notifications');
  
  if (!notificationColumns.includes('category')) {
    db.exec(`ALTER TABLE notifications ADD COLUMN category TEXT DEFAULT 'system'`);
    console.log('已添加 category 字段到 notifications 表');
  }
  
  if (!notificationColumns.includes('link_url')) {
    db.exec(`ALTER TABLE notifications ADD COLUMN link_url TEXT`);
    console.log('已添加 link_url 字段到 notifications 表');
  }
  
  if (!notificationColumns.includes('extra_data')) {
    db.exec(`ALTER TABLE notifications ADD COLUMN extra_data TEXT`);
    console.log('已添加 extra_data 字段到 notifications 表');
  }
} else {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      category TEXT DEFAULT 'system',
      from_user_id INTEGER,
      patch_id INTEGER,
      content TEXT,
      link_url TEXT,
      extra_data TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE SET NULL
    );
  `);
  console.log('已创建 notifications 表');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
console.log('已创建 notification_subscriptions 表');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_notifications_user_category ON notifications(user_id, category, read);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON notification_subscriptions(user_id);
`);

const defaultCategories = ['comment', 'review', 'follow', 'activity', 'like', 'favorite', 'system'];
const users = db.prepare('SELECT id FROM users').all();

const insertSubscription = db.prepare(`
  INSERT OR IGNORE INTO notification_subscriptions (user_id, category, enabled)
  VALUES (?, ?, 1)
`);

users.forEach(user => {
  defaultCategories.forEach(category => {
    insertSubscription.run(user.id, category);
  });
});
console.log(`已为 ${users.length} 个用户初始化默认订阅设置`);

db.exec('PRAGMA foreign_keys = ON');

console.log('通知与订阅中心迁移完成！');
