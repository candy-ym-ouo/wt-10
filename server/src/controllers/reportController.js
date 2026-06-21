const db = require('../db');

exports.getOverview = async (ctx) => {
  const { start_date, end_date } = ctx.query;

  let dateWhere = '';
  let dateParams = [];
  if (start_date && end_date) {
    dateWhere = 'WHERE DATE(created_at) BETWEEN ? AND ?';
    dateParams = [start_date, end_date];
  } else if (start_date) {
    dateWhere = 'WHERE DATE(created_at) >= ?';
    dateParams = [start_date];
  } else if (end_date) {
    dateWhere = 'WHERE DATE(created_at) <= ?';
    dateParams = [end_date];
  }

  const stats = {
    totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    totalPatches: db.prepare('SELECT COUNT(*) as count FROM patches WHERE deleted_at IS NULL').get().count,
    totalModules: db.prepare('SELECT COUNT(*) as count FROM modules').get().count,
    totalManufacturers: db.prepare('SELECT COUNT(*) as count FROM manufacturers').get().count,
    totalLikes: db.prepare('SELECT COUNT(*) as count FROM likes').get().count,
    totalFavorites: db.prepare('SELECT COUNT(*) as count FROM favorites').get().count,
    totalComments: db.prepare('SELECT COUNT(*) as count FROM comments').get().count,
    totalDownloads: db.prepare('SELECT COUNT(*) as count FROM download_records').get().count || 0,
    totalViews: db.prepare('SELECT COALESCE(SUM(views_count), 0) as total FROM patches WHERE deleted_at IS NULL').get().total,
    newUsers: db.prepare(`SELECT COUNT(*) as count FROM users ${dateWhere}`).get(...dateParams).count,
    newPatches: db.prepare(`SELECT COUNT(*) as count FROM patches WHERE deleted_at IS NULL ${dateWhere ? dateWhere.replace('WHERE', 'AND') : ''}`).get(...dateParams).count
  };

  const patchesByStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM patches
    WHERE deleted_at IS NULL
    GROUP BY status
  `).all();

  const modulesByType = db.prepare(`
    SELECT type, COUNT(*) as count
    FROM modules
    WHERE status = 'active'
    GROUP BY type
    ORDER BY count DESC
  `).all();

  const usersByRole = db.prepare(`
    SELECT role, COUNT(*) as count
    FROM users
    GROUP BY role
  `).all();

  const dailyNewUsers = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM users
    ${dateWhere || "WHERE created_at >= date('now', '-30 days')"}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `).all(...dateParams).reverse();

  const dailyNewPatches = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM patches
    ${dateWhere ? dateWhere.replace('WHERE', 'WHERE deleted_at IS NULL AND') : "WHERE deleted_at IS NULL AND created_at >= date('now', '-30 days')"}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `).all(...dateParams).reverse();

  ctx.body = {
    stats,
    patchesByStatus,
    modulesByType,
    usersByRole,
    dailyNewUsers,
    dailyNewPatches
  };
};

const buildUserStatsQuery = (options = {}) => {
  const { search, sort_by = 'patches_count', sort_order = 'desc' } = options;

  let where = [];
  let params = [];

  if (search) {
    where.push('(u.username LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const validSortFields = ['patches_count', 'total_likes', 'total_favorites', 'total_views', 'followers_count', 'following_count', 'created_at'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'patches_count';
  const sortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

  return { whereSql, params, sortField, sortOrder };
};

exports.getUserStats = async (ctx) => {
  const { page = 1, limit = 20, search, sort_by, sort_order } = ctx.query;
  const offset = (page - 1) * limit;

  const { whereSql, params, sortField, sortOrder } = buildUserStatsQuery({ search, sort_by, sort_order });

  const users = db.prepare(`
    SELECT 
      u.id,
      u.username,
      u.email,
      u.avatar,
      u.role,
      u.followers_count,
      u.following_count,
      u.is_creator_verified,
      u.created_at,
      COUNT(DISTINCT p.id) as patches_count,
      COALESCE(SUM(p.likes_count), 0) as total_likes,
      COALESCE(SUM(p.favorites_count), 0) as total_favorites,
      COALESCE(SUM(p.views_count), 0) as total_views
    FROM users u
    LEFT JOIN patches p ON u.id = p.user_id AND p.deleted_at IS NULL
    ${whereSql}
    GROUP BY u.id
    ORDER BY ${sortField} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(DISTINCT u.id) as count
    FROM users u
    ${whereSql}
  `).get(...params);

  ctx.body = {
    list: users,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

const buildPatchStatsQuery = (options = {}) => {
  const { search, user_id, status, sort_by = 'views_count', sort_order = 'desc' } = options;

  let where = ['p.deleted_at IS NULL'];
  let params = [];

  if (search) {
    where.push('(p.title LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (user_id) {
    where.push('p.user_id = ?');
    params.push(parseInt(user_id));
  }
  if (status) {
    where.push('p.status = ?');
    params.push(status);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const validSortFields = ['views_count', 'likes_count', 'favorites_count', 'comments_count', 'created_at'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'views_count';
  const sortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

  return { whereSql, params, sortField, sortOrder };
};

exports.getPatchStats = async (ctx) => {
  const { page = 1, limit = 20, search, user_id, status, sort_by, sort_order } = ctx.query;
  const offset = (page - 1) * limit;

  const { whereSql, params, sortField, sortOrder } = buildPatchStatsQuery({ search, user_id, status, sort_by, sort_order });

  const patches = db.prepare(`
    SELECT 
      p.id,
      p.title,
      p.user_id,
      u.username as author_name,
      p.status,
      p.likes_count,
      p.favorites_count,
      p.views_count,
      p.is_public,
      p.created_at,
      COUNT(DISTINCT c.id) as comments_count
    FROM patches p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN comments c ON p.id = c.patch_id
    ${whereSql}
    GROUP BY p.id
    ORDER BY ${sortField} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count
    FROM patches p
    ${whereSql}
  `).get(...params);

  ctx.body = {
    list: patches,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

const buildModuleStatsQuery = (options = {}) => {
  const { search, manufacturer_id, type, sort_by = 'patches_count', sort_order = 'desc' } = options;

  let where = [];
  let params = [];

  if (search) {
    where.push('(m.name LIKE ? OR m.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (manufacturer_id) {
    where.push('m.manufacturer_id = ?');
    params.push(parseInt(manufacturer_id));
  }
  if (type) {
    where.push('m.type = ?');
    params.push(type);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const validSortFields = ['patches_count', 'hp', 'created_at', 'name'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'patches_count';
  const sortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

  return { whereSql, params, sortField, sortOrder };
};

exports.getModuleStats = async (ctx) => {
  const { page = 1, limit = 20, search, manufacturer_id, type, sort_by, sort_order } = ctx.query;
  const offset = (page - 1) * limit;

  const { whereSql, params, sortField, sortOrder } = buildModuleStatsQuery({ search, manufacturer_id, type, sort_by, sort_order });

  const modules = db.prepare(`
    SELECT 
      m.id,
      m.name,
      m.type,
      m.hp,
      m.status,
      m.manufacturer_id,
      mf.name as manufacturer_name,
      m.created_at,
      COUNT(DISTINCT p.id) as patches_count
    FROM modules m
    LEFT JOIN manufacturers mf ON m.manufacturer_id = mf.id
    LEFT JOIN patches p ON p.modules_used LIKE '%' || m.name || '%'
    ${whereSql}
    GROUP BY m.id
    ORDER BY ${sortField} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count
    FROM modules m
    ${whereSql}
  `).get(...params);

  ctx.body = {
    list: modules,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

const buildManufacturerStatsQuery = (options = {}) => {
  const { search, sort_by = 'modules_count', sort_order = 'desc' } = options;

  let where = [];
  let params = [];

  if (search) {
    where.push('(m.name LIKE ? OR m.country LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const validSortFields = ['modules_count', 'patches_count', 'created_at', 'name'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'modules_count';
  const sortOrder = sort_order === 'asc' ? 'ASC' : 'DESC';

  return { whereSql, params, sortField, sortOrder };
};

exports.getManufacturerStats = async (ctx) => {
  const { page = 1, limit = 20, search, sort_by, sort_order } = ctx.query;
  const offset = (page - 1) * limit;

  const { whereSql, params, sortField, sortOrder } = buildManufacturerStatsQuery({ search, sort_by, sort_order });

  const manufacturers = db.prepare(`
    SELECT 
      m.id,
      m.name,
      m.country,
      m.website,
      m.created_at,
      COUNT(DISTINCT mod.id) as modules_count,
      COUNT(DISTINCT p.id) as patches_count
    FROM manufacturers m
    LEFT JOIN modules mod ON m.id = mod.manufacturer_id
    LEFT JOIN patches p ON p.modules_used LIKE '%' || m.name || '%'
    ${whereSql}
    GROUP BY m.id
    ORDER BY ${sortField} ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count
    FROM manufacturers m
    ${whereSql}
  `).get(...params);

  ctx.body = {
    list: manufacturers,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.exportReport = async (ctx) => {
  const { type, format = 'csv', search, status, user_id, manufacturer_id: manufacturerId, type: moduleType, sort_by, sort_order } = ctx.query;

  let data = [];
  let filename = '';
  let headers = [];

  switch (type) {
    case 'users': {
      const { whereSql, params, sortField, sortOrder } = buildUserStatsQuery({ search, sort_by, sort_order });
      data = db.prepare(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.role,
          u.followers_count,
          u.following_count,
          u.is_creator_verified,
          u.created_at,
          COUNT(DISTINCT p.id) as patches_count,
          COALESCE(SUM(p.likes_count), 0) as total_likes,
          COALESCE(SUM(p.favorites_count), 0) as total_favorites,
          COALESCE(SUM(p.views_count), 0) as total_views
        FROM users u
        LEFT JOIN patches p ON u.id = p.user_id AND p.deleted_at IS NULL
        ${whereSql}
        GROUP BY u.id
        ORDER BY ${sortField} ${sortOrder}
      `).all(...params);
      headers = ['ID', '用户名', '邮箱', '角色', '粉丝数', '关注数', '创作者认证', '注册时间', 'Patch数量', '总点赞', '总收藏', '总浏览'];
      filename = '用户统计报表';
      break;
    }

    case 'patches': {
      const { whereSql, params, sortField, sortOrder } = buildPatchStatsQuery({ search, user_id, status, sort_by, sort_order });
      data = db.prepare(`
        SELECT 
          p.id,
          p.title,
          u.username as author_name,
          p.status,
          p.likes_count,
          p.favorites_count,
          p.views_count,
          COUNT(DISTINCT c.id) as comments_count,
          p.is_public,
          p.created_at
        FROM patches p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN comments c ON p.id = c.patch_id
        ${whereSql}
        GROUP BY p.id
        ORDER BY ${sortField} ${sortOrder}
      `).all(...params);
      headers = ['ID', '标题', '作者', '状态', '点赞数', '收藏数', '浏览数', '评论数', '是否公开', '创建时间'];
      filename = 'Patch统计报表';
      break;
    }

    case 'modules': {
      const { whereSql, params, sortField, sortOrder } = buildModuleStatsQuery({ search, manufacturer_id: manufacturerId, type: moduleType, sort_by, sort_order });
      data = db.prepare(`
        SELECT 
          m.id,
          m.name,
          m.type,
          m.hp,
          mf.name as manufacturer_name,
          m.status,
          m.created_at,
          COUNT(DISTINCT p.id) as patches_count
        FROM modules m
        LEFT JOIN manufacturers mf ON m.manufacturer_id = mf.id
        LEFT JOIN patches p ON p.modules_used LIKE '%' || m.name || '%'
        ${whereSql}
        GROUP BY m.id
        ORDER BY ${sortField} ${sortOrder}
      `).all(...params);
      headers = ['ID', '模块名称', '类型', 'HP', '厂商', '状态', '创建时间', '关联Patch数'];
      filename = '模块统计报表';
      break;
    }

    case 'manufacturers': {
      const { whereSql, params, sortField, sortOrder } = buildManufacturerStatsQuery({ search, sort_by, sort_order });
      data = db.prepare(`
        SELECT 
          m.id,
          m.name,
          m.country,
          m.website,
          m.created_at,
          COUNT(DISTINCT mod.id) as modules_count,
          COUNT(DISTINCT p.id) as patches_count
        FROM manufacturers m
        LEFT JOIN modules mod ON m.id = mod.manufacturer_id
        LEFT JOIN patches p ON p.modules_used LIKE '%' || m.name || '%'
        ${whereSql}
        GROUP BY m.id
        ORDER BY ${sortField} ${sortOrder}
      `).all(...params);
      headers = ['ID', '厂商名称', '国家', '官网', '创建时间', '模块数量', '关联Patch数'];
      filename = '厂商统计报表';
      break;
    }

    default:
      ctx.status = 400;
      ctx.body = { error: '无效的报表类型' };
      return;
  }

  if (format === 'csv') {
    const csvRows = [headers.join(',')];
    data.forEach(row => {
      const values = Object.values(row).map(v => {
        if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
          return '"' + v.replace(/"/g, '""') + '"';
        }
        return v === null || v === undefined ? '' : String(v);
      });
      csvRows.push(values.join(','));
    });

    const bom = '\uFEFF';
    const csvContent = bom + csvRows.join('\n');

    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.csv"`);
    ctx.body = csvContent;
  } else if (format === 'json') {
    ctx.set('Content-Type', 'application/json; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.json"`);
    ctx.body = JSON.stringify({ headers, data }, null, 2);
  } else {
    ctx.status = 400;
    ctx.body = { error: '不支持的导出格式' };
  }
};
