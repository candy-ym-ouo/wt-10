const db = require('./src/db');

console.log('=== Patch 模块数据 ===');
const patches = db.prepare('SELECT id, modules_used, likes_count FROM patches WHERE status=\'approved\' AND is_public=1 ORDER BY id').all();
patches.forEach(p => console.log(`Patch ${p.id}: modules=${p.modules_used}, likes=${p.likes_count}`));

console.log('\n=== Patch 相似度 (patch_id=3) ===');
const sim = db.prepare('SELECT patch_id, similar_patch_id, similarity_score, shared_count, shared_modules FROM patch_similarity WHERE patch_id = 3 ORDER BY shared_count DESC, similarity_score DESC LIMIT 5').all();
sim.forEach(s => console.log(`  -> Patch ${s.similar_patch_id}: shared=${s.shared_count}, score=${s.similarity_score}, modules=${s.shared_modules}`));

console.log('\n=== 测试1: getPatches 模块筛选精确匹配 (modules=10) ===');
const m10 = db.prepare(`SELECT id, modules_used FROM patches WHERE EXISTS (SELECT 1 FROM json_each(modules_used) WHERE value = 10) AND status='approved' AND is_public=1`).all();
m10.forEach(p => console.log(`  Patch ${p.id}: ${p.modules_used}`));

console.log('\n=== 测试2: getPatches 模块筛选精确匹配 (modules=1) ===');
const m1 = db.prepare(`SELECT id, modules_used FROM patches WHERE EXISTS (SELECT 1 FROM json_each(modules_used) WHERE value = 1) AND status='approved' AND is_public=1`).all();
m1.forEach(p => console.log(`  Patch ${p.id}: ${p.modules_used}`));

console.log('\n=== 测试3: 推荐排序 modules=1,2 ===');
const rec = db.prepare(`
  SELECT p.id, p.modules_used, COUNT(DISTINCT mpa.module_id) as match_count, COALESCE(SUM(mpa.affinity_score), 0) as total_affinity
  FROM patches p
  LEFT JOIN module_patch_affinity mpa ON mpa.patch_id = p.id AND mpa.module_id IN (1, 2)
  WHERE p.status='approved' AND p.is_public=1
    AND EXISTS (SELECT 1 FROM json_each(p.modules_used) WHERE value = 1)
    AND EXISTS (SELECT 1 FROM json_each(p.modules_used) WHERE value = 2)
  GROUP BY p.id
  ORDER BY COUNT(DISTINCT mpa.module_id) DESC, COALESCE(SUM(mpa.affinity_score), 0) DESC, p.likes_count DESC
  LIMIT 10
`).all();
rec.forEach((p, i) => console.log(`  ${i+1}. Patch ${p.id}: match=${p.match_count}, affinity=${p.total_affinity.toFixed(4)}, modules=${p.modules_used}`));
