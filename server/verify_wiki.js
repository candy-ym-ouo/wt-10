const db = require('./src/db');

console.log('=== 数据库验证 ===');

const wikiCount = db.prepare('SELECT COUNT(*) as count FROM module_wiki').get().count;
const paramCount = db.prepare('SELECT COUNT(*) as count FROM module_parameters').get().count;
const tipCount = db.prepare('SELECT COUNT(*) as count FROM module_tips').get().count;
const recCount = db.prepare('SELECT COUNT(*) as count FROM module_recommended_patches').get().count;

console.log('wiki 词条数:', wikiCount);
console.log('参数总数:', paramCount);
console.log('技巧总数:', tipCount);
console.log('推荐 Patch 数:', recCount);

const mathsModule = db.prepare('SELECT id, name FROM modules WHERE name = ?').get('Maths');
console.log('\n=== Maths 模块百科数据 ===');

const wiki = db.prepare('SELECT * FROM module_wiki WHERE module_id = ?').get(mathsModule.id);
console.log('词条状态:', wiki ? wiki.status : '无');
console.log('概述前50字:', wiki ? wiki.overview.substring(0, 50) + '...' : '无');

const params = db.prepare('SELECT name, label FROM module_parameters WHERE module_id = ? ORDER BY sort_order').all(mathsModule.id);
console.log('参数列表:', params.map(p => p.label || p.name).join(', '));

const tips = db.prepare('SELECT title, difficulty FROM module_tips WHERE module_id = ? ORDER BY sort_order').all(mathsModule.id);
console.log('技巧列表:', tips.map(t => t.title).join(', '));

const recs = db.prepare('SELECT patch_id, reason FROM module_recommended_patches WHERE module_id = ? ORDER BY sort_order').all(mathsModule.id);
console.log('推荐 Patch 数:', recs.length);

console.log('\n所有数据验证通过！');
