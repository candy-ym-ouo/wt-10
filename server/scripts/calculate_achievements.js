require('dotenv').config();
const db = require('../src/db');

console.log('开始计算所有用户成就...');

const calculateUserStats = (userId) => {
  const patchStats = db.prepare(`
    SELECT 
      COUNT(*) as patches_count,
      COALESCE(SUM(likes_count), 0) as total_likes,
      COALESCE(SUM(favorites_count), 0) as total_favorites
    FROM patches 
    WHERE user_id = ? AND status = 'approved' AND is_public = 1
  `).get(userId);

  return {
    patches_count: patchStats.patches_count || 0,
    likes_count: patchStats.total_likes || 0,
    favorites_count: patchStats.total_favorites || 0
  };
};

const updateUserAchievements = (userId) => {
  const stats = calculateUserStats(userId);

  db.prepare(`
    UPDATE users 
    SET total_patches = ?, 
        total_likes = ?, 
        total_favorites = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(stats.patches_count, stats.likes_count, stats.favorites_count, userId);

  const rules = db.prepare(`
    SELECT * FROM achievement_rules WHERE is_active = 1 ORDER BY category, level
  `).all();

  const newlyUnlocked = [];

  rules.forEach(rule => {
    let progress = 0;
    switch (rule.metric_type) {
      case 'patches_count':
        progress = stats.patches_count;
        break;
      case 'likes_count':
        progress = stats.likes_count;
        break;
      case 'favorites_count':
        progress = stats.favorites_count;
        break;
    }

    const isUnlocked = progress >= rule.threshold;

    const existing = db.prepare(`
      SELECT * FROM user_achievements WHERE user_id = ? AND achievement_rule_id = ?
    `).get(userId, rule.id);

    if (existing) {
      const wasUnlocked = existing.is_unlocked;
      db.prepare(`
        UPDATE user_achievements 
        SET progress = ?, 
            is_unlocked = ?,
            unlocked_at = CASE WHEN ? = 1 AND is_unlocked = 0 THEN CURRENT_TIMESTAMP ELSE unlocked_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(progress, isUnlocked ? 1 : 0, isUnlocked ? 1 : 0, existing.id);

      if (!wasUnlocked && isUnlocked) {
        newlyUnlocked.push({ ...rule, progress });
      }
    } else {
      db.prepare(`
        INSERT INTO user_achievements 
          (user_id, achievement_rule_id, progress, is_unlocked, unlocked_at)
        VALUES (?, ?, ?, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)
      `).run(userId, rule.id, progress, isUnlocked ? 1 : 0, isUnlocked ? 1 : 0);

      if (isUnlocked) {
        newlyUnlocked.push({ ...rule, progress });
      }
    }
  });

  return { stats, newlyUnlocked };
};

const main = () => {
  const users = db.prepare('SELECT id, username FROM users').all();
  
  let totalUnlocked = 0;
  let processedUsers = 0;

  users.forEach(user => {
    const result = updateUserAchievements(user.id);
    if (result.newlyUnlocked.length > 0) {
      console.log(`用户 ${user.username} (ID: ${user.id}) 新解锁 ${result.newlyUnlocked.length} 个成就：`);
      result.newlyUnlocked.forEach(a => {
        console.log(`  - ${a.icon} ${a.name} (${a.category} Lv.${a.level})`);
      });
      totalUnlocked += result.newlyUnlocked.length;
    }
    processedUsers++;
  });

  console.log(`\n统计完成！`);
  console.log(`处理用户数: ${processedUsers}`);
  console.log(`新解锁成就: ${totalUnlocked} 个`);

  const totalAchievements = db.prepare('SELECT COUNT(*) as cnt FROM achievement_rules WHERE is_active = 1').get().cnt;
  const unlockedCount = db.prepare('SELECT COUNT(*) as cnt FROM user_achievements WHERE is_unlocked = 1').get().cnt;
  console.log(`成就规则总数: ${totalAchievements}`);
  console.log(`用户获得成就总数: ${unlockedCount}`);
};

main();
