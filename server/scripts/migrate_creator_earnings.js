require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移创作者收益模块...');

db.exec('PRAGMA foreign_keys = OFF');

const getColumns = (table) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.map(c => c.name);
};

const tableExists = (table) => {
  const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  return !!result;
};

const patchColumns = getColumns('patches');

if (!patchColumns.includes('is_paid')) {
  db.exec(`ALTER TABLE patches ADD COLUMN is_paid INTEGER DEFAULT 0`);
  console.log('已添加 patches.is_paid 字段');
}

if (!patchColumns.includes('price')) {
  db.exec(`ALTER TABLE patches ADD COLUMN price REAL DEFAULT 0`);
  console.log('已添加 patches.price 字段');
}

if (!patchColumns.includes('preview_content')) {
  db.exec(`ALTER TABLE patches ADD COLUMN preview_content TEXT`);
  console.log('已添加 patches.preview_content 字段');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS patch_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patch_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0,
    original_price REAL,
    currency TEXT DEFAULT 'CNY',
    is_active INTEGER DEFAULT 1,
    is_discount INTEGER DEFAULT 0,
    discount_start_date DATETIME,
    discount_end_date DATETIME,
    sales_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE,
    UNIQUE(patch_id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    product_id INTEGER,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'CNY',
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    transaction_id TEXT,
    paid_at DATETIME,
    refunded_at DATETIME,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES patch_products(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS patch_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    order_id INTEGER,
    permission_type TEXT DEFAULT 'purchase',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    UNIQUE(user_id, patch_id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS creator_earnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    platform_fee REAL DEFAULT 0,
    net_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    settled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS creator_withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_account TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    review_note TEXT,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    transferred_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_patch ON patch_products(patch_id);
  CREATE INDEX IF NOT EXISTS idx_products_active ON patch_products(is_active);
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_patch ON orders(patch_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_no ON orders(order_no);
  CREATE INDEX IF NOT EXISTS idx_permissions_user ON patch_permissions(user_id);
  CREATE INDEX IF NOT EXISTS idx_permissions_patch ON patch_permissions(patch_id);
  CREATE INDEX IF NOT EXISTS idx_earnings_creator ON creator_earnings(creator_id);
  CREATE INDEX IF NOT EXISTS idx_earnings_order ON creator_earnings(order_id);
  CREATE INDEX IF NOT EXISTS idx_earnings_status ON creator_earnings(status);
  CREATE INDEX IF NOT EXISTS idx_withdrawals_creator ON creator_withdrawals(creator_id);
  CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON creator_withdrawals(status);
`);

console.log('数据库表创建完成');

const allPatches = db.prepare('SELECT id FROM patches WHERE is_paid = 1').all();
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO patch_products (patch_id, name, price, is_active)
  VALUES (?, ?, ?, 1)
`);

allPatches.forEach(patch => {
  const patchData = db.prepare('SELECT title, price FROM patches WHERE id = ?').get(patch.id);
  if (patchData) {
    insertProduct.run(patch.id, patchData.title, patchData.price || 0);
  }
});

console.log(`已迁移 ${allPatches.length} 个付费 Patch 商品`);

db.exec('PRAGMA foreign_keys = ON');

console.log('创作者收益模块数据库迁移完成！');
