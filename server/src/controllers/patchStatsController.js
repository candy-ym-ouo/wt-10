const db = require('../db');

const VALID_SOURCES = [
  'direct', 'search', 'home', 'patches_list', 'patch_detail',
  'user_profile', 'collection', 'module_detail', 'notification',
  'following_feed', 'compare', 'activities', 'external', 'admin'
];

const detectSource = (referer, querySource) => {
  if (querySource && VALID_SOURCES.includes(querySource)) {
    return querySource;
  }
  if (!referer) return 'direct';

  try {
    const url = new URL(referer);
    const path = url.pathname;

    if (path.includes('/search')) return 'search';
    if (path === '/' || path === '') return 'home';
    if (path.startsWith('/patches') && !path.match(/^\/patches\/\d+/)) return 'patches_list';
    if (path.match(/^\/patches\/\d+/)) return 'patch_detail';
    if (path.match(/^\/users\/\d+/)) return 'user_profile';
    if (path.startsWith('/collections')) return 'collection';
    if (path.match(/^\/modules\/\d+/)) return 'module_detail';
    if (path.startsWith('/me/notifications')) return 'notification';
    if (path.startsWith('/me/feed')) return 'following_feed';
    if (path.startsWith('/compare')) return 'compare';
    if (path.startsWith('/activities')) return 'activities';
    if (path.startsWith('/admin')) return 'admin';

    return 'external';
  } catch (e) {
    return 'external';
  }
};

const getClientIp = (ctx) => {
  const forwarded = ctx.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return ctx.ip || ctx.req.connection?.remoteAddress || null;
};

const recordPatchView = (ctx, patchId) => {
  try {
    const userId = ctx.state.user?.id || null;
    const referer = ctx.headers['referer'] || null;
    const userAgent = ctx.headers['user-agent'] || null;
    const querySource = ctx.query?.source || null;
    const source = detectSource(referer, querySource);
    const ip = getClientIp(ctx);
    const sessionId = ctx.cookies?.get('session_id') || null;
    const viewDate = new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
      INSERT INTO patch_view_logs (patch_id, user_id, source, referer, ip, user_agent, session_id, view_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(patchId, userId, source, referer, ip, userAgent, sessionId, viewDate);

    const upsertStmt = db.prepare(`
      INSERT INTO patch_view_daily_stats (patch_id, view_date, view_count, unique_visitors, source)
      VALUES (?, ?, 1, 1, ?)
      ON CONFLICT(patch_id, view_date, source) DO UPDATE SET
        view_count = view_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `);
    upsertStmt.run(patchId, viewDate, source);

    const allSourceUpsert = db.prepare(`
      INSERT INTO patch_view_daily_stats (patch_id, view_date, view_count, unique_visitors, source)
      VALUES (?, ?, 1, 1, 'all')
      ON CONFLICT(patch_id, view_date, source) WHERE source = 'all' DO UPDATE SET
        view_count = view_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `);
    allSourceUpsert.run(patchId, viewDate);

    return { source, viewDate };
  } catch (err) {
    console.error('[VIEW_LOG] 记录访问日志失败:', err.message);
    return null;
  }
};

exports.getPatchViewSources = async (ctx) => {
  const { patch_id, start_date, end_date } = ctx.query;

  let where = [];
  let params = [];

  if (patch_id) {
    where.push('patch_id = ?');
    params.push(parseInt(patch_id));
  }
  if (start_date) {
    where.push('view_date >= ?');
    params.push(start_date);
  }
  if (end_date) {
    where.push('view_date <= ?');
    params.push(end_date);
  }

  where.push("source != 'all'");

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const sources = db.prepare(`
    SELECT source, SUM(view_count) as total_views
    FROM patch_view_daily_stats
    ${whereSql}
    GROUP BY source
    ORDER BY total_views DESC
  `).all(...params);

  const total = sources.reduce((sum, s) => sum + s.total_views, 0);

  ctx.body = {
    sources: sources.map(s => ({
      source: s.source,
      views: s.total_views,
      percentage: total > 0 ? Number(((s.total_views / total) * 100).toFixed(2)) : 0
    })),
    total_views: total
  };
};

exports.getPatchHeatTrend = async (ctx) => {
  const { patch_id, start_date, end_date, source = 'all', granularity = 'day' } = ctx.query;

  const endDate = end_date || new Date().toISOString().split('T')[0];
  let startDate = start_date;

  if (!startDate) {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    startDate = d.toISOString().split('T')[0];
  }

  let where = ['view_date >= ?', 'view_date <= ?'];
  let params = [startDate, endDate];

  if (patch_id) {
    where.push('patch_id = ?');
    params.push(parseInt(patch_id));
  }

  where.push('source = ?');
  params.push(source);

  const whereSql = 'WHERE ' + where.join(' AND ');

  let groupBySql = 'view_date';
  let dateFormatSql = 'view_date';

  if (granularity === 'week') {
    dateFormatSql = "strftime('%Y-W%W', view_date)";
    groupBySql = "strftime('%Y-W%W', view_date)";
  } else if (granularity === 'month') {
    dateFormatSql = "strftime('%Y-%m', view_date)";
    groupBySql = "strftime('%Y-%m', view_date)";
  }

  const trend = db.prepare(`
    SELECT ${dateFormatSql} as period,
           SUM(view_count) as total_views,
           SUM(unique_visitors) as total_visitors,
           COUNT(DISTINCT patch_id) as patch_count
    FROM patch_view_daily_stats
    ${whereSql}
    GROUP BY ${groupBySql}
    ORDER BY period ASC
  `).all(...params);

  ctx.body = {
    trend,
    start_date: startDate,
    end_date: endDate,
    granularity
  };
};

exports.getPatchRankings = async (ctx) => {
  const { limit = 10, period = 'all', sort_by = 'views' } = ctx.query;

  const pageSize = Math.min(parseInt(limit) || 10, 100);

  let dateJoinCondition = "pv.source = 'all'";
  let dateParams = [];

  if (period === 'today') {
    dateJoinCondition += " AND pv.view_date = DATE('now')";
  } else if (period === 'week') {
    dateJoinCondition += " AND pv.view_date >= DATE('now', '-7 days')";
  } else if (period === 'month') {
    dateJoinCondition += " AND pv.view_date >= DATE('now', '-30 days')";
  }

  let orderSql = 'period_views DESC';
  if (sort_by === 'likes') {
    orderSql = 'p.likes_count DESC';
  } else if (sort_by === 'favorites') {
    orderSql = 'p.favorites_count DESC';
  } else if (sort_by === 'comments') {
    orderSql = 'comments_count DESC';
  }

  const rankings = db.prepare(`
    SELECT p.id, p.title, p.views_count, p.likes_count, p.favorites_count,
           u.username as author_name, u.avatar,
           COALESCE(SUM(pv.view_count), 0) as period_views,
           (SELECT COUNT(*) FROM comments c WHERE c.patch_id = p.id) as comments_count
    FROM patches p
    LEFT JOIN patch_view_daily_stats pv ON p.id = pv.patch_id AND ${dateJoinCondition}
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.is_public = 1 AND p.status = 'approved'
    GROUP BY p.id
    ORDER BY ${orderSql}
    LIMIT ?
  `).all(...dateParams, pageSize);

  ctx.body = {
    rankings: rankings.map((r, i) => ({
      rank: i + 1,
      patch_id: r.id,
      title: r.title,
      author_name: r.author_name,
      avatar: r.avatar,
      views_count: r.views_count,
      likes_count: r.likes_count,
      favorites_count: r.favorites_count,
      comments_count: r.comments_count,
      period_views: r.period_views
    })),
    period,
    sort_by
  };
};

exports.getAdminPatchStatsOverview = async (ctx) => {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const totalViews = db.prepare("SELECT COALESCE(SUM(view_count), 0) as cnt FROM patch_view_daily_stats WHERE source = 'all'").get().cnt;
  const todayViews = db.prepare("SELECT COALESCE(SUM(view_count), 0) as cnt FROM patch_view_daily_stats WHERE source = 'all' AND view_date = ?").get(today).cnt;
  const weekViews = db.prepare("SELECT COALESCE(SUM(view_count), 0) as cnt FROM patch_view_daily_stats WHERE source = 'all' AND view_date >= ?").get(weekAgo).cnt;
  const monthViews = db.prepare("SELECT COALESCE(SUM(view_count), 0) as cnt FROM patch_view_daily_stats WHERE source = 'all' AND view_date >= ?").get(monthAgo).cnt;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const yesterdayViews = db.prepare("SELECT COALESCE(SUM(view_count), 0) as cnt FROM patch_view_daily_stats WHERE source = 'all' AND view_date = ?").get(yesterday).cnt;
  const dailyGrowth = yesterdayViews > 0 ? Number((((todayViews - yesterdayViews) / yesterdayViews) * 100).toFixed(2)) : 0;

  const topSources = db.prepare(`
    SELECT source, SUM(view_count) as total
    FROM patch_view_daily_stats
    WHERE source != 'all'
    GROUP BY source
    ORDER BY total DESC
    LIMIT 5
  `).all();

  const topPatches = db.prepare(`
    SELECT p.id, p.title, u.username, COALESCE(SUM(pv.view_count), 0) as total_views
    FROM patches p
    LEFT JOIN patch_view_daily_stats pv ON p.id = pv.patch_id AND pv.source = 'all'
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.is_public = 1 AND p.status = 'approved'
    GROUP BY p.id
    ORDER BY total_views DESC
    LIMIT 5
  `).all();

  const dailyTrend = db.prepare(`
    SELECT view_date, SUM(view_count) as views
    FROM patch_view_daily_stats
    WHERE source = 'all' AND view_date >= ?
    GROUP BY view_date
    ORDER BY view_date ASC
  `).all(weekAgo);

  ctx.body = {
    overview: {
      total_views: totalViews,
      today_views: todayViews,
      week_views: weekViews,
      month_views: monthViews,
      daily_growth: dailyGrowth
    },
    top_sources: topSources,
    top_patches: topPatches,
    daily_trend: dailyTrend
  };
};

exports.recordPatchView = recordPatchView;
exports.detectSource = detectSource;
exports.VALID_SOURCES = VALID_SOURCES;
