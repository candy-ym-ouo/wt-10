const db = require('../db');

exports.getActivities = async (ctx) => {
  const { page = 1, limit = 12, type, status } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['status != ?'];
  let params = ['draft'];

  if (type) {
    where.push('type = ?');
    params.push(type);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const activities = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM activity_registrations ar WHERE ar.activity_id = a.id) as registration_count,
      (SELECT COUNT(*) FROM activity_submissions asub WHERE asub.activity_id = a.id AND asub.status = 'approved') as submission_count
    FROM activities a
    ${whereSql}
    ORDER BY a.sort_order ASC, a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM activities a ${whereSql}`).get(...params);

  ctx.body = {
    list: activities,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getActivityDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);

  const activity = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM activity_registrations ar WHERE ar.activity_id = a.id) as registration_count,
      (SELECT COUNT(*) FROM activity_submissions asub WHERE asub.activity_id = a.id AND asub.status = 'approved') as submission_count
    FROM activities a
    WHERE a.id = ?
  `).get(id);

  if (!activity) {
    ctx.status = 404;
    ctx.body = { error: '活动不存在' };
    return;
  }

  if (activity.status === 'draft' && (!ctx.state.user || ctx.state.user.role !== 'admin')) {
    ctx.status = 404;
    ctx.body = { error: '活动不存在' };
    return;
  }

  if (ctx.state.user) {
    const registration = db.prepare(`
      SELECT * FROM activity_registrations
      WHERE activity_id = ? AND user_id = ?
    `).get(id, ctx.state.user.id);
    activity.is_registered = !!registration;
    activity.registration_status = registration?.status;

    const submission = db.prepare(`
      SELECT * FROM activity_submissions
      WHERE activity_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(id, ctx.state.user.id);
    activity.my_submission = submission;
  }

  ctx.body = activity;
};

exports.registerActivity = async (ctx) => {
  const activityId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { extra_data } = ctx.request.body;

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  if (!activity) {
    ctx.status = 404;
    ctx.body = { error: '活动不存在' };
    return;
  }

  if (activity.status !== 'published') {
    ctx.status = 400;
    ctx.body = { error: '活动未开始' };
    return;
  }

  const now = new Date();
  if (activity.registration_start && new Date(activity.registration_start) > now) {
    ctx.status = 400;
    ctx.body = { error: '报名尚未开始' };
    return;
  }
  if (activity.registration_end && new Date(activity.registration_end) < now) {
    ctx.status = 400;
    ctx.body = { error: '报名已结束' };
    return;
  }

  if (activity.max_registrations > 0) {
    const count = db.prepare('SELECT COUNT(*) as count FROM activity_registrations WHERE activity_id = ?').get(activityId).count;
    if (count >= activity.max_registrations) {
      ctx.status = 400;
      ctx.body = { error: '报名人数已满' };
      return;
    }
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO activity_registrations (activity_id, user_id, extra_data)
      VALUES (?, ?, ?)
    `);
    stmt.run(activityId, userId, extra_data ? JSON.stringify(extra_data) : null);

    const notifStmt = db.prepare(`
      INSERT INTO notifications (user_id, type, content)
      VALUES (?, 'activity_registration', ?)
    `);
    notifStmt.run(userId, `您已成功报名"${activity.title}"活动`);

    ctx.body = { success: true };
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      ctx.status = 400;
      ctx.body = { error: '您已报名此活动' };
    } else {
      throw err;
    }
  }
};

exports.cancelRegistration = async (ctx) => {
  const activityId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  db.prepare(`
    DELETE FROM activity_registrations
    WHERE activity_id = ? AND user_id = ?
  `).run(activityId, userId);

  ctx.body = { success: true };
};

exports.submitWork = async (ctx) => {
  const activityId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { patch_id, title, description, content, attachment_url } = ctx.request.body;

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  if (!activity) {
    ctx.status = 404;
    ctx.body = { error: '活动不存在' };
    return;
  }

  if (activity.allow_submission !== 1) {
    ctx.status = 400;
    ctx.body = { error: '此活动不接受投稿' };
    return;
  }

  const now = new Date();
  if (activity.submission_start && new Date(activity.submission_start) > now) {
    ctx.status = 400;
    ctx.body = { error: '投稿尚未开始' };
    return;
  }
  if (activity.submission_end && new Date(activity.submission_end) < now) {
    ctx.status = 400;
    ctx.body = { error: '投稿已结束' };
    return;
  }

  const isRegistered = db.prepare(`
    SELECT 1 FROM activity_registrations
    WHERE activity_id = ? AND user_id = ? AND status = 'approved'
  `).get(activityId, userId);

  if (!isRegistered) {
    ctx.status = 400;
    ctx.body = { error: '请先报名此活动' };
    return;
  }

  if (!title) {
    ctx.status = 400;
    ctx.body = { error: '请填写作品标题' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO activity_submissions (activity_id, user_id, patch_id, title, description, content, attachment_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    activityId, userId, patch_id || null, title, description || '', content || '', attachment_url || null
  );

  const notifStmt = db.prepare(`
    INSERT INTO notifications (user_id, type, content)
    VALUES (?, 'activity_submission', ?)
  `);
  notifStmt.run(userId, `您的作品"${title}"已成功提交至"${activity.title}"，等待审核`);

  ctx.body = { success: true, id: result.lastInsertRowid };
};

exports.getActivitySubmissions = async (ctx) => {
  const activityId = parseInt(ctx.params.id);
  const { page = 1, limit = 20, status } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['activity_id = ?'];
  let params = [activityId];

  if (status) {
    where.push('status = ?');
    params.push(status);
  } else {
    where.push("status = 'approved'");
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const submissions = db.prepare(`
    SELECT s.*, u.username, u.avatar, p.title as patch_title
    FROM activity_submissions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN patches p ON s.patch_id = p.id
    ${whereSql}
    ORDER BY COALESCE(s.rank, 9999) ASC, s.score DESC, s.votes_count DESC, s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM activity_submissions ${whereSql}`).get(...params);

  ctx.body = {
    list: submissions,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getMyRegistrations = async (ctx) => {
  const userId = ctx.state.user.id;
  const { page = 1, limit = 12 } = ctx.query;
  const offset = (page - 1) * limit;

  const registrations = db.prepare(`
    SELECT ar.*, a.title, a.cover_url, a.description, a.start_date, a.end_date, a.status as activity_status
    FROM activity_registrations ar
    JOIN activities a ON ar.activity_id = a.id
    WHERE ar.user_id = ?
    ORDER BY ar.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM activity_registrations WHERE user_id = ?
  `).get(userId);

  ctx.body = {
    list: registrations,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getMySubmissions = async (ctx) => {
  const userId = ctx.state.user.id;
  const { page = 1, limit = 12 } = ctx.query;
  const offset = (page - 1) * limit;

  const submissions = db.prepare(`
    SELECT s.*, a.title as activity_title, a.cover_url
    FROM activity_submissions s
    JOIN activities a ON s.activity_id = a.id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM activity_submissions WHERE user_id = ?
  `).get(userId);

  ctx.body = {
    list: submissions,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.voteSubmission = async (ctx) => {
  const submissionId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;

  const submission = db.prepare('SELECT * FROM activity_submissions WHERE id = ?').get(submissionId);
  if (!submission) {
    ctx.status = 404;
    ctx.body = { error: '作品不存在' };
    return;
  }

  if (submission.user_id === userId) {
    ctx.status = 400;
    ctx.body = { error: '不能给自己的作品投票' };
    return;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO activity_votes (submission_id, user_id)
      VALUES (?, ?)
    `);
    stmt.run(submissionId, userId);

    db.prepare(`
      UPDATE activity_submissions
      SET votes_count = votes_count + 1, score = score + 1
      WHERE id = ?
    `).run(submissionId);

    ctx.body = { success: true, votes_count: submission.votes_count + 1 };
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      db.prepare(`
        DELETE FROM activity_votes
        WHERE submission_id = ? AND user_id = ?
      `).run(submissionId, userId);

      db.prepare(`
        UPDATE activity_submissions
        SET votes_count = votes_count - 1, score = score - 1
        WHERE id = ?
      `).run(submissionId);

      ctx.body = { success: true, votes_count: submission.votes_count - 1, canceled: true };
    } else {
      throw err;
    }
  }
};

exports.getSubmissionDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);

  const submission = db.prepare(`
    SELECT s.*, u.username, u.avatar, a.title as activity_title, a.cover_url, p.title as patch_title
    FROM activity_submissions s
    JOIN users u ON s.user_id = u.id
    JOIN activities a ON s.activity_id = a.id
    LEFT JOIN patches p ON s.patch_id = p.id
    WHERE s.id = ?
  `).get(id);

  if (!submission) {
    ctx.status = 404;
    ctx.body = { error: '作品不存在' };
    return;
  }

  if (ctx.state.user) {
    const voted = db.prepare(`
      SELECT 1 FROM activity_votes
      WHERE submission_id = ? AND user_id = ?
    `).get(id, ctx.state.user.id);
    submission.has_voted = !!voted;
  }

  ctx.body = submission;
};

exports.adminGetActivities = async (ctx) => {
  const { page = 1, limit = 20, search, status, type } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (search) {
    where.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (type) {
    where.push('type = ?');
    params.push(type);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const activities = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM activity_registrations ar WHERE ar.activity_id = a.id) as registration_count,
      (SELECT COUNT(*) FROM activity_submissions asub WHERE asub.activity_id = a.id) as submission_count
    FROM activities a
    ${whereSql}
    ORDER BY a.sort_order ASC, a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM activities a ${whereSql}`).get(...params);

  ctx.body = {
    list: activities,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.adminCreateActivity = async (ctx) => {
  const {
    title, type, description, cover_url, content, rules, prizes,
    start_date, end_date, registration_start, registration_end,
    submission_start, submission_end, status, max_registrations,
    allow_submission, show_ranking, sort_order
  } = ctx.request.body;

  if (!title) {
    ctx.status = 400;
    ctx.body = { error: '请填写活动标题' };
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO activities (
      title, type, description, cover_url, content, rules, prizes,
      start_date, end_date, registration_start, registration_end,
      submission_start, submission_end, status, max_registrations,
      allow_submission, show_ranking, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    title, type || 'contest', description || '', cover_url || '', content || '',
    rules || '', prizes || '', start_date || null, end_date || null,
    registration_start || null, registration_end || null,
    submission_start || null, submission_end || null,
    status || 'draft', max_registrations || 0,
    allow_submission !== undefined ? allow_submission : 1,
    show_ranking !== undefined ? show_ranking : 1,
    sort_order || 0
  );

  ctx.body = { success: true, id: result.lastInsertRowid };
};

exports.adminUpdateActivity = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const data = ctx.request.body;

  let updates = [];
  let params = [];

  const fields = [
    'title', 'type', 'description', 'cover_url', 'content', 'rules', 'prizes',
    'start_date', 'end_date', 'registration_start', 'registration_end',
    'submission_start', 'submission_end', 'status', 'max_registrations',
    'allow_submission', 'show_ranking', 'sort_order'
  ];

  fields.forEach(field => {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = db.prepare(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);
  }

  ctx.body = { success: true };
};

exports.adminDeleteActivity = async (ctx) => {
  const id = parseInt(ctx.params.id);
  db.prepare('DELETE FROM activities WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.adminGetRegistrations = async (ctx) => {
  const activityId = parseInt(ctx.params.id);
  const { page = 1, limit = 20, status } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['activity_id = ?'];
  let params = [activityId];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const registrations = db.prepare(`
    SELECT ar.*, u.username, u.email, u.avatar
    FROM activity_registrations ar
    JOIN users u ON ar.user_id = u.id
    ${whereSql}
    ORDER BY ar.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM activity_registrations ${whereSql}`).get(...params);

  ctx.body = {
    list: registrations,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.adminUpdateRegistrationStatus = async (ctx) => {
  const registrationId = parseInt(ctx.params.id);
  const { status } = ctx.request.body;

  if (!['pending', 'approved', 'rejected'].includes(status)) {
    ctx.status = 400;
    ctx.body = { error: '无效的状态值' };
    return;
  }

  db.prepare(`
    UPDATE activity_registrations
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, registrationId);

  const registration = db.prepare(`
    SELECT ar.*, a.title
    FROM activity_registrations ar
    JOIN activities a ON ar.activity_id = a.id
    WHERE ar.id = ?
  `).get(registrationId);

  if (registration) {
    const notifStmt = db.prepare(`
      INSERT INTO notifications (user_id, type, content)
      VALUES (?, 'activity_registration', ?)
    `);
    const statusText = status === 'approved' ? '已通过' : status === 'rejected' ? '未通过' : '待审核';
    notifStmt.run(registration.user_id, `您在"${registration.title}"的报名${statusText}`);
  }

  ctx.body = { success: true };
};

exports.adminGetSubmissions = async (ctx) => {
  const activityId = parseInt(ctx.params.id);
  const { page = 1, limit = 20, status } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['activity_id = ?'];
  let params = [activityId];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const submissions = db.prepare(`
    SELECT s.*, u.username, u.email, u.avatar, p.title as patch_title
    FROM activity_submissions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN patches p ON s.patch_id = p.id
    ${whereSql}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM activity_submissions ${whereSql}`).get(...params);

  ctx.body = {
    list: submissions,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.adminReviewSubmission = async (ctx) => {
  const submissionId = parseInt(ctx.params.id);
  const { status, score, rank, review_note } = ctx.request.body;
  const reviewerId = ctx.state.user.id;

  if (status && !['pending', 'approved', 'rejected'].includes(status)) {
    ctx.status = 400;
    ctx.body = { error: '无效的状态值' };
    return;
  }

  let updates = [];
  let params = [];

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (score !== undefined) {
    updates.push('score = ?');
    params.push(score);
  }
  if (rank !== undefined) {
    updates.push('rank = ?');
    params.push(rank);
  }
  if (review_note !== undefined) {
    updates.push('review_note = ?');
    params.push(review_note);
  }

  updates.push('reviewed_at = CURRENT_TIMESTAMP');
  updates.push('reviewed_by = ?');
  params.push(reviewerId);
  params.push(submissionId);

  const stmt = db.prepare(`UPDATE activity_submissions SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...params);

  const submission = db.prepare(`
    SELECT s.*, a.title
    FROM activity_submissions s
    JOIN activities a ON s.activity_id = a.id
    WHERE s.id = ?
  `).get(submissionId);

  if (submission && status) {
    const notifStmt = db.prepare(`
      INSERT INTO notifications (user_id, type, content)
      VALUES (?, 'activity_submission', ?)
    `);
    const statusText = status === 'approved' ? '已通过审核' : status === 'rejected' ? '未通过审核' : '正在审核';
    let content = `您的作品"${submission.title}"在"${submission.title}"活动中${statusText}`;
    if (review_note) {
      content += `，评审意见：${review_note}`;
    }
    notifStmt.run(submission.user_id, content);
  }

  ctx.body = { success: true };
};

exports.adminDeleteSubmission = async (ctx) => {
  const submissionId = parseInt(ctx.params.id);
  db.prepare('DELETE FROM activity_submissions WHERE id = ?').run(submissionId);
  ctx.body = { success: true };
};

exports.getActivityRankings = async (ctx) => {
  const activityId = parseInt(ctx.params.id);
  const { limit = 100 } = ctx.query;

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  if (!activity) {
    ctx.status = 404;
    ctx.body = { error: '活动不存在' };
    return;
  }

  if (activity.show_ranking !== 1) {
    ctx.status = 400;
    ctx.body = { error: '此活动未开启榜单' };
    return;
  }

  const submissions = db.prepare(`
    SELECT s.*, u.username, u.avatar, p.title as patch_title
    FROM activity_submissions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN patches p ON s.patch_id = p.id
    WHERE s.activity_id = ? AND s.status = 'approved'
    ORDER BY COALESCE(s.rank, 9999) ASC, s.score DESC, s.votes_count DESC, s.created_at ASC
    LIMIT ?
  `).all(activityId, limit);

  submissions.forEach((s, i) => {
    if (!s.rank) s.rank = i + 1;
  });

  ctx.body = { rankings: submissions, activity };
};
