const db = require('../db');

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

const createNotification = (userId, type, fromUserId, articleId, content, options = {}) => {
  try {
    const category = options.category || typeToCategory[type] || type || 'system';

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
    `).run(userId, type, category, fromUserId, articleId, content, linkUrl, extraData);
  } catch (e) {
    console.error('创建通知失败:', e);
  }
};

exports.getArticles = async (ctx) => {
  const { page = 1, limit = 12, search, tag, user_id, sort = 'newest' } = ctx.query;
  const offset = (page - 1) * limit;
  const currentUserId = ctx.state.user?.id || 0;
  const targetUserId = user_id ? parseInt(user_id) : 0;
  const isViewingOwn = targetUserId > 0 && targetUserId === currentUserId;
  const isAdmin = ctx.state.user?.role === 'admin';

  let where = [];
  let params = [];

  if (isViewingOwn || isAdmin) {
    if (isAdmin && !isViewingOwn) {
      where.push("(a.status = 'approved' OR a.status = 'pending' OR a.status = 'rejected')");
      where.push('(a.is_public = 1 OR a.is_public = 0)');
    }
  } else {
    where.push('a.is_public = 1');
    where.push("a.status = 'approved'");
  }

  if (search) {
    where.push('(a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (tag) {
    where.push('a.tags LIKE ?');
    params.push(`%${tag}%`);
  }
  if (user_id) {
    where.push('a.user_id = ?');
    params.push(parseInt(user_id));
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  let orderSql = 'ORDER BY a.created_at DESC';
  if (sort === 'popular') orderSql = 'ORDER BY a.views_count DESC, a.likes_count DESC';
  if (sort === 'likes') orderSql = 'ORDER BY a.likes_count DESC';
  if (sort === 'comments') orderSql = 'ORDER BY a.comments_count DESC';

  const userId = currentUserId;

  const articles = db.prepare(`
    SELECT a.*, u.username, u.avatar, u.is_creator_verified, u.creator_verified_at,
           COUNT(al.id) as real_likes,
           EXISTS(SELECT 1 FROM article_likes WHERE user_id = ? AND article_id = a.id) as is_liked,
           EXISTS(SELECT 1 FROM article_favorites WHERE user_id = ? AND article_id = a.id) as is_favorited
    FROM articles a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN article_likes al ON a.id = al.article_id
    ${whereSql}
    GROUP BY a.id
    ${orderSql}
    LIMIT ? OFFSET ?
  `).all(userId, userId, ...params, limit, offset);

  articles.forEach(a => {
    if (a.content && a.content.length > 200) {
      a.content = a.content.substring(0, 200) + '...';
    }
  });

  const total = db.prepare(`SELECT COUNT(*) as count FROM articles a ${whereSql}`).get(...params);

  ctx.body = {
    list: articles,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getArticleDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const userId = ctx.state.user?.id || 0;

  const article = db.prepare(`
    SELECT a.*, u.username, u.avatar, u.is_creator_verified, u.creator_verified_at,
           COUNT(al.id) as real_likes,
           EXISTS(SELECT 1 FROM article_likes WHERE user_id = ? AND article_id = a.id) as is_liked,
           EXISTS(SELECT 1 FROM article_favorites WHERE user_id = ? AND article_id = a.id) as is_favorited
    FROM articles a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN article_likes al ON a.id = al.article_id
    WHERE a.id = ?
    GROUP BY a.id
  `).get(userId, userId, id);

  if (!article) {
    ctx.status = 404;
    ctx.body = { error: '文章不存在' };
    return;
  }

  const isAuthor = article.user_id === userId;
  const isAdmin = ctx.state.user?.role === 'admin';

  if (article.is_public === 0 && !isAuthor && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '该文章为私密文章' };
    return;
  }

  if (article.status !== 'approved' && !isAuthor && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '文章尚未审核通过' };
    return;
  }

  db.prepare('UPDATE articles SET views_count = views_count + 1 WHERE id = ?').run(id);

  const moduleRefs = db.prepare(`
    SELECT amr.*, m.name as module_name, m.image as module_image, m.type as module_type,
           mf.name as manufacturer_name
    FROM article_module_refs amr
    JOIN modules m ON amr.module_id = m.id
    LEFT JOIN manufacturers mf ON m.manufacturer_id = mf.id
    WHERE amr.article_id = ?
    ORDER BY amr.sort_order ASC
  `).all(id);

  const commentsRaw = db.prepare(`
    SELECT ac.*, u.username, u.avatar,
           EXISTS(SELECT 1 FROM article_comment_likes WHERE user_id = ? AND comment_id = ac.id) as is_liked,
           ru.username as reply_to_username
    FROM article_comments ac
    JOIN users u ON ac.user_id = u.id
    LEFT JOIN users ru ON ac.reply_to_user_id = ru.id
    WHERE ac.article_id = ? AND ac.status = 'approved'
    ORDER BY ac.created_at DESC
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

  ctx.body = { ...article, module_refs: moduleRefs, comments: topLevelComments };
};

exports.createArticle = async (ctx) => {
  const {
    title, summary, content, cover_image, tags,
    module_refs = [], is_public = true
  } = ctx.request.body;

  if (!title || !content) {
    ctx.status = 400;
    ctx.body = { error: '请填写标题和内容' };
    return;
  }

  const userId = ctx.state.user.id;
  const isPublic = is_public ? 1 : 0;

  const stmt = db.prepare(`
    INSERT INTO articles (title, summary, content, cover_image, user_id, tags, is_public)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    title, summary || null, content, cover_image || null,
    userId, JSON.stringify(tags || []), isPublic
  );

  const articleId = result.lastInsertRowid;

  if (module_refs && module_refs.length > 0) {
    const refStmt = db.prepare(`
      INSERT OR IGNORE INTO article_module_refs (article_id, module_id, sort_order, note)
      VALUES (?, ?, ?, ?)
    `);
    module_refs.forEach((ref, index) => {
      refStmt.run(articleId, parseInt(ref.module_id || ref.id), index, ref.note || '');
    });
  }

  if (isPublic) {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
    const followers = db.prepare(`
      SELECT follower_id FROM follows WHERE following_id = ?
    `).all(userId);
    
    followers.forEach(follower => {
      createNotification(
        follower.follower_id,
        'new_patch',
        userId,
        articleId,
        `${user.username} 发布了新专栏文章：${title}`,
        { linkUrl: `/articles/${articleId}` }
      );
    });
  }

  ctx.body = {
    id: articleId,
    message: '创建成功，等待审核'
  };
};

exports.updateArticle = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);

  if (!article) {
    ctx.status = 404;
    ctx.body = { error: '文章不存在' };
    return;
  }

  if (article.user_id !== ctx.state.user.id && ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '无权限修改' };
    return;
  }

  const {
    title, summary, content, cover_image, tags,
    module_refs, is_public
  } = ctx.request.body;

  const stmt = db.prepare(`
    UPDATE articles SET
      title = COALESCE(?, title),
      summary = COALESCE(?, summary),
      content = COALESCE(?, content),
      cover_image = COALESCE(?, cover_image),
      tags = COALESCE(?, tags),
      is_public = COALESCE(?, is_public),
      status = CASE WHEN ? = 1 THEN 'pending' ELSE status END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const isPublic = is_public !== undefined ? (is_public ? 1 : 0) : null;

  stmt.run(
    title, summary, content, cover_image,
    tags ? JSON.stringify(tags) : null,
    isPublic,
    isPublic === 1 ? 1 : 0,
    id
  );

  if (module_refs !== undefined) {
    db.prepare('DELETE FROM article_module_refs WHERE article_id = ?').run(id);
    if (module_refs.length > 0) {
      const refStmt = db.prepare(`
        INSERT INTO article_module_refs (article_id, module_id, sort_order, note)
        VALUES (?, ?, ?, ?)
      `);
      module_refs.forEach((ref, index) => {
        refStmt.run(id, parseInt(ref.module_id || ref.id), index, ref.note || '');
      });
    }
  }

  ctx.body = { success: true, message: '更新成功，等待重新审核' };
};

exports.deleteArticle = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);

  if (!article) {
    ctx.status = 404;
    ctx.body = { error: '文章不存在' };
    return;
  }

  if (article.user_id !== ctx.state.user.id && ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '无权限删除' };
    return;
  }

  db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.toggleLike = async (ctx) => {
  const articleId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId);
  if (!article) {
    ctx.status = 404;
    ctx.body = { error: '文章不存在' };
    return;
  }

  const isAuthor = article.user_id === userId;
  const isAdmin = ctx.state.user?.role === 'admin';

  if (article.is_public === 0 && !isAuthor && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '该文章为私密文章' };
    return;
  }

  if (article.status !== 'approved' && !isAuthor && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '文章尚未审核通过' };
    return;
  }

  const existing = db.prepare('SELECT * FROM article_likes WHERE user_id = ? AND article_id = ?').get(userId, articleId);

  if (existing) {
    db.prepare('DELETE FROM article_likes WHERE id = ?').run(existing.id);
    db.prepare('UPDATE articles SET likes_count = likes_count - 1 WHERE id = ?').run(articleId);
    const count = db.prepare('SELECT likes_count FROM articles WHERE id = ?').get(articleId).likes_count;
    ctx.body = { liked: false, likes_count: Math.max(0, count) };
  } else {
    db.prepare('INSERT INTO article_likes (user_id, article_id) VALUES (?, ?)').run(userId, articleId);
    db.prepare('UPDATE articles SET likes_count = likes_count + 1 WHERE id = ?').run(articleId);
    const count = db.prepare('SELECT likes_count FROM articles WHERE id = ?').get(articleId).likes_count;
    
    if (article.user_id !== userId) {
      const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
      createNotification(
        article.user_id,
        'like',
        userId,
        articleId,
        `${user?.username || '用户'} 点赞了你的文章 "${article.title}"`,
        { category: 'like', linkUrl: `/articles/${articleId}` }
      );
    }
    
    ctx.body = { liked: true, likes_count: count };
  }
};

exports.toggleFavorite = async (ctx) => {
  const articleId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { folder = 'default' } = ctx.request.body;

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(articleId);
  if (!article) {
    ctx.status = 404;
    ctx.body = { error: '文章不存在' };
    return;
  }

  const isAuthor = article.user_id === userId;
  const isAdmin = ctx.state.user?.role === 'admin';

  if (article.is_public === 0 && !isAuthor && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '该文章为私密文章' };
    return;
  }

  if (article.status !== 'approved' && !isAuthor && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '文章尚未审核通过' };
    return;
  }

  const existing = db.prepare('SELECT * FROM article_favorites WHERE user_id = ? AND article_id = ?').get(userId, articleId);

  if (existing) {
    db.prepare('DELETE FROM article_favorites WHERE id = ?').run(existing.id);
    db.prepare('UPDATE articles SET favorites_count = favorites_count - 1 WHERE id = ?').run(articleId);
    ctx.body = { favorited: false };
  } else {
    db.prepare('INSERT INTO article_favorites (user_id, article_id, folder) VALUES (?, ?, ?)').run(userId, articleId, folder);
    db.prepare('UPDATE articles SET favorites_count = favorites_count + 1 WHERE id = ?').run(articleId);
    ctx.body = { favorited: true };
  }
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

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!article) {
    ctx.status = 404;
    ctx.body = { error: '文章不存在' };
    return;
  }

  const isAuthor = article.user_id === userId;
  const isAdmin = ctx.state.user?.role === 'admin';

  if (article.is_public === 0 && !isAuthor && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '该文章为私密文章' };
    return;
  }

  if (article.status !== 'approved' && !isAuthor && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '文章尚未审核通过' };
    return;
  }

  let parentComment = null;
  let replyToUser = null;
  let rootCommentId = null;

  if (parent_id) {
    parentComment = db.prepare('SELECT * FROM article_comments WHERE id = ? AND article_id = ?').get(parent_id, id);
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
    INSERT INTO article_comments (article_id, user_id, content, parent_id, reply_to_user_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    id, 
    userId, 
    content,
    rootCommentId || null,
    replyToUser?.id || null
  );

  db.prepare('UPDATE articles SET comments_count = comments_count + 1 WHERE id = ?').run(id);

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
  const truncatedContent = content.length > 30 ? content.substring(0, 30) + '...' : content;

  if (article.user_id !== userId && !parent_id) {
    createNotification(
      article.user_id,
      'comment',
      userId,
      id,
      `${user?.username || '用户'} 评论了你的文章 "${article.title}": "${truncatedContent}"`,
      { category: 'comment', linkUrl: `/articles/${id}#comment-${result.lastInsertRowid}` }
    );
  }

  if (replyToUser && replyToUser.id !== userId && replyToUser.id !== article.user_id) {
    createNotification(
      replyToUser.id,
      'comment_reply',
      userId,
      id,
      `${user?.username || '用户'} 回复了你的评论: "${truncatedContent}"`,
      {
        category: 'comment',
        linkUrl: `/articles/${id}#comment-${result.lastInsertRowid}`,
        extraData: { comment_id: result.lastInsertRowid, parent_id: rootCommentId }
      }
    );
  }

  const comment = db.prepare(`
    SELECT ac.*, u.username, u.avatar,
           ru.username as reply_to_username,
           0 as is_liked,
           0 as likes_count
    FROM article_comments ac
    JOIN users u ON ac.user_id = u.id
    LEFT JOIN users ru ON ac.reply_to_user_id = ru.id
    WHERE ac.id = ?
  `).get(result.lastInsertRowid);

  comment.replies = [];
  ctx.body = comment;
};

exports.deleteComment = async (ctx) => {
  const commentId = parseInt(ctx.params.commentId);
  const comment = db.prepare('SELECT * FROM article_comments WHERE id = ?').get(commentId);

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

  db.prepare('DELETE FROM article_comments WHERE id = ?').run(commentId);
  db.prepare('UPDATE articles SET comments_count = comments_count - 1 WHERE id = ?').run(comment.article_id);
  ctx.body = { success: true };
};

exports.toggleCommentLike = async (ctx) => {
  const commentId = parseInt(ctx.params.commentId);
  const userId = ctx.state.user.id;

  const comment = db.prepare('SELECT * FROM article_comments WHERE id = ?').get(commentId);
  if (!comment) {
    ctx.status = 404;
    ctx.body = { error: '评论不存在' };
    return;
  }

  const existing = db.prepare('SELECT * FROM article_comment_likes WHERE user_id = ? AND comment_id = ?').get(userId, commentId);

  if (existing) {
    db.prepare('DELETE FROM article_comment_likes WHERE id = ?').run(existing.id);
    db.prepare('UPDATE article_comments SET likes_count = likes_count - 1 WHERE id = ?').run(commentId);
    const likesCount = Math.max(0, db.prepare('SELECT likes_count FROM article_comments WHERE id = ?').get(commentId).likes_count);
    ctx.body = { liked: false, likes_count: likesCount };
  } else {
    db.prepare('INSERT INTO article_comment_likes (user_id, comment_id) VALUES (?, ?)').run(userId, commentId);
    db.prepare('UPDATE article_comments SET likes_count = likes_count + 1 WHERE id = ?').run(commentId);
    const likesCount = db.prepare('SELECT likes_count FROM article_comments WHERE id = ?').get(commentId).likes_count;
    
    if (comment.user_id !== userId) {
      const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
      const article = db.prepare('SELECT title FROM articles WHERE id = ?').get(comment.article_id);
      createNotification(
        comment.user_id,
        'comment_like',
        userId,
        comment.article_id,
        `${user?.username || '用户'} 赞了你的评论`,
        {
          category: 'like',
          linkUrl: `/articles/${comment.article_id}#comment-${commentId}`,
          extraData: { comment_id: commentId }
        }
      );
    }
    
    ctx.body = { liked: true, likes_count: likesCount };
  }
};

exports.getMyArticles = async (ctx) => {
  const { page = 1, limit = 12, status } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user.id;

  let where = 'a.user_id = ?';
  let params = [userId];

  if (status) {
    where += ' AND a.status = ?';
    params.push(status);
  }

  const articles = db.prepare(`
    SELECT a.*, COUNT(al.id) as real_likes
    FROM articles a
    LEFT JOIN article_likes al ON a.id = al.article_id
    WHERE ${where}
    GROUP BY a.id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM articles a WHERE ${where}`).get(...params);

  ctx.body = {
    list: articles,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getModuleRefs = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const userId = ctx.state.user?.id || 0;

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!article) {
    ctx.status = 404;
    ctx.body = { error: '文章不存在' };
    return;
  }

  const isAuthor = article.user_id === userId;
  const isAdmin = ctx.state.user?.role === 'admin';

  if (article.is_public === 0 && !isAuthor && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '该文章为私密文章' };
    return;
  }

  if (article.status !== 'approved' && !isAuthor && !isAdmin) {
    ctx.status = 403;
    ctx.body = { error: '文章尚未审核通过' };
    return;
  }

  const refs = db.prepare(`
    SELECT amr.*, m.name as module_name, m.image as module_image, m.type as module_type,
           mf.name as manufacturer_name
    FROM article_module_refs amr
    JOIN modules m ON amr.module_id = m.id
    LEFT JOIN manufacturers mf ON m.manufacturer_id = mf.id
    WHERE amr.article_id = ?
    ORDER BY amr.sort_order ASC
  `).all(id);

  ctx.body = refs;
};

exports.adminGetArticles = async (ctx) => {
  const { page = 1, limit = 20, search, status, user_id, sort = 'newest' } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['1=1'];
  let params = [];

  if (search) {
    where.push('(a.title LIKE ? OR a.summary LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where.push('a.status = ?');
    params.push(status);
  }
  if (user_id) {
    where.push('a.user_id = ?');
    params.push(parseInt(user_id));
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  let orderSql = 'ORDER BY a.created_at DESC';
  if (sort === 'oldest') orderSql = 'ORDER BY a.created_at ASC';

  const articles = db.prepare(`
    SELECT a.*, u.username, u.avatar
    FROM articles a
    JOIN users u ON a.user_id = u.id
    ${whereSql}
    GROUP BY a.id
    ${orderSql}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM articles a ${whereSql}`).get(...params);

  ctx.body = {
    list: articles,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.adminGetArticleDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);

  const article = db.prepare(`
    SELECT a.*, u.username, u.avatar
    FROM articles a
    JOIN users u ON a.user_id = u.id
    WHERE a.id = ?
  `).get(id);

  if (!article) {
    ctx.status = 404;
    ctx.body = { error: '文章不存在' };
    return;
  }

  const moduleRefs = db.prepare(`
    SELECT amr.*, m.name as module_name, m.image as module_image
    FROM article_module_refs amr
    JOIN modules m ON amr.module_id = m.id
    WHERE amr.article_id = ?
    ORDER BY amr.sort_order ASC
  `).all(id);

  ctx.body = { ...article, module_refs: moduleRefs };
};

exports.adminReviewArticle = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { status, review_note } = ctx.request.body;
  const adminId = ctx.state.user.id;

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!article) {
    ctx.status = 404;
    ctx.body = { error: '文章不存在' };
    return;
  }

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    ctx.status = 400;
    ctx.body = { error: '无效的审核状态' };
    return;
  }

  db.prepare(`
    UPDATE articles SET
      status = ?,
      review_note = ?,
      reviewed_by = ?,
      reviewed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, review_note || null, adminId, id);

  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(adminId);
  createNotification(
    article.user_id,
    'review',
    adminId,
    id,
    `你的文章 "${article.title}" 已${status === 'approved' ? '审核通过' : status === 'rejected' ? '被驳回' : '重新进入审核'}`,
    { category: 'review', linkUrl: `/articles/${id}` }
  );

  ctx.body = { success: true, message: '审核完成' };
};

exports.adminDeleteArticle = async (ctx) => {
  const id = parseInt(ctx.params.id);

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!article) {
    ctx.status = 404;
    ctx.body = { error: '文章不存在' };
    return;
  }

  db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.adminToggleArticlePublic = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { is_public } = ctx.request.body;

  db.prepare('UPDATE articles SET is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    is_public ? 1 : 0, id
  );

  ctx.body = { success: true };
};
