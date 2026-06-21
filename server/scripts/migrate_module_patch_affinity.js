require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移模块-Patch 关联推荐系统...');

db.exec(`
  CREATE TABLE IF NOT EXISTS module_patch_affinity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    patch_id INTEGER NOT NULL,
    affinity_score REAL DEFAULT 0,
    shared_module_count INTEGER DEFAULT 0,
    combination_weight REAL DEFAULT 0,
    last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id, patch_id),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_mpa_module ON module_patch_affinity(module_id, affinity_score DESC);
  CREATE INDEX IF NOT EXISTS idx_mpa_patch ON module_patch_affinity(patch_id);
  CREATE INDEX IF NOT EXISTS idx_mpa_score ON module_patch_affinity(affinity_score DESC);

  CREATE TABLE IF NOT EXISTS patch_similarity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patch_id INTEGER NOT NULL,
    similar_patch_id INTEGER NOT NULL,
    similarity_score REAL DEFAULT 0,
    shared_modules TEXT,
    shared_count INTEGER DEFAULT 0,
    last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(patch_id, similar_patch_id),
    FOREIGN KEY (patch_id) REFERENCES patches(id) ON DELETE CASCADE,
    FOREIGN KEY (similar_patch_id) REFERENCES patches(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_ps_patch ON patch_similarity(patch_id, similarity_score DESC);
  CREATE INDEX IF NOT EXISTS idx_ps_similar ON patch_similarity(similar_patch_id);
`);

console.log('数据库表创建完成！');

function calculateModulePatchAffinity() {
  const patches = db.prepare(`
    SELECT id, modules_used, likes_count
    FROM patches
    WHERE status = 'approved' AND is_public = 1 AND modules_used IS NOT NULL
  `).all();

  console.log(`找到 ${patches.length} 个已发布的 Patch`);

  const insertStmt = db.prepare(`
    INSERT INTO module_patch_affinity (module_id, patch_id, affinity_score, shared_module_count, combination_weight, last_calculated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(module_id, patch_id) DO UPDATE SET
      affinity_score = excluded.affinity_score,
      shared_module_count = excluded.shared_module_count,
      combination_weight = excluded.combination_weight,
      last_calculated_at = CURRENT_TIMESTAMP
  `);

  const batch = [];
  const batchSize = 100;

  const runBatch = db.transaction((items) => {
    items.forEach(item => insertStmt.run(...item));
  });

  patches.forEach(patch => {
    let moduleIds = [];
    try {
      moduleIds = JSON.parse(patch.modules_used) || [];
    } catch (e) {
      return;
    }
    if (!Array.isArray(moduleIds) || moduleIds.length === 0) return;

    const uniqueIds = [...new Set(moduleIds)];

    uniqueIds.forEach(mid => {
      const comboStats = db.prepare(`
        SELECT COALESCE(SUM(confidence_score), 0) as total_confidence,
               COUNT(*) as combo_count
        FROM module_combination_stats
        WHERE module_id = ?
      `).get(mid);

      const affinityScore = (comboStats.combo_count || 0) * 0.3 +
        (comboStats.total_confidence || 0) * 0.4 +
        uniqueIds.length * 0.1 +
        (patch.likes_count || 0) * 0.002;

      const combinationWeight = (comboStats.total_confidence || 0) * (comboStats.combo_count || 0);

      batch.push([mid, patch.id, parseFloat(affinityScore.toFixed(4)), uniqueIds.length, parseFloat(combinationWeight.toFixed(4))]);

      if (batch.length >= batchSize) {
        runBatch(batch);
        batch.length = 0;
      }
    });
  });

  if (batch.length > 0) {
    runBatch(batch);
  }

  console.log('模块-Patch 关联评分计算完成！');
}

function calculatePatchSimilarity() {
  const patches = db.prepare(`
    SELECT id, modules_used, likes_count
    FROM patches
    WHERE status = 'approved' AND is_public = 1 AND modules_used IS NOT NULL
  `).all();

  console.log(`计算 Patch 相似度，共 ${patches.length} 个 Patch...`);

  const patchModules = new Map();
  patches.forEach(patch => {
    try {
      const ids = JSON.parse(patch.modules_used) || [];
      if (Array.isArray(ids) && ids.length > 0) {
        patchModules.set(patch.id, { modules: [...new Set(ids)], likes: patch.likes_count || 0 });
      }
    } catch (e) {}
  });

  const insertStmt = db.prepare(`
    INSERT INTO patch_similarity (patch_id, similar_patch_id, similarity_score, shared_modules, shared_count, last_calculated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(patch_id, similar_patch_id) DO UPDATE SET
      similarity_score = excluded.similarity_score,
      shared_modules = excluded.shared_modules,
      shared_count = excluded.shared_count,
      last_calculated_at = CURRENT_TIMESTAMP
  `);

  const batch = [];
  const batchSize = 100;
  const runBatch = db.transaction((items) => {
    items.forEach(item => insertStmt.run(...item));
  });

  const patchIds = [...patchModules.keys()];

  for (let i = 0; i < patchIds.length; i++) {
    const idA = patchIds[i];
    const dataA = patchModules.get(idA);
    const setA = new Set(dataA.modules);

    for (let j = i + 1; j < patchIds.length; j++) {
      const idB = patchIds[j];
      const dataB = patchModules.get(idB);

      const shared = dataA.modules.filter(m => setA.has(m));
      if (shared.length === 0) continue;

      const unionSize = new Set([...dataA.modules, ...dataB.modules]).size;
      const jaccard = shared.length / unionSize;
      const overlapRatio = shared.length / Math.min(dataA.modules.length, dataB.modules.length);
      const likesBoost = Math.min((dataA.likes + dataB.likes) / 100, 1) * 0.1;
      const similarityScore = jaccard * 0.5 + overlapRatio * 0.4 + likesBoost;

      batch.push([idA, idB, parseFloat(similarityScore.toFixed(4)), JSON.stringify(shared), shared.length]);
      batch.push([idB, idA, parseFloat(similarityScore.toFixed(4)), JSON.stringify(shared), shared.length]);

      if (batch.length >= batchSize) {
        runBatch(batch);
        batch.length = 0;
      }
    }
  }

  if (batch.length > 0) {
    runBatch(batch);
  }

  console.log('Patch 相似度计算完成！');
}

try {
  calculateModulePatchAffinity();
  calculatePatchSimilarity();
} catch (e) {
  console.error('计算出错:', e.message);
}

const newConfigs = [
  { key: 'max_similar_patches', value: '8' },
  { key: 'min_similarity_score', value: '0.1' },
  { key: 'affinity_weight_combination', value: '0.4' },
  { key: 'affinity_weight_shared', value: '0.3' },
  { key: 'affinity_weight_likes', value: '0.3' }
];

const insertConfig = db.prepare(`
  INSERT OR IGNORE INTO module_recommendation_config (key, value)
  VALUES (?, ?)
`);

newConfigs.forEach(cfg => {
  insertConfig.run(cfg.key, cfg.value);
});

console.log('新配置项添加完成！');
console.log('\n迁移完成！');
