require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移用户隐私设置...');

const getColumns = (table) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.map(c => c.name);
};

const userColumns = getColumns('users');

const addColumnIfNotExists = (table, column, definition) => {
  if (!userColumns.includes(column)) {
    console.log(`添加字段 ${column}...`);
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  } else {
    console.log(`字段 ${column} 已存在，跳过`);
  }
};

addColumnIfNotExists('users', 'privacy_email', "TEXT DEFAULT 'public'");
addColumnIfNotExists('users', 'privacy_favorites', "TEXT DEFAULT 'public'");
addColumnIfNotExists('users', 'privacy_patches', "TEXT DEFAULT 'public'");

console.log('用户隐私设置迁移完成！');
