const db = require('../db');

const typeToCategory = {
  'comment': 'comment',
  'like': 'like',
  'favorite': 'favorite',
  'follow': 'follow',
  'review': 'review',
  'activity': 'activity',
  'new_patch': 'follow',
  'system': 'system'
};

const createNotification = (userId, type, fromUserId, patchId, content, options = {}) => {
  try {
    const category = options.category || typeToCategory[type] || 'system';

    const subscription = db.prepare(`
      SELECT enabled FROM notification_subscriptions 
      WHERE user_id = ? AND category = ?
    `).get(userId, category);

    if (subscription && subscription.enabled === 0) {
      return;
    }

    const linkUrl = options.linkUrl || null;
    const extraData = options.extraData ? JSON.stringify(options.extraData) : null;

    db.prepare(`
      INSERT INTO notifications (user_id, type, category, from_user_id, patch_id, content, link_url, extra_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, type, category, fromUserId, patchId, content, linkUrl, extraData);
  } catch (e) {
    console.error('创建通知失败:', e);
  }
};

exports.getPatches = async (ctx) => {
  const { page = 1, limit = 12, search, tag, user_id, sort = 'newest', modules, status } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  const userId = ctx.state.user?.id || 0;
  const userRole = ctx.state.user?.role;

  if (status && userRole === 'admin') {
    where.push('p.status = ?');
    params.push(status);
  } else if (status && user_id && parseInt(user_id) === userId) {
    where.push('p.status = ?');
    params.push(status);
  } else {
    where.push('p.is_public = 1');
    where.push("p.status = 'approved'");
  }

  if (search) {
    where.push('(p.title LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (tag) {
    where.push('p.tags LIKE ?');
    params.push(`%${tag}%`);
  }
  if (user_id) {
    where.push('p.user_id = ?');
    params.push(parseInt(user_id));
  }
  if (modules) {
    const moduleIds = String(modules).split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m));
    moduleIds.forEach(mid => {
      where.push('p.modules_used LIKE ?');
      params.push(`%${mid}%`);
    });
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  let orderSql = 'ORDER BY p.created_at DESC';
  if (sort === 'popular') orderSql = 'ORDER BY p.likes_count DESC, p.views_count DESC';
  if (sort === 'views') orderSql = 'ORDER BY p.views_count DESC';

  const patches = db.prepare(`
    SELECT p.*, u.username, u.avatar, u.is_creator_verified, u.creator_verified_at,
           COUNT(l.id) as real_likes,
           EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND patch_id = p.id) as is_liked,
           EXISTS(SELECT 1 FROM favorites WHERE user_id = ? AND patch_id = p.id) as is_favorited,
           CASE 
             WHEN p.is_paid = 0 THEN 1
             WHEN ? = 0 THEN 0
             WHEN p.user_id = ? THEN 1
             WHEN ? = 'admin' THEN 1
             ELSE EXISTS(
               SELECT 1 FROM patch_permissions pp 
               WHERE pp.user_id = ? AND pp.patch_id = p.id AND pp.status = 'active'
             )
           END as has_purchase_permission
    FROM patches p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON p.id = l.patch_id
    ${whereSql}
    GROUP BY p.id
    ${orderSql}
    LIMIT ? OFFSET ?
  `).all(userId, userId, userId, userId, userRole || '', userId, ...params, limit, offset);

  patches.forEach(p => {
    if (p.is_paid && !p.has_purchase_permission) {
      p.parameters = null;
      p.cables = null;
      p.patch_file = null;
      p.modules_used = null;
      if (p.preview_content) {
        p.description = p.preview_content;
      } else if (p.description && p.description.length > 100) {
        p.description = p.description.substring(0, 100) + '...[付费内容]';
      }
    }
  });

  const total = db.prepare(`SELECT COUNT(*) as count FROM patches p ${whereSql}`).get(...params);

  ctx.body = {
    list: patches,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getPatchDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const userId = ctx.state.user?.id || 0;

  const patch = db.prepare(`
    SELECT p.*, u.username, u.avatar, u.is_creator_verified, u.creator_verified_at,
           COUNT(l.id) as real_likes,
           EXISTS(SELECT 1 FROM likes WHERE user_id = ? AND patch_id = p.id) as is_liked,
           EXISTS(SELECT 1 FROM favorites WHERE user_id = ? AND patch_id = p.id) as is_favorited
    FROM patches p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON p.id = l.patch_id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(userId, userId, id);

  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  if (patch.status === 'draft' || patch.status === 'scheduled') {
    if (userId === 0) {
      ctx.status = 403;
      ctx.body = { error: '无权访问此 Patch' };
      return;
    }
    if (patch.user_id !== userId && ctx.state.user?.role !== 'admin') {
      ctx.status = 403;
      ctx.body = { error: '无权访问此 Patch' };
      return;
    }
  }

  if (patch.status === 'approved' && patch.is_public) {
    db.prepare('UPDATE patches SET views_count = views_count + 1 WHERE id = ?').run(id);
  }

  let hasPermission = true;
  if (patch.is_paid) {
    if (userId === 0) {
      hasPermission = false;
    } else if (patch.user_id !== userId && ctx.state.user?.role !== 'admin') {
      const perm = db.prepare(`
        SELECT 1 FROM patch_permissions 
        WHERE user_id = ? AND patch_id = ? AND status = 'active'
        LIMIT 1
      `).get(userId, id);
      hasPermission = !!perm;
    }
  }

  patch.has_purchase_permission = hasPermission;

  if (patch.is_paid && !hasPermission) {
    patch.parameters = null;
    patch.cables = null;
    patch.patch_file = null;
    patch.modules_used = null;
    if (patch.preview_content) {
      patch.description = patch.preview_content;
    } else if (patch.description) {
      const words = patch.description.split(' ');
      patch.description = words.slice(0, Math.ceil(words.length * 0.3)).join(' ') + '\n\n...[付费内容，购买后查看完整内容]';
    }
  }

  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.patch_id = ?
    ORDER BY c.created_at DESC
  `).all(id);

  ctx.body = { ...patch, comments };
};

exports.createPatch = async (ctx) => {
  const {
    title, description, modules_used, parameters,
    cables, audio_url, image_url, patch_file, tags, is_public,
    is_paid, price, preview_content, status, scheduled_at
  } = ctx.request.body;

  if (!title) {
    ctx.status = 400;
    ctx.body = { error: '请填写标题' };
    return;
  }

  const validStatuses = ['draft', 'pending', 'approved', 'scheduled', 'rejected'];
  let patchStatus = status || 'approved';
  if (!validStatuses.includes(patchStatus)) {
    patchStatus = 'approved';
  }

  let isPublic = is_public !== undefined ? (is_public ? 1 : 0) : 1;
  if (patchStatus === 'draft') {
    isPublic = 0;
  } else if (patchStatus === 'scheduled' || patchStatus === 'pending' || patchStatus === 'approved') {
    isPublic = 1;
  }

  const isPaid = is_paid ? 1 : 0;
  const patchPrice = isPaid ? (price || 0) : 0;

  let scheduledAt = scheduled_at || null;
  if (patchStatus !== 'scheduled') {
    scheduledAt = null;
  }
  if (patchStatus === 'scheduled' && !scheduledAt) {
    ctx.status = 400;
    ctx.body = { error: '定时发布需要指定发布时间' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO patches (title, description, user_id, modules_used, parameters,
                         cables, audio_url, image_url, patch_file, tags, is_public,
                         is_paid, price, preview_content, status, scheduled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    title, description, ctx.state.user.id,
    JSON.stringify(modules_used || []),
    JSON.stringify(parameters || {}),
    JSON.stringify(cables || []),
    audio_url, image_url, patch_file,
    JSON.stringify(tags || []),
    isPublic,
    isPaid,
    patchPrice,
    preview_content || null,
    patchStatus,
    scheduledAt
  );

  const patchId = result.lastInsertRowid;

  if (isPaid && patchPrice > 0) {
    const productStmt = db.prepare(`
      INSERT OR IGNORE INTO patch_products 
      (patch_id, name, price, is_active)
      VALUES (?, ?, ?, 1)
    `);
    productStmt.run(patchId, title, patchPrice);
  }

  if (patchStatus === 'approved' && isPublic) {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(ctx.state.user.id);
    const followers = db.prepare(`
      SELECT follower_id FROM follows WHERE following_id = ?
    `).all(ctx.state.user.id);
    
    followers.forEach(follower => {
      createNotification(
        follower.follower_id,
        'new_patch',
        ctx.state.user.id,
        patchId,
        result.lastInsertRowid,
        `${user.username} 发布了新 Patch：${title}`,
        { linkUrl: `/patches/${patchId}` }
      );
    });
  }

  ctx.body = {
    id: patchId,
    status: patchStatus,
    scheduled_at: scheduledAt,
    message: patchStatus === 'draft' ? '草稿保存成功' : (patchStatus === 'scheduled' ? '定时发布设置成功' : '创建成功')
  };
};

exports.updatePatch = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const patch = db.prepare('SELECT * FROM patches WHERE id = ?').get(id);

  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  if (patch.user_id !== ctx.state.user.id && ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '无权限修改' };
    return;
  }

  const {
    title, description, modules_used, parameters,
    cables, audio_url, image_url, patch_file, tags, is_public,
    is_paid, price, preview_content, status, scheduled_at
  } = ctx.request.body;

  const validStatuses = ['draft', 'pending', 'approved', 'scheduled', 'rejected'];
  let patchStatus = status;
  if (patchStatus !== undefined && !validStatuses.includes(patchStatus)) {
    ctx.status = 400;
    ctx.body = { error: '无效的状态值' };
    return;
  }

  let finalIsPublic = is_public;
  if (patchStatus === 'draft') {
    finalIsPublic = false;
  } else if (patchStatus === 'scheduled' || patchStatus === 'pending' || patchStatus === 'approved') {
    finalIsPublic = true;
  }

  let scheduledAt = scheduled_at !== undefined ? scheduled_at : undefined;
  if (patchStatus !== undefined && patchStatus !== 'scheduled') {
    scheduledAt = null;
  }
  if (patchStatus === 'scheduled' && !scheduledAt && !patch.scheduled_at) {
    ctx.status = 400;
    ctx.body = { error: '定时发布需要指定发布时间' };
    return;
  }

  const stmt = db.prepare(`
    UPDATE patches SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      modules_used = COALESCE(?, modules_used),
      parameters = COALESCE(?, parameters),
      cables = COALESCE(?, cables),
      audio_url = COALESCE(?, audio_url),
      image_url = COALESCE(?, image_url),
      patch_file = COALESCE(?, patch_file),
      tags = COALESCE(?, tags),
      is_public = ?,
      is_paid = COALESCE(?, is_paid),
      price = COALESCE(?, price),
      preview_content = COALESCE(?, preview_content),
      status = COALESCE(?, status),
      scheduled_at = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const isPaid = is_paid !== undefined ? (is_paid ? 1 : 0) : undefined;
  const patchPrice = isPaid === 1 ? (price || 0) : (isPaid === 0 ? 0 : price);

  const isPublicValue = finalIsPublic !== undefined ? (finalIsPublic ? 1 : 0) : patch.is_public;
  const scheduledAtValue = scheduledAt !== undefined ? scheduledAt : patch.scheduled_at;

  stmt.run(
    title, description,
    modules_used ? JSON.stringify(modules_used) : null,
    parameters ? JSON.stringify(parameters) : null,
    cables ? JSON.stringify(cables) : null,
    audio_url, image_url, patch_file,
    tags ? JSON.stringify(tags) : null,
    isPublicValue,
    isPaid,
    patchPrice,
    preview_content,
    patchStatus,
    scheduledAtValue,
    id
  );

  if (isPaid !== undefined) {
    if (isPaid && patchPrice > 0) {
      const productStmt = db.prepare(`
        INSERT OR REPLACE INTO patch_products 
        (id, patch_id, name, price, is_active, created_at, updated_at)
        VALUES (
          (SELECT id FROM patch_products WHERE patch_id = ?),
          ?, ?, ?, 1,
          COALESCE((SELECT created_at FROM patch_products WHERE patch_id = ?), CURRENT_TIMESTAMP),
          CURRENT_TIMESTAMP
        )
      `);
      productStmt.run(id, id, title || patch.title, patchPrice, id);
    } else if (isPaid === 0) {
      db.prepare('DELETE FROM patch_products WHERE patch_id = ?').run(id);
    }
  } else if (price !== undefined) {
    const existingProduct = db.prepare('SELECT * FROM patch_products WHERE patch_id = ?').get(id);
    if (existingProduct) {
      db.prepare('UPDATE patch_products SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE patch_id = ?')
        .run(price, id);
    }
  }

  if (patchStatus === 'approved' && patch.status !== 'approved') {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(patch.user_id);
    const followers = db.prepare(`
      SELECT follower_id FROM follows WHERE following_id = ?
    `).all(patch.user_id);
    
    followers.forEach(follower => {
      createNotification(
        follower.follower_id,
        'new_patch',
        patch.user_id,
        id,
        `${user.username} 发布了新 Patch：${title || patch.title}`,
        { linkUrl: `/patches/${id}` }
      );
    });
  }

  ctx.body = { success: true, status: patchStatus || patch.status };
};

exports.deletePatch = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const patch = db.prepare('SELECT * FROM patches WHERE id = ?').get(id);

  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  if (patch.user_id !== ctx.state.user.id && ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '无权限删除' };
    return;
  }

  db.prepare('DELETE FROM patches WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.addComment = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { content } = ctx.request.body;
  const userId = ctx.state.user.id;

  if (!content) {
    ctx.status = 400;
    ctx.body = { error: '请填写评论内容' };
    return;
  }

  const patch = db.prepare('SELECT user_id, title FROM patches WHERE id = ?').get(id);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const stmt = db.prepare('INSERT INTO comments (user_id, patch_id, content) VALUES (?, ?, ?)');
  const result = stmt.run(userId, id, content);

  if (patch.user_id !== userId) {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
    const truncatedContent = content.length > 30 ? content.substring(0, 30) + '...' : content;
    createNotification(
      patch.user_id,
      'comment',
      userId,
      id,
      `${user?.username || '用户'} 评论了你的 Patch "${patch.title}": "${truncatedContent}"`,
      {
        category: 'comment',
        linkUrl: `/patches/${id}`
      }
    );
  }

  const comment = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  ctx.body = comment;
};

exports.deleteComment = async (ctx) => {
  const commentId = parseInt(ctx.params.commentId);
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);

  if (!comment) {
    ctx.status = 404;
    ctx.body = { error: '评论不存在' };
    return;
  }

  if (comment.user_id !== ctx.state.user.id && ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '无权限删除' };
    return;
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  ctx.body = { success: true };
};
