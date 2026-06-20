const db = require('../db');

const typeToCategory = {
  'report_submitted': 'system',
  'report_processed': 'system',
  'report_punishment': 'system',
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

const getTargetInfo = (targetType, targetId) => {
  switch (targetType) {
    case 'patch':
      return db.prepare(`
        SELECT p.id, p.title, p.description, p.user_id, p.status, p.created_at,
               u.username as author_name, u.avatar as author_avatar
        FROM patches p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).get(targetId);
    case 'comment':
      return db.prepare(`
        SELECT c.id, c.content, c.user_id, c.patch_id, c.created_at,
               u.username as author_name, u.avatar as author_avatar,
               p.title as patch_title
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN patches p ON c.patch_id = p.id
        WHERE c.id = ?
      `).get(targetId);
    case 'user_profile':
      return db.prepare(`
        SELECT u.id, u.username, u.email, u.avatar, u.bio, u.role, u.created_at
        FROM users u
        WHERE u.id = ?
      `).get(targetId);
    default:
      return null;
  }
};

const validTargetTypes = ['patch', 'comment', 'user_profile'];
const validCategories = [
  'spam', 'inappropriate', 'harassment', 'copyright',
  'fraud', 'violence', 'hate_speech', 'misinformation', 'other'
];

exports.createReport = async (ctx) => {
  const reporterId = ctx.state.user.id;
  const { target_type, target_id, category, reason, description, evidence_urls } = ctx.request.body;

  if (!validTargetTypes.includes(target_type)) {
    ctx.status = 400;
    ctx.body = { error: '无效的举报对象类型' };
    return;
  }

  if (!target_id) {
    ctx.status = 400;
    ctx.body = { error: '举报对象ID不能为空' };
    return;
  }

  if (!validCategories.includes(category)) {
    ctx.status = 400;
    ctx.body = { error: '无效的举报分类' };
    return;
  }

  if (!reason || !reason.trim()) {
    ctx.status = 400;
    ctx.body = { error: '举报理由不能为空' };
    return;
  }

  const targetInfo = getTargetInfo(target_type, target_id);
  if (!targetInfo) {
    ctx.status = 404;
    ctx.body = { error: '举报对象不存在' };
    return;
  }

  const targetUserId = target_type === 'user_profile' ? targetInfo.id : targetInfo.user_id;

  if (targetUserId === reporterId) {
    ctx.status = 400;
    ctx.body = { error: '不能举报自己' };
    return;
  }

  const existingReport = db.prepare(`
    SELECT id FROM content_reports
    WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'
  `).get(reporterId, target_type, target_id);

  if (existingReport) {
    ctx.status = 400;
    ctx.body = { error: '您已举报过该内容，请等待处理' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO content_reports (
      reporter_id, target_type, target_id, target_user_id,
      category, reason, description, evidence_urls, status, priority
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'normal')
  `);

  const result = stmt.run(
    reporterId,
    target_type,
    target_id,
    targetUserId,
    category,
    reason.trim(),
    description || '',
    JSON.stringify(evidence_urls || [])
  );

  const report = db.prepare('SELECT * FROM content_reports WHERE id = ?').get(result.lastInsertRowid);
  report.evidence_urls = report.evidence_urls ? JSON.parse(report.evidence_urls) : [];

  createNotification(
    reporterId,
    'report_submitted',
    null,
    null,
    '您的举报已提交，我们会尽快处理',
    {
      category: 'system',
      extraData: { report_id: report.id, target_type, target_id }
    }
  );

  ctx.body = { success: true, report };
};

exports.getMyReports = async (ctx) => {
  const reporterId = ctx.state.user.id;
  const { page = 1, limit = 20, status } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['reporter_id = ?'];
  let params = [reporterId];

  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const reports = db.prepare(`
    SELECT * FROM content_reports
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  reports.forEach(r => {
    r.evidence_urls = r.evidence_urls ? JSON.parse(r.evidence_urls) : [];
  });

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM content_reports ${whereSql}
  `).get(...params);

  ctx.body = {
    list: reports,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.adminGetReports = async (ctx) => {
  const { page = 1, limit = 20, status, target_type, category, search } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (status && status !== 'all') {
    where.push('cr.status = ?');
    params.push(status);
  }

  if (target_type && target_type !== 'all') {
    where.push('cr.target_type = ?');
    params.push(target_type);
  }

  if (category && category !== 'all') {
    where.push('cr.category = ?');
    params.push(category);
  }

  if (search) {
    where.push('(r.username LIKE ? OR tu.username LIKE ? OR cr.reason LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const reports = db.prepare(`
    SELECT cr.*,
           r.username as reporter_name, r.avatar as reporter_avatar,
           tu.username as target_user_name, tu.avatar as target_user_avatar
    FROM content_reports cr
    JOIN users r ON cr.reporter_id = r.id
    LEFT JOIN users tu ON cr.target_user_id = tu.id
    ${whereSql}
    ORDER BY
      CASE cr.status
        WHEN 'pending' THEN 0
        WHEN 'processing' THEN 1
        ELSE 2
      END,
      cr.priority DESC,
      cr.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  reports.forEach(r => {
    r.evidence_urls = r.evidence_urls ? JSON.parse(r.evidence_urls) : [];
    r.target_info = getTargetInfo(r.target_type, r.target_id);
  });

  const total = db.prepare(`
    SELECT COUNT(*) as count
    FROM content_reports cr
    JOIN users r ON cr.reporter_id = r.id
    LEFT JOIN users tu ON cr.target_user_id = tu.id
    ${whereSql}
  `).get(...params);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM content_reports
  `).get();

  const byType = db.prepare(`
    SELECT target_type, COUNT(*) as count
    FROM content_reports
    GROUP BY target_type
  `).all();

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM content_reports
    GROUP BY category
  `).all();

  ctx.body = {
    list: reports,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit),
    stats,
    by_type: byType,
    by_category: byCategory
  };
};

exports.adminGetReportDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);

  const report = db.prepare(`
    SELECT cr.*,
           r.username as reporter_name, r.avatar as reporter_avatar, r.email as reporter_email,
           tu.username as target_user_name, tu.avatar as target_user_avatar, tu.email as target_user_email,
           h.username as handler_name
    FROM content_reports cr
    JOIN users r ON cr.reporter_id = r.id
    LEFT JOIN users tu ON cr.target_user_id = tu.id
    LEFT JOIN users h ON cr.handler_id = h.id
    WHERE cr.id = ?
  `).get(id);

  if (!report) {
    ctx.status = 404;
    ctx.body = { error: '举报记录不存在' };
    return;
  }

  report.evidence_urls = report.evidence_urls ? JSON.parse(report.evidence_urls) : [];
  report.target_info = getTargetInfo(report.target_type, report.target_id);

  const relatedReports = db.prepare(`
    SELECT cr.*, r.username as reporter_name
    FROM content_reports cr
    JOIN users r ON cr.reporter_id = r.id
    WHERE cr.target_type = ? AND cr.target_id = ? AND cr.id != ?
    ORDER BY cr.created_at DESC
    LIMIT 10
  `).all(report.target_type, report.target_id, id);

  const punishments = db.prepare(`
    SELECT rp.*, h.username as handler_name
    FROM report_punishments rp
    LEFT JOIN users h ON rp.handler_id = h.id
    WHERE rp.report_id = ?
    ORDER BY rp.created_at DESC
  `).all(id);

  const targetUserHistory = [];
  if (report.target_user_id) {
    const userReports = db.prepare(`
      SELECT cr.*, h.username as handler_name
      FROM content_reports cr
      LEFT JOIN users h ON cr.handler_id = h.id
      WHERE cr.target_user_id = ? AND cr.id != ?
      ORDER BY cr.created_at DESC
      LIMIT 10
    `).all(report.target_user_id, id);

    const userPunishments = db.prepare(`
      SELECT * FROM report_punishments
      WHERE target_user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(report.target_user_id);

    targetUserHistory.push(...userReports, ...userPunishments);
  }

  ctx.body = {
    report,
    related_reports: relatedReports,
    punishments,
    target_user_history: targetUserHistory
  };
};

exports.adminHandleReport = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const handlerId = ctx.state.user.id;
  const { status, handle_note, handle_result, punishment } = ctx.request.body;

  if (!['processing', 'resolved', 'rejected'].includes(status)) {
    ctx.status = 400;
    ctx.body = { error: '无效的处理状态' };
    return;
  }

  const report = db.prepare('SELECT * FROM content_reports WHERE id = ?').get(id);
  if (!report) {
    ctx.status = 404;
    ctx.body = { error: '举报记录不存在' };
    return;
  }

  if (report.status === 'resolved' || report.status === 'rejected') {
    ctx.status = 400;
    ctx.body = { error: '该举报已处理完成' };
    return;
  }

  const updateStmt = db.prepare(`
    UPDATE content_reports
    SET status = ?, handle_note = ?, handle_result = ?, handler_id = ?,
        handled_at = CASE WHEN ? IN ('resolved', 'rejected') THEN CURRENT_TIMESTAMP ELSE handled_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  updateStmt.run(status, handle_note || '', handle_result || '', handlerId, status, id);

  if ((status === 'resolved') && punishment && punishment.punishment_type) {
    await applyPunishment(id, report, punishment, handlerId);
  }

  if (status === 'resolved' || status === 'rejected') {
    const resultText = status === 'resolved' ? '已处理' : '已驳回';
    createNotification(
      report.reporter_id,
      'report_processed',
      handlerId,
      null,
      `您的举报${resultText}${handle_note ? '：' + handle_note : ''}`,
      {
        category: 'system',
        extraData: { report_id: id, status, handle_note }
      }
    );
  }

  const updated = db.prepare('SELECT * FROM content_reports WHERE id = ?').get(id);
  updated.evidence_urls = updated.evidence_urls ? JSON.parse(updated.evidence_urls) : [];

  ctx.body = { success: true, report: updated };
};

const applyPunishment = async (reportId, report, punishment, handlerId) => {
  const { punishment_type, punishment_duration, punishment_reason, is_permanent } = punishment;

  let endsAt = null;
  if (punishment_duration && !is_permanent) {
    endsAt = new Date(Date.now() + punishment_duration * 24 * 60 * 60 * 1000).toISOString();
  }

  const stmt = db.prepare(`
    INSERT INTO report_punishments (
      report_id, target_type, target_id, target_user_id,
      punishment_type, punishment_duration, punishment_reason,
      ends_at, is_permanent, handler_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    reportId,
    report.target_type,
    report.target_id,
    report.target_user_id,
    punishment_type,
    punishment_duration || 0,
    punishment_reason || '',
    endsAt,
    is_permanent ? 1 : 0,
    handlerId
  );

  switch (punishment_type) {
    case 'delete_content':
      if (report.target_type === 'patch') {
        db.prepare("UPDATE patches SET status = 'removed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(report.target_id);
      } else if (report.target_type === 'comment') {
        db.prepare('DELETE FROM comments WHERE id = ?').run(report.target_id);
      }
      break;

    case 'warn_user':
      createNotification(
        report.target_user_id,
        'report_punishment',
        handlerId,
        null,
        `警告：您的${getTargetTypeLabel(report.target_type)}因违规被举报处理，请遵守社区规范${punishment_reason ? '：' + punishment_reason : ''}`,
        {
          category: 'system',
          extraData: { report_id: reportId, punishment_type }
        }
      );
      break;

    case 'suspend_user':
      db.prepare(`
        UPDATE users SET role = 'suspended', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(report.target_user_id);
      createNotification(
        report.target_user_id,
        'report_punishment',
        handlerId,
        null,
        `您的账号已被临时封禁${is_permanent ? '' : `（${punishment_duration}天）`}${punishment_reason ? '：' + punishment_reason : ''}`,
        {
          category: 'system',
          extraData: { report_id: reportId, punishment_type, ends_at: endsAt }
        }
      );
      break;

    case 'ban_user':
      db.prepare(`
        UPDATE users SET role = 'banned', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(report.target_user_id);
      createNotification(
        report.target_user_id,
        'report_punishment',
        handlerId,
        null,
        `您的账号已被永久封禁${punishment_reason ? '：' + punishment_reason : ''}`,
        {
          category: 'system',
          extraData: { report_id: reportId, punishment_type }
        }
      );
      break;
  }
};

const getTargetTypeLabel = (type) => {
  const labels = { patch: 'Patch 作品', comment: '评论', user_profile: '用户资料' };
  return labels[type] || type;
};

exports.adminBatchHandleReports = async (ctx) => {
  const handlerId = ctx.state.user.id;
  const { ids, status, handle_note } = ctx.request.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '请选择要处理的举报' };
    return;
  }

  if (!['resolved', 'rejected'].includes(status)) {
    ctx.status = 400;
    ctx.body = { error: '无效的处理状态' };
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  const reports = db.prepare(`
    SELECT * FROM content_reports WHERE id IN (${placeholders}) AND status IN ('pending', 'processing')
  `).all(...ids);

  if (reports.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '没有可处理的举报' };
    return;
  }

  const updateStmt = db.prepare(`
    UPDATE content_reports
    SET status = ?, handle_note = ?, handler_id = ?, handled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const resultText = status === 'resolved' ? '已处理' : '已驳回';
  reports.forEach(report => {
    updateStmt.run(status, handle_note || '', handlerId, report.id);

    createNotification(
      report.reporter_id,
      'report_processed',
      handlerId,
      null,
      `您的举报${resultText}${handle_note ? '：' + handle_note : ''}`,
      {
        category: 'system',
        extraData: { report_id: report.id, status, handle_note }
      }
    );
  });

  ctx.body = { success: true, processed_count: reports.length };
};

exports.getReportCategories = async (ctx) => {
  ctx.body = {
    target_types: validTargetTypes.map(t => ({ value: t, label: getTargetTypeLabel(t) })),
    categories: [
      { value: 'spam', label: '垃圾广告/营销' },
      { value: 'inappropriate', label: '色情/低俗内容' },
      { value: 'harassment', label: '骚扰/人身攻击' },
      { value: 'copyright', label: '侵权/盗版' },
      { value: 'fraud', label: '诈骗/虚假信息' },
      { value: 'violence', label: '暴力/恐怖内容' },
      { value: 'hate_speech', label: '仇恨言论' },
      { value: 'misinformation', label: '不实信息' },
      { value: 'other', label: '其他违规' }
    ],
    punishment_types: [
      { value: 'delete_content', label: '删除违规内容' },
      { value: 'warn_user', label: '警告用户' },
      { value: 'suspend_user', label: '临时封禁账号' },
      { value: 'ban_user', label: '永久封禁账号' }
    ]
  };
};
