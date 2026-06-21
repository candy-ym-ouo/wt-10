const db = require('../db');

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

exports.getUserAchievements = async (ctx) => {
  const userId = parseInt(ctx.params.id);

  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: '用户不存在' };
    return;
  }

  const result = updateUserAchievements(userId);

  const achievements = db.prepare(`
    SELECT 
      ar.*,
      ua.progress,
      ua.is_unlocked,
      ua.unlocked_at
    FROM achievement_rules ar
    LEFT JOIN user_achievements ua ON ar.id = ua.achievement_rule_id AND ua.user_id = ?
    WHERE ar.is_active = 1
    ORDER BY ar.category, ar.level
  `).all(userId);

  const grouped = {
    patch: [],
    like: [],
    favorite: []
  };

  achievements.forEach(a => {
    const item = {
      ...a,
      progress: a.progress || 0,
      is_unlocked: !!a.is_unlocked,
      progress_percent: Math.min(100, Math.round((a.progress || 0) / a.threshold * 100))
    };
    if (grouped[a.category]) {
      grouped[a.category].push(item);
    }
  });

  const unlockedCount = achievements.filter(a => a.is_unlocked).length;
  const totalCount = achievements.length;

  ctx.body = {
    user,
    stats: result.stats,
    achievements: grouped,
    unlocked_count: unlockedCount,
    total_count: totalCount
  };
};

exports.getMyAchievements = async (ctx) => {
  const userId = ctx.state.user.id;
  ctx.params.id = userId;
  await exports.getUserAchievements(ctx);
};

exports.getAchievementRules = async (ctx) => {
  const { category, is_active } = ctx.query;
  
  let sql = 'SELECT * FROM achievement_rules WHERE 1=1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (is_active !== undefined && is_active !== '') {
    sql += ' AND is_active = ?';
    params.push(parseInt(is_active));
  }

  sql += ' ORDER BY category, level, sort_order';

  const rules = db.prepare(sql).all(...params);
  
  ctx.body = {
    list: rules,
    total: rules.length
  };
};

exports.createAchievementRule = async (ctx) => {
  const { name, description, icon, category, metric_type, threshold, level, sort_order, is_active } = ctx.request.body;

  if (!name || !category || !metric_type || !threshold) {
    ctx.status = 400;
    ctx.body = { error: '请填写必要信息' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO achievement_rules 
      (name, description, icon, category, metric_type, threshold, level, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name,
    description || '',
    icon || '🏆',
    category,
    metric_type,
    parseInt(threshold),
    parseInt(level) || 1,
    parseInt(sort_order) || 0,
    is_active !== undefined ? (is_active ? 1 : 0) : 1
  );

  ctx.body = {
    id: result.lastInsertRowid,
    message: '创建成功'
  };
};

exports.updateAchievementRule = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { name, description, icon, category, metric_type, threshold, level, sort_order, is_active } = ctx.request.body;

  const existing = db.prepare('SELECT * FROM achievement_rules WHERE id = ?').get(id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '成就规则不存在' };
    return;
  }

  const stmt = db.prepare(`
    UPDATE achievement_rules 
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        icon = COALESCE(?, icon),
        category = COALESCE(?, category),
        metric_type = COALESCE(?, metric_type),
        threshold = COALESCE(?, threshold),
        level = COALESCE(?, level),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(
    name,
    description,
    icon,
    category,
    metric_type,
    threshold ? parseInt(threshold) : null,
    level ? parseInt(level) : null,
    sort_order !== undefined ? parseInt(sort_order) : null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    id
  );

  ctx.body = { message: '更新成功' };
};

exports.deleteAchievementRule = async (ctx) => {
  const id = parseInt(ctx.params.id);

  const existing = db.prepare('SELECT * FROM achievement_rules WHERE id = ?').get(id);
  if (!existing) {
    ctx.status = 404;
    ctx.body = { error: '成就规则不存在' };
    return;
  }

  db.prepare('DELETE FROM achievement_rules WHERE id = ?').run(id);

  ctx.body = { message: '删除成功' };
};

exports.recalculateAllAchievements = async (ctx) => {
  const users = db.prepare('SELECT id FROM users').all();
  
  let updatedCount = 0;
  users.forEach(user => {
    updateUserAchievements(user.id);
    updatedCount++;
  });

  ctx.body = {
    message: '统计完成',
    updated_users: updatedCount
  };
};

exports.recalculateUserAchievements = async (ctx) => {
  const userId = parseInt(ctx.params.id);
  
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    ctx.status = 404;
    ctx.body = { error: '用户不存在' };
    return;
  }

  const result = updateUserAchievements(userId);

  ctx.body = {
    message: '统计完成',
    stats: result.stats,
    newly_unlocked: result.newlyUnlocked
  };
};

exports.updateUserAchievements = updateUserAchievements;
exports.calculateUserStats = calculateUserStats;
