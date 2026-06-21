const db = require('../db');
const { recordPatchView } = require('./patchStatsController');
const { canViewContent } = require('./userController');
const { createMessage } = require('./messageController');

const hasDuplicateTags = (tags) => {
  if (!tags || tags.length === 0) return false;
  const seen = new Set();
  for (const tag of tags) {
    const normalized = String(tag).trim().toLowerCase();
    if (seen.has(normalized)) {
      return true;
    }
    seen.add(normalized);
  }
  return false;
};

const validatePatchData = (modulesUsed, parameters, tags, isDraft = false) => {
  if (isDraft) {
    return { valid: true };
  }

  if (!modulesUsed || modulesUsed.length === 0) {
    return { valid: false, error: '请至少选择一个使用的模块' };
  }

  if (tags && hasDuplicateTags(tags)) {
    return { valid: false, error: '存在重复的标签，请去除重复项' };
  }

  const paramsObj = parameters || {};
  for (const moduleId of modulesUsed) {
    const mid = String(moduleId);
    const moduleParams = db.prepare(
      'SELECT id, name, label FROM module_parameters WHERE module_id = ? ORDER BY sort_order'
    ).all(moduleId);

    if (moduleParams.length > 0) {
      const patchModuleParams = paramsObj[mid] || {};
      for (const param of moduleParams) {
        const value = patchModuleParams[param.name];
        if (value === null || value === undefined || value === '') {
          const module = db.prepare('SELECT name FROM modules WHERE id = ?').get(moduleId);
          const moduleName = module ? module.name : `模块 #${moduleId}`;
          const paramName = param.label || param.name;
          return {
            valid: false,
            error: `模块 "${moduleName}" 的参数 "${paramName}" 为空，请填写完整`
          };
        }
      }
    }
  }

  return { valid: true };
};

const VERSION_FIELDS = [
  'title', 'description', 'modules_used', 'parameters', 'cables',
  'audio_url', 'image_url', 'patch_file', 'tags', 'is_public',
  'is_paid', 'price', 'preview_content', 'status', 'scheduled_at'
];

const FIELD_LABELS = {
  title: '标题',
  description: '描述',
  modules_used: '使用模块',
  parameters: '参数配置',
  cables: '线缆连接',
  audio_url: '音频链接',
  image_url: '图片链接',
  patch_file: 'Patch 文件',
  tags: '标签',
  is_public: '公开状态',
  is_paid: '付费状态',
  price: '价格',
  preview_content: '预览内容',
  status: '状态',
  scheduled_at: '定时发布时间'
};

const createPatchVersion = (patchId, userId, changeSummary = null) => {
  try {
    const patch = db.prepare(`
      SELECT ${VERSION_FIELDS.join(', ')} FROM patches WHERE id = ?
    `).get(patchId);

    if (!patch) return null;

    const maxVersion = db.prepare(`
      SELECT COALESCE(MAX(version), 0) as max_ver FROM patch_versions WHERE patch_id = ?
    `).get(patchId);

    const nextVersion = maxVersion.max_ver + 1;

    const stmt = db.prepare(`
      INSERT INTO patch_versions (
        patch_id, version, title, description, modules_used, parameters,
        cables, audio_url, image_url, patch_file, tags, is_public, is_paid,
        price, preview_content, status, scheduled_at, change_summary, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      patchId,
      nextVersion,
      patch.title,
      patch.description,
      patch.modules_used,
      patch.parameters,
      patch.cables,
      patch.audio_url,
      patch.image_url,
      patch.patch_file,
      patch.tags,
      patch.is_public,
      patch.is_paid,
      patch.price,
      patch.preview_content,
      patch.status,
      patch.scheduled_at,
      changeSummary,
      userId
    );

    return result.lastInsertRowid;
  } catch (err) {
    console.error('[VERSION] 创建版本记录失败:', err.message);
    return null;
  }
};

const generateChangeSummary = (oldPatch, newData) => {
  const changes = [];

  for (const field of VERSION_FIELDS) {
    if (newData[field] !== undefined && newData[field] !== null) {
      const oldVal = oldPatch[field];
      let newVal = newData[field];

      if (['modules_used', 'parameters', 'cables', 'tags'].includes(field)) {
        newVal = typeof newVal === 'string' ? newVal : JSON.stringify(newVal);
      }

      if (field === 'is_public' || field === 'is_paid') {
        newVal = newVal ? 1 : 0;
      }

      if (oldVal !== newVal) {
        changes.push(FIELD_LABELS[field] || field);
      }
    }
  }

  if (changes.length === 0) return null;
  if (changes.length <= 3) return `修改了：${changes.join('、')}`;
  return `修改了：${changes.slice(0, 3).join('、')} 等 ${changes.length} 项`;
};

const typeToCategory = {
  'comment': 'comment',
  'comment_reply': 'comment',
  'comment_like': 'like',
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

  const isViewingOwn = user_id && parseInt(user_id) === userId;
  
  if (user_id && !isViewingOwn && userRole !== 'admin') {
    const targetUser = db.prepare(`
      SELECT privacy_patches FROM users WHERE id = ?
    `).get(parseInt(user_id));
    
    if (targetUser && !canViewContent(targetUser.privacy_patches, parseInt(user_id), userId)) {
      ctx.body = {
        list: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit)
      };
      return;
    }
  }
  
  if (status && userRole === 'admin') {
    where.push('p.status = ?');
    params.push(status);
  } else if (status && isViewingOwn) {
    where.push('p.status = ?');
    params.push(status);
  } else if (isViewingOwn || userRole === 'admin') {
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
      where.push('EXISTS (SELECT 1 FROM json_each(p.modules_used) WHERE value = ?)');
      params.push(mid);
    });
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  let orderSql = 'ORDER BY p.created_at DESC';
  if (sort === 'popular') orderSql = 'ORDER BY p.likes_count DESC, p.views_count DESC';
  if (sort === 'views') orderSql = 'ORDER BY p.views_count DESC';
  if (sort === 'recommended') orderSql = 'ORDER BY p.likes_count DESC, p.views_count DESC, p.created_at DESC';

  let joinSql = '';
  if (sort === 'recommended' && modules) {
    try {
      const moduleIds = String(modules).split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m));
      const placeholders = moduleIds.map(() => '?').join(',');
      joinSql = `LEFT JOIN module_patch_affinity mpa ON mpa.patch_id = p.id AND mpa.module_id IN (${placeholders})`;
      params.unshift(...moduleIds);
      orderSql = `ORDER BY 
        COUNT(DISTINCT mpa.module_id) DESC,
        COALESCE(SUM(mpa.affinity_score), 0) DESC,
        COALESCE(SUM(mpa.combination_weight), 0) DESC,
        p.likes_count DESC`;
    } catch (e) {
      orderSql = 'ORDER BY p.likes_count DESC, p.views_count DESC, p.created_at DESC';
    }
  }

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
    ${joinSql}
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

  if (['draft', 'scheduled', 'rejected', 'needs_revision'].includes(patch.status)) {
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
    recordPatchView(ctx, id);
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

  const commentsRaw = db.prepare(`
    SELECT c.*, u.username, u.avatar,
           EXISTS(SELECT 1 FROM comment_likes WHERE user_id = ? AND comment_id = c.id) as is_liked,
           ru.username as reply_to_username
    FROM comments c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN users ru ON c.reply_to_user_id = ru.id
    WHERE c.patch_id = ? AND c.status = 'approved'
    ORDER BY c.created_at DESC
  `).all(userId, id);

  const commentMap = {};
  const topLevelComments = [];
  
  commentsRaw.forEach(comment => {
    comment.replies = [];
    commentMap[comment.id] = comment;
  });
  
  commentsRaw.forEach(comment => {
    if (comment.parent_id && commentMap[comment.parent_id]) {
      commentMap[comment.parent_id].replies.push(comment);
    } else {
      topLevelComments.push(comment);
    }
  });

  ctx.body = { ...patch, comments: topLevelComments };
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

  const isDraft = status === 'draft';
  const validation = validatePatchData(modules_used, parameters, tags, isDraft);
  if (!validation.valid) {
    ctx.status = 400;
    ctx.body = { error: validation.error };
    return;
  }

  const validStatuses = ['draft', 'pending', 'approved', 'scheduled', 'rejected', 'needs_revision'];
  let patchStatus = status || 'approved';
  if (!validStatuses.includes(patchStatus)) {
    patchStatus = 'approved';
  }

  let isPublic = is_public !== undefined ? (is_public ? 1 : 0) : 1;
  if (patchStatus === 'draft' || patchStatus === 'needs_revision') {
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

  createPatchVersion(patchId, ctx.state.user.id, '初始版本');

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
  const oldPatch = db.prepare('SELECT * FROM patches WHERE id = ?').get(id);

  if (!oldPatch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  if (oldPatch.user_id !== ctx.state.user.id && ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '无权限修改' };
    return;
  }

  const {
    title, description, modules_used, parameters,
    cables, audio_url, image_url, patch_file, tags, is_public,
    is_paid, price, preview_content, status, scheduled_at
  } = ctx.request.body;

  const validStatuses = ['draft', 'pending', 'approved', 'scheduled', 'rejected', 'needs_revision'];
  let patchStatus = status;
  if (patchStatus !== undefined && !validStatuses.includes(patchStatus)) {
    ctx.status = 400;
    ctx.body = { error: '无效的状态值' };
    return;
  }

  const finalStatus = patchStatus !== undefined ? patchStatus : oldPatch.status;
  const isDraft = finalStatus === 'draft' || finalStatus === 'needs_revision';
  
  const finalModulesUsed = modules_used !== undefined 
    ? modules_used 
    : (oldPatch.modules_used ? JSON.parse(oldPatch.modules_used) : []);
  
  const finalParameters = parameters !== undefined 
    ? parameters 
    : (oldPatch.parameters ? JSON.parse(oldPatch.parameters) : {});
  
  const finalTags = tags !== undefined 
    ? tags 
    : (oldPatch.tags ? JSON.parse(oldPatch.tags) : []);

  const validation = validatePatchData(finalModulesUsed, finalParameters, finalTags, isDraft);
  if (!validation.valid) {
    ctx.status = 400;
    ctx.body = { error: validation.error };
    return;
  }

  let finalIsPublic = is_public;
  if (patchStatus === 'draft' || patchStatus === 'needs_revision') {
    finalIsPublic = false;
  } else if (patchStatus === 'scheduled' || patchStatus === 'pending' || patchStatus === 'approved') {
    finalIsPublic = true;
  }

  let scheduledAt = scheduled_at !== undefined ? scheduled_at : undefined;
  if (patchStatus !== undefined && patchStatus !== 'scheduled') {
    scheduledAt = null;
  }
  if (patchStatus === 'scheduled' && !scheduledAt && !oldPatch.scheduled_at) {
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

  const isPublicValue = finalIsPublic !== undefined ? (finalIsPublic ? 1 : 0) : oldPatch.is_public;
  const scheduledAtValue = scheduledAt !== undefined ? scheduledAt : oldPatch.scheduled_at;

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
      productStmt.run(id, id, title || oldPatch.title, patchPrice, id);
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

  const changeSummary = generateChangeSummary(oldPatch, ctx.request.body);
  createPatchVersion(id, ctx.state.user.id, changeSummary);

  if (patchStatus === 'approved' && oldPatch.status !== 'approved') {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(oldPatch.user_id);
    const followers = db.prepare(`
      SELECT follower_id FROM follows WHERE following_id = ?
    `).all(oldPatch.user_id);
    
    followers.forEach(follower => {
      createNotification(
        follower.follower_id,
        'new_patch',
        oldPatch.user_id,
        id,
        `${user.username} 发布了新 Patch：${title || oldPatch.title}`,
        { linkUrl: `/patches/${id}` }
      );
    });
  }

  ctx.body = { success: true, status: patchStatus || oldPatch.status };
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
  const { content, parent_id, reply_to_user_id } = ctx.request.body;
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

  let parentComment = null;
  let replyToUser = null;
  let rootCommentId = null;

  if (parent_id) {
    parentComment = db.prepare('SELECT * FROM comments WHERE id = ? AND patch_id = ?').get(parent_id, id);
    if (!parentComment) {
      ctx.status = 400;
      ctx.body = { error: '父评论不存在' };
      return;
    }
    
    if (parentComment.parent_id) {
      rootCommentId = parentComment.parent_id;
    } else {
      rootCommentId = parent_id;
    }

    if (reply_to_user_id) {
      replyToUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(reply_to_user_id);
    } else if (parentComment) {
      replyToUser = { id: parentComment.user_id };
    }
  }

  const stmt = db.prepare(`
    INSERT INTO comments (user_id, patch_id, content, parent_id, reply_to_user_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId, 
    id, 
    content,
    rootCommentId || null,
    replyToUser?.id || null
  );

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
  const truncatedContent = content.length > 30 ? content.substring(0, 30) + '...' : content;

  if (patch.user_id !== userId && !parent_id) {
    createNotification(
      patch.user_id,
      'comment',
      userId,
      id,
      `${user?.username || '用户'} 评论了你的 Patch "${patch.title}": "${truncatedContent}"`,
      {
        category: 'comment',
        linkUrl: `/patches/${id}#comment-${result.lastInsertRowid}`
      }
    );
    createMessage(patch.user_id, 'comment', 'comment', {
      fromUserId: userId,
      targetType: 'patch',
      targetId: id,
      content: `${user?.username || '用户'} 评论了你的 Patch "${patch.title}": "${truncatedContent}"`,
      linkUrl: `/patches/${id}#comment-${result.lastInsertRowid}`
    });
  }

  if (replyToUser && replyToUser.id !== userId && replyToUser.id !== patch.user_id) {
    createNotification(
      replyToUser.id,
      'comment_reply',
      userId,
      id,
      `${user?.username || '用户'} 回复了你的评论: "${truncatedContent}"`,
      {
        category: 'comment',
        linkUrl: `/patches/${id}#comment-${result.lastInsertRowid}`,
        extraData: { comment_id: result.lastInsertRowid, parent_id: rootCommentId }
      }
    );
    createMessage(replyToUser.id, 'comment_reply', 'comment', {
      fromUserId: userId,
      targetType: 'patch',
      targetId: id,
      content: `${user?.username || '用户'} 回复了你的评论: "${truncatedContent}"`,
      linkUrl: `/patches/${id}#comment-${result.lastInsertRowid}`,
      extraData: { comment_id: Number(result.lastInsertRowid), parent_id: rootCommentId }
    });
  }

  const comment = db.prepare(`
    SELECT c.*, u.username, u.avatar,
           ru.username as reply_to_username,
           0 as is_liked,
           0 as likes_count
    FROM comments c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN users ru ON c.reply_to_user_id = ru.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  comment.replies = [];
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

exports.toggleCommentLike = async (ctx) => {
  const commentId = parseInt(ctx.params.commentId);
  const userId = ctx.state.user.id;

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
  if (!comment) {
    ctx.status = 404;
    ctx.body = { error: '评论不存在' };
    return;
  }

  const existing = db.prepare('SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?').get(userId, commentId);

  if (existing) {
    db.prepare('DELETE FROM comment_likes WHERE id = ?').run(existing.id);
    db.prepare('UPDATE comments SET likes_count = likes_count - 1 WHERE id = ?').run(commentId);
    const likesCount = Math.max(0, db.prepare('SELECT likes_count FROM comments WHERE id = ?').get(commentId).likes_count);
    ctx.body = { liked: false, likes_count: likesCount };
  } else {
    db.prepare('INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)').run(userId, commentId);
    db.prepare('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?').run(commentId);
    const likesCount = db.prepare('SELECT likes_count FROM comments WHERE id = ?').get(commentId).likes_count;
    
    if (comment.user_id !== userId) {
      const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
      const patch = db.prepare('SELECT title FROM patches WHERE id = ?').get(comment.patch_id);
      createNotification(
        comment.user_id,
        'comment_like',
        userId,
        comment.patch_id,
        `${user?.username || '用户'} 赞了你的评论`,
        {
          category: 'like',
          linkUrl: `/patches/${comment.patch_id}#comment-${commentId}`,
          extraData: { comment_id: commentId }
        }
      );
    }
    
    ctx.body = { liked: true, likes_count: likesCount };
  }
};

exports.getPatchVersions = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const { page = 1, pageSize = 20 } = ctx.query;

  const patch = db.prepare('SELECT id, user_id FROM patches WHERE id = ?').get(patchId);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const userId = ctx.state.user?.id || 0;
  const isOwner = userId === patch.user_id;
  const isAdmin = ctx.state.user?.role === 'admin';

  if (!isOwner && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '无权限查看版本历史' };
    return;
  }

  const offset = (page - 1) * pageSize;

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as total FROM patch_versions WHERE patch_id = ?
  `);
  const { total } = totalStmt.get(patchId);

  const versions = db.prepare(`
    SELECT pv.*, u.username, u.avatar
    FROM patch_versions pv
    LEFT JOIN users u ON pv.created_by = u.id
    WHERE pv.patch_id = ?
    ORDER BY pv.version DESC
    LIMIT ? OFFSET ?
  `).all(patchId, pageSize, offset);

  ctx.body = {
    list: versions,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(total / pageSize)
  };
};

exports.getPatchVersionDetail = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const versionId = parseInt(ctx.params.versionId);

  const patch = db.prepare('SELECT id, user_id FROM patches WHERE id = ?').get(patchId);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const userId = ctx.state.user?.id || 0;
  const isOwner = userId === patch.user_id;
  const isAdmin = ctx.state.user?.role === 'admin';

  if (!isOwner && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '无权限查看版本详情' };
    return;
  }

  const version = db.prepare(`
    SELECT pv.*, u.username, u.avatar
    FROM patch_versions pv
    LEFT JOIN users u ON pv.created_by = u.id
    WHERE pv.patch_id = ? AND pv.id = ?
  `).get(patchId, versionId);

  if (!version) {
    ctx.status = 404;
    ctx.body = { error: '版本不存在' };
    return;
  }

  ctx.body = version;
};

exports.getPatchVersionDiff = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const { fromVersion, toVersion } = ctx.query;

  const patch = db.prepare('SELECT id, user_id FROM patches WHERE id = ?').get(patchId);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const userId = ctx.state.user?.id || 0;
  const isOwner = userId === patch.user_id;
  const isAdmin = ctx.state.user?.role === 'admin';

  if (!isOwner && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '无权限查看版本差异' };
    return;
  }

  const fromVer = fromVersion ? parseInt(fromVersion) : null;
  const toVer = toVersion ? parseInt(toVersion) : null;

  let fromVersionData = null;
  let toVersionData = null;

  if (toVer) {
    toVersionData = db.prepare('SELECT * FROM patch_versions WHERE patch_id = ? AND version = ?').get(patchId, toVer);
  }

  if (fromVer) {
    fromVersionData = db.prepare('SELECT * FROM patch_versions WHERE patch_id = ? AND version = ?').get(patchId, fromVer);
  } else if (toVersionData && toVer > 1) {
    fromVersionData = db.prepare('SELECT * FROM patch_versions WHERE patch_id = ? AND version = ?').get(patchId, toVer - 1);
  }

  if (!toVersionData) {
    ctx.status = 404;
    ctx.body = { error: '目标版本不存在' };
    return;
  }

  const diffs = [];

  for (const field of VERSION_FIELDS) {
    const oldVal = fromVersionData ? fromVersionData[field] : null;
    const newVal = toVersionData[field];

    if (oldVal !== newVal) {
      let oldDisplay = oldVal;
      let newDisplay = newVal;

      if (['modules_used', 'parameters', 'tags'].includes(field)) {
        try {
          oldDisplay = oldVal ? JSON.parse(oldVal) : null;
          newDisplay = newVal ? JSON.parse(newVal) : null;
        } catch (e) {}
      }

      diffs.push({
        field,
        fieldLabel: FIELD_LABELS[field] || field,
        oldValue: oldDisplay,
        newValue: newDisplay
      });
    }
  }

  ctx.body = {
    fromVersion: fromVersionData ? {
      id: fromVersionData.id,
      version: fromVersionData.version,
      created_at: fromVersionData.created_at,
      change_summary: fromVersionData.change_summary
    } : null,
    toVersion: {
      id: toVersionData.id,
      version: toVersionData.version,
      created_at: toVersionData.created_at,
      change_summary: toVersionData.change_summary
    },
    diffs
  };
};

exports.rollbackPatchVersion = async (ctx) => {
  const patchId = parseInt(ctx.params.id);
  const versionId = parseInt(ctx.params.versionId);

  const patch = db.prepare('SELECT * FROM patches WHERE id = ?').get(patchId);
  if (!patch) {
    ctx.status = 404;
    ctx.body = { error: 'Patch 不存在' };
    return;
  }

  const userId = ctx.state.user?.id || 0;
  const isOwner = userId === patch.user_id;
  const isAdmin = ctx.state.user?.role === 'admin';

  if (!isOwner && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '无权限回滚版本' };
    return;
  }

  const targetVersion = db.prepare('SELECT * FROM patch_versions WHERE patch_id = ? AND id = ?').get(patchId, versionId);
  if (!targetVersion) {
    ctx.status = 404;
    ctx.body = { error: '目标版本不存在' };
    return;
  }

  const changeSummary = `回滚到版本 v${targetVersion.version}`;
  createPatchVersion(patchId, userId, changeSummary);

  const stmt = db.prepare(`
    UPDATE patches SET
      title = ?,
      description = ?,
      modules_used = ?,
      parameters = ?,
      cables = ?,
      audio_url = ?,
      image_url = ?,
      patch_file = ?,
      tags = ?,
      is_public = ?,
      is_paid = ?,
      price = ?,
      preview_content = ?,
      status = ?,
      scheduled_at = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(
    targetVersion.title,
    targetVersion.description,
    targetVersion.modules_used,
    targetVersion.parameters,
    targetVersion.cables,
    targetVersion.audio_url,
    targetVersion.image_url,
    targetVersion.patch_file,
    targetVersion.tags,
    targetVersion.is_public,
    targetVersion.is_paid,
    targetVersion.price,
    targetVersion.preview_content,
    targetVersion.status,
    targetVersion.scheduled_at,
    patchId
  );

  ctx.body = {
    success: true,
    message: `已成功回滚到版本 v${targetVersion.version}`,
    rolledBackToVersion: targetVersion.version
  };
};

exports.adminGetAllPatchVersions = async (ctx) => {
  const { page = 1, pageSize = 20, patchId, userId, startDate, endDate, keyword } = ctx.query;

  const offset = (page - 1) * pageSize;
  const whereConditions = [];
  const sqlParams = [];

  if (patchId) {
    whereConditions.push('pv.patch_id = ?');
    sqlParams.push(parseInt(patchId));
  }
  if (userId) {
    whereConditions.push('pv.created_by = ?');
    sqlParams.push(parseInt(userId));
  }
  if (startDate) {
    whereConditions.push('pv.created_at >= ?');
    sqlParams.push(startDate);
  }
  if (endDate) {
    whereConditions.push('pv.created_at <= ?');
    sqlParams.push(endDate);
  }
  if (keyword) {
    whereConditions.push('(pv.title LIKE ? OR pv.change_summary LIKE ? OR u.username LIKE ?)');
    const kw = `%${keyword}%`;
    sqlParams.push(kw, kw, kw);
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  const totalStmt = db.prepare(`
    SELECT COUNT(*) as total FROM patch_versions pv
    LEFT JOIN users u ON pv.created_by = u.id
    ${whereClause}
  `);
  const { total } = totalStmt.get(...sqlParams);

  const versions = db.prepare(`
    SELECT pv.*, p.title as patch_title, u.username, u.avatar
    FROM patch_versions pv
    LEFT JOIN patches p ON pv.patch_id = p.id
    LEFT JOIN users u ON pv.created_by = u.id
    ${whereClause}
    ORDER BY pv.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...sqlParams, pageSize, offset);

  ctx.body = {
    list: versions,
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(total / pageSize)
  };
};
