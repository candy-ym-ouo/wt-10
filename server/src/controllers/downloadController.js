const db = require('../db');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const RESOURCE_TYPES = ['patch_file', 'preset', 'sample', 'tutorial', 'other'];
const ACCESS_LEVELS = ['public', 'registered', 'verified', 'admin'];
const RISK_LEVELS = ['low', 'medium', 'high'];
const STATUS_TYPES = ['pending', 'approved', 'rejected'];

const checkAccessPermission = (resource, user) => {
  if (!resource) return false;
  if (resource.status !== 'approved') return false;

  switch (resource.access_level) {
    case 'public':
      return true;
    case 'registered':
      return !!user;
    case 'verified':
      return !!user && (user.is_creator_verified === 1 || user.role === 'admin');
    case 'admin':
      return !!user && user.role === 'admin';
    default:
      return true;
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

exports.getResourceList = async (ctx) => {
  const { 
    page = 1, limit = 12, search, resource_type, 
    risk_level, sort = 'newest', patch_id 
  } = ctx.query;
  const offset = (page - 1) * limit;
  const userId = ctx.state.user?.id || 0;

  let where = ['dr.status = ?'];
  let params = ['approved'];

  if (search) {
    where.push('(dr.title LIKE ? OR dr.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (resource_type && RESOURCE_TYPES.includes(resource_type)) {
    where.push('dr.resource_type = ?');
    params.push(resource_type);
  }
  if (risk_level && RISK_LEVELS.includes(risk_level)) {
    where.push('dr.risk_level = ?');
    params.push(risk_level);
  }
  if (patch_id) {
    where.push('dr.patch_id = ?');
    params.push(parseInt(patch_id));
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  let orderSql = 'ORDER BY dr.created_at DESC';
  if (sort === 'popular') orderSql = 'ORDER BY dr.download_count DESC';
  if (sort === 'oldest') orderSql = 'ORDER BY dr.created_at ASC';

  const resources = db.prepare(`
    SELECT dr.*, u.username, u.avatar, u.is_creator_verified,
           p.title as patch_title
    FROM download_resources dr
    JOIN users u ON dr.user_id = u.id
    LEFT JOIN patches p ON dr.patch_id = p.id
    ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM download_resources dr ${whereSql}
  `).get(...params);

  const filteredResources = resources.filter(r => checkAccessPermission(r, ctx.state.user));

  ctx.body = {
    list: filteredResources.map(r => ({
      ...r,
      file_size_formatted: formatFileSize(r.file_size),
      can_download: checkAccessPermission(r, ctx.state.user)
    })),
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getResourceDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const userId = ctx.state.user?.id || 0;

  const resource = db.prepare(`
    SELECT dr.*, u.username, u.avatar, u.is_creator_verified,
           p.title as patch_title
    FROM download_resources dr
    JOIN users u ON dr.user_id = u.id
    LEFT JOIN patches p ON dr.patch_id = p.id
    WHERE dr.id = ?
  `).get(id);

  if (!resource) {
    ctx.status = 404;
    ctx.body = { error: '资源不存在' };
    return;
  }

  if (!checkAccessPermission(resource, ctx.state.user)) {
    if (resource.status !== 'approved') {
      ctx.status = 403;
      ctx.body = { error: '资源未审核通过' };
      return;
    }
    ctx.status = 403;
    ctx.body = { error: '无权限访问该资源' };
    return;
  }

  ctx.body = {
    ...resource,
    file_size_formatted: formatFileSize(resource.file_size),
    can_download: true
  };
};

exports.uploadResource = async (ctx) => {
  const file = ctx.req.file;
  if (!file) {
    ctx.status = 400;
    ctx.body = { error: '请上传文件' };
    return;
  }

  const body = ctx.req.body || ctx.request.body || {};
  const {
    title, description, resource_type = 'other',
    patch_id, version = '1.0.0',
    access_level = 'public', risk_level = 'low', risk_description
  } = body;

  if (!title) {
    ctx.status = 400;
    ctx.body = { error: '请填写标题' };
    return;
  }

  if (resource_type && !RESOURCE_TYPES.includes(resource_type)) {
    ctx.status = 400;
    ctx.body = { error: '无效的资源类型' };
    return;
  }

  if (access_level && !ACCESS_LEVELS.includes(access_level)) {
    ctx.status = 400;
    ctx.body = { error: '无效的访问级别' };
    return;
  }

  if (risk_level && !RISK_LEVELS.includes(risk_level)) {
    ctx.status = 400;
    ctx.body = { error: '无效的风险等级' };
    return;
  }

  const savedFileName = path.basename(file.path);
  const fileSize = file.size;
  const fileType = file.mimetype || 'application/octet-stream';
  const originalFileName = file.originalname || savedFileName;

  const stmt = db.prepare(`
    INSERT INTO download_resources (
      title, description, file_name, file_path, file_size, file_type,
      resource_type, patch_id, version, user_id,
      access_level, risk_level, risk_description, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    title, description, originalFileName, savedFileName, fileSize, fileType,
    resource_type, patch_id ? parseInt(patch_id) : null, version, ctx.state.user.id,
    access_level, risk_level, risk_description || null, 'pending'
  );

  ctx.body = {
    id: result.lastInsertRowid,
    message: '上传成功，等待审核'
  };
};

exports.downloadResource = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const userId = ctx.state.user?.id || null;

  const resource = db.prepare('SELECT * FROM download_resources WHERE id = ?').get(id);

  if (!resource) {
    ctx.status = 404;
    ctx.body = { error: '资源不存在' };
    return;
  }

  if (!checkAccessPermission(resource, ctx.state.user)) {
    ctx.status = 403;
    ctx.body = { error: '无权限下载该资源' };
    return;
  }

  const filePath = path.join(UPLOAD_DIR, resource.file_path);
  if (!fs.existsSync(filePath)) {
    ctx.status = 404;
    ctx.body = { error: '文件不存在' };
    return;
  }

  db.prepare('UPDATE download_resources SET download_count = download_count + 1 WHERE id = ?').run(id);

  db.prepare(`
    INSERT INTO download_records (resource_id, user_id, ip_address, user_agent)
    VALUES (?, ?, ?, ?)
  `).run(
    id,
    userId,
    ctx.ip || ctx.request.ip || null,
    ctx.headers['user-agent'] || null
  );

  ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(resource.file_name)}"`);
  ctx.set('Content-Type', resource.file_type || 'application/octet-stream');
  ctx.body = fs.createReadStream(filePath);
};

exports.getMyResources = async (ctx) => {
  const { page = 1, limit = 12, status } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['user_id = ?'];
  let params = [ctx.state.user.id];

  if (status && STATUS_TYPES.includes(status)) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const resources = db.prepare(`
    SELECT * FROM download_resources
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM download_resources ${whereSql}`).get(...params);

  ctx.body = {
    list: resources.map(r => ({
      ...r,
      file_size_formatted: formatFileSize(r.file_size)
    })),
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.deleteMyResource = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const resource = db.prepare('SELECT * FROM download_resources WHERE id = ?').get(id);

  if (!resource) {
    ctx.status = 404;
    ctx.body = { error: '资源不存在' };
    return;
  }

  if (resource.user_id !== ctx.state.user.id && ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: '无权限删除' };
    return;
  }

  const filePath = path.join(UPLOAD_DIR, resource.file_path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM download_resources WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.getMyDownloadRecords = async (ctx) => {
  const { page = 1, limit = 20 } = ctx.query;
  const offset = (page - 1) * limit;

  const records = db.prepare(`
    SELECT dr.*, r.title, r.file_name, r.resource_type, r.risk_level
    FROM download_records dr
    JOIN download_resources r ON dr.resource_id = r.id
    WHERE dr.user_id = ?
    ORDER BY dr.downloaded_at DESC
    LIMIT ? OFFSET ?
  `).all(ctx.state.user.id, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM download_records WHERE user_id = ?
  `).get(ctx.state.user.id);

  ctx.body = {
    list: records,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.adminGetResources = async (ctx) => {
  const { page = 1, limit = 20, search, status, resource_type, user_id } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['1=1'];
  let params = [];

  if (search) {
    where.push('(dr.title LIKE ? OR dr.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status && STATUS_TYPES.includes(status)) {
    where.push('dr.status = ?');
    params.push(status);
  }
  if (resource_type && RESOURCE_TYPES.includes(resource_type)) {
    where.push('dr.resource_type = ?');
    params.push(resource_type);
  }
  if (user_id) {
    where.push('dr.user_id = ?');
    params.push(parseInt(user_id));
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const resources = db.prepare(`
    SELECT dr.*, u.username, u.avatar
    FROM download_resources dr
    JOIN users u ON dr.user_id = u.id
    ${whereSql}
    ORDER BY dr.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM download_resources dr ${whereSql}`).get(...params);

  ctx.body = {
    list: resources.map(r => ({
      ...r,
      file_size_formatted: formatFileSize(r.file_size)
    })),
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.adminReviewResource = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const { status, review_note } = ctx.request.body;

  if (!STATUS_TYPES.includes(status)) {
    ctx.status = 400;
    ctx.body = { error: '无效的状态' };
    return;
  }

  const resource = db.prepare('SELECT * FROM download_resources WHERE id = ?').get(id);
  if (!resource) {
    ctx.status = 404;
    ctx.body = { error: '资源不存在' };
    return;
  }

  db.prepare(`
    UPDATE download_resources SET
      status = ?,
      review_note = ?,
      reviewed_by = ?,
      reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, review_note || null, ctx.state.user.id, id);

  ctx.body = { success: true };
};

exports.adminGetDownloadRecords = async (ctx) => {
  const { page = 1, limit = 20, resource_id, user_id, start_date, end_date } = ctx.query;
  const offset = (page - 1) * limit;

  let where = ['1=1'];
  let params = [];

  if (resource_id) {
    where.push('dr.resource_id = ?');
    params.push(parseInt(resource_id));
  }
  if (user_id) {
    where.push('dr.user_id = ?');
    params.push(parseInt(user_id));
  }
  if (start_date) {
    where.push('dr.downloaded_at >= ?');
    params.push(start_date);
  }
  if (end_date) {
    where.push('dr.downloaded_at <= ?');
    params.push(end_date + ' 23:59:59');
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const records = db.prepare(`
    SELECT dr.*, r.title as resource_title, r.file_name, u.username
    FROM download_records dr
    JOIN download_resources r ON dr.resource_id = r.id
    LEFT JOIN users u ON dr.user_id = u.id
    ${whereSql}
    ORDER BY dr.downloaded_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM download_records dr ${whereSql}`).get(...params);

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_downloads,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT resource_id) as total_resources
    FROM download_records dr
    ${whereSql}
  `).get(...params);

  ctx.body = {
    list: records,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit),
    stats
  };
};

exports.adminDeleteResource = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const resource = db.prepare('SELECT * FROM download_resources WHERE id = ?').get(id);

  if (!resource) {
    ctx.status = 404;
    ctx.body = { error: '资源不存在' };
    return;
  }

  const filePath = path.join(UPLOAD_DIR, resource.file_path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM download_resources WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.getStats = async (ctx) => {
  const totalResources = db.prepare("SELECT COUNT(*) as count FROM download_resources WHERE status = 'approved'").get();
  const totalDownloads = db.prepare('SELECT COUNT(*) as count FROM download_records').get();
  const pendingCount = db.prepare("SELECT COUNT(*) as count FROM download_resources WHERE status = 'pending'").get();

  const topResources = db.prepare(`
    SELECT dr.id, dr.title, dr.download_count, u.username
    FROM download_resources dr
    JOIN users u ON dr.user_id = u.id
    WHERE dr.status = 'approved'
    ORDER BY dr.download_count DESC
    LIMIT 5
  `).all();

  ctx.body = {
    total_resources: totalResources.count,
    total_downloads: totalDownloads.count,
    pending_count: pendingCount.count,
    top_resources: topResources
  };
};
