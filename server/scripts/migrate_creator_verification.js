require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移创作者认证模块...');

db.exec(`
  CREATE TABLE IF NOT EXISTS creator_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    real_name TEXT NOT NULL,
    id_card TEXT,
    phone TEXT,
    email TEXT,
    experience_years INTEGER DEFAULT 0,
    professional_field TEXT,
    bio TEXT,
    portfolio_url TEXT,
    social_links TEXT,
    id_card_front TEXT,
    id_card_back TEXT,
    certificate TEXT,
    status TEXT DEFAULT 'pending',
    review_note TEXT,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_verifications_user ON creator_verifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_verifications_status ON creator_verifications(status);
  CREATE INDEX IF NOT EXISTS idx_verifications_created ON creator_verifications(created_at DESC);
`);

console.log('创作者认证表创建完成！');

const checkColumn = db.prepare("PRAGMA table_info(users)").all();
const hasVerifiedColumn = checkColumn.some(col => col.name === 'is_creator_verified');

if (!hasVerifiedColumn) {
  db.exec(`ALTER TABLE users ADD COLUMN is_creator_verified INTEGER DEFAULT 0`);
  db.exec(`ALTER TABLE users ADD COLUMN creator_verified_at DATETIME`);
  console.log('用户表已添加认证状态字段！');
} else {
  console.log('用户表已存在认证状态字段，跳过。');
}

console.log('创作者认证模块迁移完成！');
