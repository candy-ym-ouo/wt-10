const db = require('../db');

exports.submitVerification = async (ctx) => {
  const userId = ctx.state.user.id;
  const {
    real_name,
    id_card,
    phone,
    email,
    experience_years,
    professional_field,
    bio,
    portfolio_url,
    social_links,
    id_card_front,
    id_card_back,
    certificate
  } = ctx.request.body;

  if (!real_name) {
    ctx.status = 400;
    ctx.body = { error: '真实姓名为必填项' };
    return;
  }

  const existing = db.prepare(
    'SELECT id, status FROM creator_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(userId);

  if (existing && existing.status === 'pending') {
    ctx.status = 400;
    ctx.body = { error: '您已有待审核的认证申请，请耐心等待' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO creator_verifications (
      user_id, real_name, id_card, phone, email, experience_years,
      professional_field, bio, portfolio_url, social_links,
      id_card_front, id_card_back, certificate, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);

  const result = stmt.run(
    userId,
    real_name,
    id_card || '',
    phone || '',
    email || ctx.state.user.email || '',
    experience_years || 0,
    professional_field || '',
    bio || '',
    portfolio_url || '',
    JSON.stringify(social_links || []),
    id_card_front || '',
    id_card_back || '',
    certificate || ''
  );

  const verification = db.prepare('SELECT * FROM creator_verifications WHERE id = ?').get(result.lastInsertRowid);
  verification.social_links = verification.social_links ? JSON.parse(verification.social_links) : [];

  const notifyStmt = db.prepare(`
    INSERT INTO notifications (user_id, type, content, created_at)
    VALUES (?, 'verification_submitted', ?, CURRENT_TIMESTAMP)
  `);
  notifyStmt.run(userId, '您的创作者认证申请已提交，请耐心等待审核');

  ctx.body = { success: true, verification };
};

exports.getMyVerificationStatus = async (ctx) => {
  const userId = ctx.state.user.id;

  const verification = db.prepare(`
    SELECT cv.*, u.username, u.avatar
    FROM creator_verifications cv
    LEFT JOIN users u ON u.id = cv.user_id
    WHERE cv.user_id = ?
    ORDER BY cv.created_at DESC
    LIMIT 1
  `).get(userId);

  if (verification) {
    verification.social_links = verification.social_links ? JSON.parse(verification.social_links) : [];
  }

  const user = db.prepare(
    'SELECT is_creator_verified, creator_verified_at FROM users WHERE id = ?'
  ).get(userId);

  ctx.body = {
    verification,
    is_verified: !!user?.is_creator_verified,
    verified_at: user?.creator_verified_at || null
  };
};

exports.getVerificationHistory = async (ctx) => {
  const userId = ctx.state.user.id;

  const records = db.prepare(`
    SELECT * FROM creator_verifications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  records.forEach(r => {
    r.social_links = r.social_links ? JSON.parse(r.social_links) : [];
  });

  ctx.body = records;
};

exports.adminGetVerifications = async (ctx) => {
  const { page = 1, limit = 20, status, search } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (status && status !== 'all') {
    where.push('cv.status = ?');
    params.push(status);
  }

  if (search) {
    where.push('(u.username LIKE ? OR cv.real_name LIKE ? OR cv.email LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const verifications = db.prepare(`
    SELECT cv.*, u.username, u.avatar, u.email as user_email
    FROM creator_verifications cv
    JOIN users u ON cv.user_id = u.id
    ${whereSql}
    ORDER BY cv.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  verifications.forEach(v => {
    v.social_links = v.social_links ? JSON.parse(v.social_links) : [];
  });

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM creator_verifications cv
    JOIN users u ON cv.user_id = u.id
    ${whereSql}
  `).get(...params);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM creator_verifications
  `).get();

  ctx.body = {
    list: verifications,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit),
    stats
  };
};

exports.adminReviewVerification = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const adminId = ctx.state.user.id;
  const { status, review_note } = ctx.request.body;

  if (!['approved', 'rejected'].includes(status)) {
    ctx.status = 400;
    ctx.body = { error: '无效的审核状态' };
    return;
  }

  const verification = db.prepare('SELECT * FROM creator_verifications WHERE id = ?').get(id);
  if (!verification) {
    ctx.status = 404;
    ctx.body = { error: '认证申请不存在' };
    return;
  }

  if (verification.status !== 'pending') {
    ctx.status = 400;
    ctx.body = { error: '该申请已被审核' };
    return;
  }

  const stmt = db.prepare(`
    UPDATE creator_verifications
    SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(status, review_note || '', adminId, id);

  if (status === 'approved') {
    db.prepare(`
      UPDATE users
      SET is_creator_verified = 1, creator_verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(verification.user_id);
  }

  const notifyStmt = db.prepare(`
    INSERT INTO notifications (user_id, type, content, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
  notifyStmt.run(
    verification.user_id,
    status === 'approved' ? 'verification_approved' : 'verification_rejected',
    status === 'approved'
      ? `恭喜！您的创作者认证已通过${review_note ? '：' + review_note : ''}`
      : `很抱歉，您的创作者认证未通过${review_note ? '：' + review_note : ''}`
  );

  const updated = db.prepare('SELECT * FROM creator_verifications WHERE id = ?').get(id);
  updated.social_links = updated.social_links ? JSON.parse(updated.social_links) : [];

  ctx.body = { success: true, verification: updated };
};

exports.adminGetVerificationDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);

  const verification = db.prepare(`
    SELECT cv.*, u.username, u.avatar, u.email as user_email, u.created_at as user_registered_at,
           reviewer.username as reviewer_name
    FROM creator_verifications cv
    JOIN users u ON cv.user_id = u.id
    LEFT JOIN users reviewer ON cv.reviewed_by = reviewer.id
    WHERE cv.id = ?
  `).get(id);

  if (!verification) {
    ctx.status = 404;
    ctx.body = { error: '认证申请不存在' };
    return;
  }

  verification.social_links = verification.social_links ? JSON.parse(verification.social_links) : [];

  const patchStats = db.prepare(`
    SELECT
      COUNT(*) as total_patches,
      SUM(likes_count) as total_likes,
      SUM(views_count) as total_views,
      SUM(favorites_count) as total_favorites
    FROM patches WHERE user_id = ?
  `).get(verification.user_id);

  ctx.body = { verification, patchStats };
};

exports.getUserVerificationBadge = async (ctx) => {
  const userId = parseInt(ctx.params.id);

  const user = db.prepare(
    'SELECT id, username, is_creator_verified, creator_verified_at FROM users WHERE id = ?'
  ).get(userId);

  if (!user) {
    ctx.status = 404;
    ctx.body = { error: '用户不存在' };
    return;
  }

  ctx.body = {
    user_id: user.id,
    username: user.username,
    is_verified: !!user.is_creator_verified,
    verified_at: user.creator_verified_at
  };
};
