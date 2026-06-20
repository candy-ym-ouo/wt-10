require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移模块组合推荐系统...');

db.exec(`
  CREATE TABLE IF NOT EXISTS module_combination_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    paired_module_id INTEGER NOT NULL,
    co_occurrence_count INTEGER DEFAULT 0,
    avg_patch_likes REAL DEFAULT 0,
    confidence_score REAL DEFAULT 0,
    last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id, paired_module_id),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (paired_module_id) REFERENCES modules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS module_recommended_combinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id INTEGER NOT NULL,
    paired_module_id INTEGER NOT NULL,
    reason TEXT,
    sort_order INTEGER DEFAULT 0,
    is_manual INTEGER DEFAULT 0,
    weight INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id, paired_module_id),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (paired_module_id) REFERENCES modules(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS module_recommendation_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_combos_module ON module_combination_stats(module_id);
  CREATE INDEX IF NOT EXISTS idx_combos_paired ON module_combination_stats(paired_module_id);
  CREATE INDEX IF NOT EXISTS idx_combos_score ON module_combination_stats(confidence_score DESC);
  CREATE INDEX IF NOT EXISTS idx_rec_combos_module ON module_recommended_combinations(module_id, sort_order);
`);

const defaultConfigs = [
  { key: 'min_co_occurrence', value: '2' },
  { key: 'max_recommendations_per_module', value: '8' },
  { key: 'confidence_threshold', value: '0.1' },
  { key: 'auto_calculate_enabled', value: '1' }
];

const insertConfig = db.prepare(`
  INSERT OR IGNORE INTO module_recommendation_config (key, value)
  VALUES (?, ?)
`);

defaultConfigs.forEach(cfg => {
  insertConfig.run(cfg.key, cfg.value);
});

console.log('数据库表和默认配置创建完成！');
console.log('开始计算现有 Patch 的模块组合统计...');

function calculateModuleCombinations() {
  const patches = db.prepare(`
    SELECT id, modules_used, likes_count
    FROM patches
    WHERE status = 'approved' AND is_public = 1 AND modules_used IS NOT NULL
  `).all();

  console.log(`找到 ${patches.length} 个已发布的 Patch`);

  const comboCounts = new Map();
  const comboLikes = new Map();

  patches.forEach(patch => {
    let moduleIds = [];
    try {
      moduleIds = JSON.parse(patch.modules_used) || [];
    } catch (e) {
      return;
    }

    if (!Array.isArray(moduleIds) || moduleIds.length < 2) return;

    const uniqueIds = [...new Set(moduleIds)].sort((a, b) => a - b);

    for (let i = 0; i < uniqueIds.length; i++) {
      for (let j = 0; j < uniqueIds.length; j++) {
        if (i === j) continue;
        const key = `${uniqueIds[i]}-${uniqueIds[j]}`;
        comboCounts.set(key, (comboCounts.get(key) || 0) + 1);
        const likes = comboLikes.get(key) || [];
        likes.push(patch.likes_count || 0);
        comboLikes.set(key, likes);
      }
    }
  });

  const modulePatchCounts = new Map();
  patches.forEach(patch => {
    let moduleIds = [];
    try {
      moduleIds = JSON.parse(patch.modules_used) || [];
    } catch (e) {
      return;
    }
    const uniqueIds = [...new Set(moduleIds)];
    uniqueIds.forEach(id => {
      modulePatchCounts.set(id, (modulePatchCounts.get(id) || 0) + 1);
    });
  });

  const insertOrUpdate = db.prepare(`
    INSERT INTO module_combination_stats 
      (module_id, paired_module_id, co_occurrence_count, avg_patch_likes, confidence_score, last_calculated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(module_id, paired_module_id) DO UPDATE SET
      co_occurrence_count = excluded.co_occurrence_count,
      avg_patch_likes = excluded.avg_patch_likes,
      confidence_score = excluded.confidence_score,
      last_calculated_at = CURRENT_TIMESTAMP
  `);

  const totalCombos = comboCounts.size;
  let processed = 0;

  const updateMany = db.transaction((entries) => {
    entries.forEach(e => insertOrUpdate.run(...e));
  });

  const batch = [];
  const batchSize = 100;

  for (const [key, count] of comboCounts) {
    const [moduleId, pairedId] = key.split('-').map(Number);
    const likes = comboLikes.get(key) || [];
    const avgLikes = likes.length > 0 ? likes.reduce((a, b) => a + b, 0) / likes.length : 0;
    
    const moduleCount = modulePatchCounts.get(moduleId) || 1;
    const pairedCount = modulePatchCounts.get(pairedId) || 1;
    const totalPatches = patches.length;
    
    const support = count / totalPatches;
    const confidence = count / moduleCount;
    const lift = (count / totalPatches) / ((moduleCount / totalPatches) * (pairedCount / totalPatches));
    
    const confidenceScore = (support * 0.3 + confidence * 0.4 + Math.min(lift, 5) / 5 * 0.3);

    batch.push([moduleId, pairedId, count, parseFloat(avgLikes.toFixed(2)), parseFloat(confidenceScore.toFixed(4))]);
    
    processed++;
    if (batch.length >= batchSize) {
      updateMany(batch);
      batch.length = 0;
    }
    
    if (processed % 500 === 0) {
      console.log(`已处理 ${processed}/${totalCombos} 个组合...`);
    }
  }

  if (batch.length > 0) {
    updateMany(batch);
  }

  console.log(`\n统计完成！共 ${totalCombos} 个模块组合已更新`);
}

try {
  calculateModuleCombinations();
} catch (e) {
  console.error('计算组合统计出错:', e.message);
}

console.log('\n迁移完成！');
