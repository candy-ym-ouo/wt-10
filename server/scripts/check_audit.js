const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../data/patch_vault.db');
console.log('DB Path:', dbPath);
const db = new Database(dbPath);
const rows = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 10').all();
console.log('审计日志记录数:', rows.length);
if (rows.length > 0) {
  rows.forEach(r => {
    const data = {
      id: r.id,
      user_id: r.user_id,
      username: r.username,
      role: r.role,
      action: r.action,
      target_type: r.target_type,
      target_id: r.target_id,
      target_name: r.target_name,
      status_code: r.status_code,
      ip_address: r.ip_address,
      created_at: r.created_at
    };
    console.log(JSON.stringify(data, null, 2));
  });
} else {
  console.log('警告：审计日志表存在但没有记录！');
  console.log('尝试直接查询所有表：');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('存在的表:', tables.map(t => t.name));
}
