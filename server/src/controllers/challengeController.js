const db = require('../db');

exports.getSeasons = async (ctx) => {
  const { page = 1, limit = 12, status, year } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (status) {
    where.push('status != ?');
    params.push('draft');
    if (status !== 'all') {
      where.push('status = ?');
      params.push(status);
    }
  }
  if (year) {
    where.push('year = ?');
    params.push(year);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const seasons = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM activity_registrations ar
       JOIN activities a ON ar.activity_id = a.id
       WHERE a.season_id = s.id) as total_registrations,
      (SELECT COUNT(*) FROM activity_submissions asub
       JOIN activities a ON asub.activity_id = a.id
       WHERE a.season_id = s.id AND asub.status = 'approved') as total_submissions,
      (SELECT COUNT(*) FROM activities a WHERE a.season_id = s.id) as activity_count
    FROM challenge_seasons s
    ${whereSql}
    ORDER BY s.year DESC, s.season_no DESC, s.sort_order ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM challenge_seasons s ${whereSql}`).get(...params);

  ctx.body = {
    list: seasons,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.getSeasonDetail = async (ctx) => {
  const id = parseInt(ctx.params.id);

  const season = db.prepare('SELECT * FROM challenge_seasons WHERE id = ?').get(id);
  if (!season) {
    ctx.status = 404;
    ctx.body = { error: '赛季不存在' };
    return;
  }

  const activities = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM activity_registrations ar WHERE ar.activity_id = a.id) as registration_count,
      (SELECT COUNT(*) FROM activity_submissions asub WHERE asub.activity_id = a.id AND asub.status = 'approved') as submission_count
    FROM activities a
    WHERE a.season_id = ?
    ORDER BY a.sort_order ASC, a.created_at DESC
  `).all(id);

  const awards = db.prepare(`
    SELECT * FROM challenge_awards
    WHERE season_id = ?
    ORDER BY sort_order ASC
  `).all(id);

  const winners = db.prepare(`
    SELECT w.*, u.username, u.avatar, s.title as submission_title
    FROM challenge_winners w
    JOIN users u ON w.user_id = u.id
    JOIN activity_submissions s ON w.submission_id = s.id
    WHERE w.season_id = ?
    ORDER BY w.rank_position ASC, w.final_score DESC
  `).all(id);

  const votingRule = db.prepare(`
    SELECT * FROM challenge_voting_rules
    WHERE season_id = ?
    LIMIT 1
  `).get(id);

  ctx.body = {
    ...season,
    activities,
    awards,
    winners,
    voting_rule: votingRule
  };
};

exports.adminGetSeasons = async (ctx) => {
  const { page = 1, limit = 20, search, status } = ctx.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (search) {
    where.push('(name LIKE ? OR theme LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const seasons = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM activities a WHERE a.season_id = s.id) as activity_count
    FROM challenge_seasons s
    ${whereSql}
    ORDER BY s.year DESC, s.season_no DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM challenge_seasons s ${whereSql}`).get(...params);

  ctx.body = {
    list: seasons,
    total: total.count,
    page: parseInt(page),
    limit: parseInt(limit)
  };
};

exports.adminCreateSeason = async (ctx) => {
  const {
    name, season_no, year, theme, description, cover_url, banner_url,
    status, start_date, end_date, registration_start, registration_end,
    submission_start, submission_end, voting_start, voting_end,
    result_publish_date, max_registrations, max_submissions_per_user, sort_order
  } = ctx.request.body;

  if (!name || !season_no || !year) {
    ctx.status = 400;
    ctx.body = { error: '请填写赛季名称、赛季号和年份' };
    return;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO challenge_seasons (
        name, season_no, year, theme, description, cover_url, banner_url,
        status, start_date, end_date, registration_start, registration_end,
        submission_start, submission_end, voting_start, voting_end,
        result_publish_date, max_registrations, max_submissions_per_user, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name, season_no, year, theme || '', description || '', cover_url || '', banner_url || '',
      status || 'draft', start_date || null, end_date || null,
      registration_start || null, registration_end || null,
      submission_start || null, submission_end || null,
      voting_start || null, voting_end || null,
      result_publish_date || null, max_registrations || 0,
      max_submissions_per_user || 1, sort_order || 0
    );

    ctx.body = { success: true, id: result.lastInsertRowid };
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      ctx.status = 400;
      ctx.body = { error: '该年份的赛季号已存在' };
    } else {
      throw err;
    }
  }
};

exports.adminUpdateSeason = async (ctx) => {
  const id = parseInt(ctx.params.id);
  const data = ctx.request.body;

  const fields = [
    'name', 'season_no', 'year', 'theme', 'description', 'cover_url', 'banner_url',
    'status', 'start_date', 'end_date', 'registration_start', 'registration_end',
    'submission_start', 'submission_end', 'voting_start', 'voting_end',
    'result_publish_date', 'max_registrations', 'max_submissions_per_user', 'sort_order'
  ];

  let updates = [];
  let params = [];

  fields.forEach(field => {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  });

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    db.prepare(`UPDATE challenge_seasons SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  ctx.body = { success: true };
};

exports.adminDeleteSeason = async (ctx) => {
  const id = parseInt(ctx.params.id);
  db.prepare('DELETE FROM challenge_seasons WHERE id = ?').run(id);
  ctx.body = { success: true };
};

exports.getVotingRule = async (ctx) => {
  const { activity_id, season_id } = ctx.query;

  let where = [];
  let params = [];

  if (activity_id) {
    where.push('activity_id = ?');
    params.push(activity_id);
  }
  if (season_id) {
    where.push('season_id = ?');
    params.push(season_id);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const rule = db.prepare(`SELECT * FROM challenge_voting_rules ${whereSql} LIMIT 1`).get(...params);

  if (!rule) {
    ctx.body = {
      rule_name: '默认规则',
      rule_type: 'public',
      allow_self_vote: 0,
      daily_vote_limit: 0,
      total_vote_limit_per_user: 0,
      max_votes_per_submission: 1,
      vote_weight_public: 1.0,
      vote_weight_jury: 3.0,
      vote_weight_creator: 2.0,
      score_formula: 'weighted_sum',
      min_jury_reviews: 0,
      require_jury_score: 0,
      score_weights: JSON.stringify({ creativity: 0.25, technical: 0.25, musicality: 0.25, originality: 0.25 })
    };
    return;
  }

  ctx.body = rule;
};

exports.adminSaveVotingRule = async (ctx) => {
  const {
    activity_id, season_id, rule_name, rule_type, allow_self_vote,
    daily_vote_limit, total_vote_limit_per_user, max_votes_per_submission,
    vote_weight_public, vote_weight_jury, vote_weight_creator,
    score_formula, score_weights, min_jury_reviews, require_jury_score
  } = ctx.request.body;

  if (!activity_id && !season_id) {
    ctx.status = 400;
    ctx.body = { error: '请指定活动或赛季' };
    return;
  }

  let existing;
  if (season_id) {
    existing = db.prepare('SELECT * FROM challenge_voting_rules WHERE season_id = ?').get(season_id);
  } else {
    existing = db.prepare('SELECT * FROM challenge_voting_rules WHERE activity_id = ?').get(activity_id);
  }

  if (existing) {
    db.prepare(`
      UPDATE challenge_voting_rules SET
        rule_name = ?, rule_type = ?, allow_self_vote = ?,
        daily_vote_limit = ?, total_vote_limit_per_user = ?, max_votes_per_submission = ?,
        vote_weight_public = ?, vote_weight_jury = ?, vote_weight_creator = ?,
        score_formula = ?, score_weights = ?, min_jury_reviews = ?, require_jury_score = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      rule_name || '默认规则', rule_type || 'public', allow_self_vote || 0,
      daily_vote_limit || 0, total_vote_limit_per_user || 0, max_votes_per_submission || 1,
      vote_weight_public || 1.0, vote_weight_jury || 3.0, vote_weight_creator || 2.0,
      score_formula || 'weighted_sum', score_weights ? JSON.stringify(score_weights) : null,
      min_jury_reviews || 0, require_jury_score || 0,
      existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO challenge_voting_rules (
        activity_id, season_id, rule_name, rule_type, allow_self_vote,
        daily_vote_limit, total_vote_limit_per_user, max_votes_per_submission,
        vote_weight_public, vote_weight_jury, vote_weight_creator,
        score_formula, score_weights, min_jury_reviews, require_jury_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      activity_id || null, season_id || null,
      rule_name || '默认规则', rule_type || 'public', allow_self_vote || 0,
      daily_vote_limit || 0, total_vote_limit_per_user || 0, max_votes_per_submission || 1,
      vote_weight_public || 1.0, vote_weight_jury || 3.0, vote_weight_creator || 2.0,
      score_formula || 'weighted_sum', score_weights ? JSON.stringify(score_weights) : null,
      min_jury_reviews || 0, require_jury_score || 0
    );
  }

  ctx.body = { success: true };
};

exports.getAwards = async (ctx) => {
  const { activity_id, season_id } = ctx.query;

  let where = [];
  let params = [];

  if (activity_id) {
    where.push('activity_id = ?');
    params.push(activity_id);
  }
  if (season_id) {
    where.push('season_id = ?');
    params.push(season_id);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const awards = db.prepare(`
    SELECT * FROM challenge_awards
    ${whereSql}
    ORDER BY sort_order ASC, id ASC
  `).all(...params);

  ctx.body = awards;
};

exports.adminSaveAwards = async (ctx) => {
  const { activity_id, season_id, awards } = ctx.request.body;

  if (!activity_id && !season_id) {
    ctx.status = 400;
    ctx.body = { error: '请指定活动或赛季' };
    return;
  }

  const deleteWhere = activity_id
    ? { sql: 'WHERE activity_id = ?', params: [activity_id] }
    : { sql: 'WHERE season_id = ?', params: [season_id] };

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM challenge_awards ${deleteWhere.sql}`).run(...deleteWhere.params);

    const stmt = db.prepare(`
      INSERT INTO challenge_awards (
        activity_id, season_id, award_name, award_level, rank_position,
        prize_description, reward_coins, badge_url, count, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    (awards || []).forEach((award, idx) => {
      stmt.run(
        activity_id || null, season_id || null,
        award.award_name, award.award_level || 'custom',
        award.rank_position || null, award.prize_description || '',
        award.reward_coins || 0, award.badge_url || '',
        award.count || 1, award.sort_order !== undefined ? award.sort_order : idx
      );
    });
  });

  tx();
  ctx.body = { success: true };
};

exports.getJury = async (ctx) => {
  const { activity_id, season_id } = ctx.query;

  let where = [];
  let params = [];

  if (activity_id) {
    where.push('j.activity_id = ?');
    params.push(activity_id);
  }
  if (season_id) {
    where.push('j.season_id = ?');
    params.push(season_id);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const jury = db.prepare(`
    SELECT j.*, u.username, u.email, u.avatar, u.bio
    FROM challenge_jury j
    JOIN users u ON j.user_id = u.id
    ${whereSql}
    ORDER BY j.created_at DESC
  `).all(...params);

  ctx.body = jury;
};

exports.adminManageJury = async (ctx) => {
  const { activity_id, season_id, user_ids, role } = ctx.request.body;
  const action = ctx.params.action;

  if (!activity_id && !season_id) {
    ctx.status = 400;
    ctx.body = { error: '请指定活动或赛季' };
    return;
  }

  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    ctx.status = 400;
    ctx.body = { error: '请选择用户' };
    return;
  }

  const tx = db.transaction(() => {
    if (action === 'add') {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO challenge_jury (activity_id, season_id, user_id, role)
        VALUES (?, ?, ?, ?)
      `);
      user_ids.forEach(uid => {
        stmt.run(activity_id || null, season_id || null, uid, role || 'jury');
      });
    } else if (action === 'remove') {
      let whereSql, params;
      if (season_id) {
        whereSql = 'WHERE season_id = ? AND user_id IN (' + user_ids.map(() => '?').join(',') + ')';
        params = [season_id, ...user_ids];
      } else {
        whereSql = 'WHERE activity_id = ? AND user_id IN (' + user_ids.map(() => '?').join(',') + ')';
        params = [activity_id, ...user_ids];
      }
      db.prepare(`DELETE FROM challenge_jury ${whereSql}`).run(...params);
    }
  });

  tx();
  ctx.body = { success: true };
};

exports.submitJuryScore = async (ctx) => {
  const submissionId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const {
    dimension1_score, dimension2_score, dimension3_score,
    dimension4_score, dimension5_score, comment
  } = ctx.request.body;

  const activity = db.prepare(`
    SELECT a.* FROM activities a
    JOIN activity_submissions s ON a.id = s.activity_id
    WHERE s.id = ?
  `).get(submissionId);

  if (!activity) {
    ctx.status = 404;
    ctx.body = { error: '作品不存在' };
    return;
  }

  const juryEntry = db.prepare(`
    SELECT * FROM challenge_jury
    WHERE (activity_id = ? OR season_id = ?) AND user_id = ? AND status = 'active'
  `).get(activity.id, activity.season_id, userId);

  if (!juryEntry) {
    ctx.status = 403;
    ctx.body = { error: '您不是评审团成员' };
    return;
  }

  const d1 = parseFloat(dimension1_score) || 0;
  const d2 = parseFloat(dimension2_score) || 0;
  const d3 = parseFloat(dimension3_score) || 0;
  const d4 = parseFloat(dimension4_score) || 0;
  const d5 = parseFloat(dimension5_score) || 0;
  const total = d1 + d2 + d3 + d4 + d5;

  db.prepare(`
    INSERT INTO challenge_jury_scores (
      submission_id, jury_id, user_id,
      dimension1_score, dimension2_score, dimension3_score,
      dimension4_score, dimension5_score, total_score, comment
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(submission_id, jury_id) DO UPDATE SET
      dimension1_score = excluded.dimension1_score,
      dimension2_score = excluded.dimension2_score,
      dimension3_score = excluded.dimension3_score,
      dimension4_score = excluded.dimension4_score,
      dimension5_score = excluded.dimension5_score,
      total_score = excluded.total_score,
      comment = excluded.comment,
      updated_at = CURRENT_TIMESTAMP
  `).run(submissionId, juryEntry.id, userId, d1, d2, d3, d4, d5, total, comment || '');

  ctx.body = { success: true, total_score: total };
};

exports.calculateRankings = async (ctx) => {
  const activityId = parseInt(ctx.params.id);
  const { publish = false } = ctx.request.body;

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  if (!activity) {
    ctx.status = 404;
    ctx.body = { error: '活动不存在' };
    return;
  }

  let votingRule = db.prepare(`
    SELECT * FROM challenge_voting_rules
    WHERE activity_id = ? OR season_id = ?
    LIMIT 1
  `).get(activityId, activity.season_id);

  if (!votingRule) {
    votingRule = {
      vote_weight_public: 1.0,
      vote_weight_jury: 3.0,
      vote_weight_creator: 2.0,
      score_formula: 'weighted_sum'
    };
  }

  const submissions = db.prepare(`
    SELECT s.*, u.username
    FROM activity_submissions s
    JOIN users u ON s.user_id = u.id
    WHERE s.activity_id = ? AND s.status = 'approved'
  `).all(activityId);

  const rankings = [];

  for (const sub of submissions) {
    const publicVotes = db.prepare(`
      SELECT COALESCE(SUM(COALESCE(weight, 1.0)), 0) as total
      FROM activity_votes
      WHERE submission_id = ? AND vote_type = 'public'
    `).get(sub.id).total;

    const juryData = db.prepare(`
      SELECT
        COUNT(*) as review_count,
        COALESCE(AVG(total_score), 0) as avg_score
      FROM challenge_jury_scores
      WHERE submission_id = ?
    `).get(sub.id);

    const publicScore = publicVotes * votingRule.vote_weight_public;
    const juryScore = juryData.avg_score * votingRule.vote_weight_jury;
    const creatorScore = (sub.score || 0) * votingRule.vote_weight_creator;

    let finalScore;
    switch (votingRule.score_formula) {
      case 'average':
        finalScore = (publicScore + juryScore + creatorScore) / 3;
        break;
      case 'jury_only':
        finalScore = juryScore;
        break;
      case 'public_only':
        finalScore = publicScore;
        break;
      case 'weighted_sum':
      default:
        finalScore = publicScore + juryScore + creatorScore;
    }

    finalScore = Math.round(finalScore * 100) / 100;

    rankings.push({
      id: sub.id,
      user_id: sub.user_id,
      username: sub.username,
      title: sub.title,
      votes_count: sub.votes_count || 0,
      public_score: Math.round(publicScore * 100) / 100,
      jury_score: Math.round(juryScore * 100) / 100,
      creator_score: Math.round(creatorScore * 100) / 100,
      final_score: finalScore,
      jury_review_count: juryData.review_count
    });
  }

  rankings.sort((a, b) => b.final_score - a.final_score);
  rankings.forEach((r, i) => { r.rank = i + 1; });

  const tx = db.transaction(() => {
    const updateStmt = db.prepare(`
      UPDATE activity_submissions SET
        public_score = ?,
        jury_score = ?,
        creator_score = ?,
        final_score = ?,
        score = ?,
        rank = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    rankings.forEach(r => {
      updateStmt.run(
        r.public_score, r.jury_score, r.creator_score,
        r.final_score, Math.round(r.final_score), r.rank, r.id
      );
    });

    if (publish) {
      db.prepare(`
        UPDATE activities SET
          result_published = 1,
          result_publish_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(activityId);
    }
  });

  tx();

  ctx.body = {
    success: true,
    rankings,
    count: rankings.length,
    published: publish
  };
};

exports.publishResults = async (ctx) => {
  const activityId = parseInt(ctx.params.id);
  const { generate_winners = true } = ctx.request.body;

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  if (!activity) {
    ctx.status = 404;
    ctx.body = { error: '活动不存在' };
    return;
  }

  const awards = db.prepare(`
    SELECT * FROM challenge_awards
    WHERE activity_id = ? OR season_id = ?
    ORDER BY sort_order ASC
  `).all(activityId, activity.season_id);

  const winners = [];

  if (generate_winners && awards.length > 0) {
    const approvedSubmissions = db.prepare(`
      SELECT s.*, u.username, u.avatar
      FROM activity_submissions s
      JOIN users u ON s.user_id = u.id
      WHERE s.activity_id = ? AND s.status = 'approved'
      ORDER BY COALESCE(s.rank, 9999) ASC, COALESCE(s.final_score, 0) DESC
    `).all(activityId);

    const delWhere = activity.season_id
      ? { sql: 'WHERE season_id = ?', params: [activity.season_id] }
      : { sql: 'WHERE activity_id = ?', params: [activityId] };

    db.prepare(`DELETE FROM challenge_winners ${delWhere.sql}`).run(...delWhere.params);
    db.prepare(`UPDATE activity_submissions SET is_winner = 0, award_name = NULL WHERE activity_id = ?`).run(activityId);

    const insertWinner = db.prepare(`
      INSERT INTO challenge_winners (
        activity_id, season_id, submission_id, user_id, award_id,
        award_name, award_level, rank_position, final_score,
        jury_score, public_score, creator_score, votes_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let subIndex = 0;

    for (const award of awards) {
      for (let i = 0; i < (award.count || 1); i++) {
        if (subIndex >= approvedSubmissions.length) break;

        const sub = approvedSubmissions[subIndex];
        const rankPos = award.rank_position || (subIndex + 1);

        insertWinner.run(
          activityId, activity.season_id || null,
          sub.id, sub.user_id, award.id,
          award.award_name, award.award_level, rankPos,
          sub.final_score || 0, sub.jury_score || 0,
          sub.public_score || 0, sub.creator_score || 0,
          sub.votes_count || 0
        );

        db.prepare(`
          UPDATE activity_submissions SET
            is_winner = 1, award_name = ?, rank = ?
          WHERE id = ?
        `).run(award.award_name, rankPos, sub.id);

        winners.push({
          submission_id: sub.id,
          user_id: sub.user_id,
          username: sub.username,
          award_name: award.award_name,
          award_level: award.award_level,
          rank: rankPos,
          final_score: sub.final_score
        });

        subIndex++;
      }
    }
  }

  db.prepare(`
    UPDATE activities SET
      result_published = 1,
      result_publish_date = CURRENT_TIMESTAMP,
      status = 'ended',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(activityId);

  const finalRankings = db.prepare(`
    SELECT s.*, u.username, u.avatar
    FROM activity_submissions s
    JOIN users u ON s.user_id = u.id
    WHERE s.activity_id = ? AND s.status = 'approved'
    ORDER BY COALESCE(s.rank, 9999) ASC, COALESCE(s.final_score, 0) DESC
  `).all(activityId);

  const snapshotStmt = db.prepare(`
    INSERT INTO challenge_result_snapshots (
      activity_id, season_id, snapshot_type, rankings_data, awards_data, summary_data
    ) VALUES (?, ?, 'final', ?, ?, ?)
  `);

  snapshotStmt.run(
    activityId, activity.season_id || null,
    JSON.stringify(finalRankings),
    JSON.stringify(awards),
    JSON.stringify({
      total_submissions: finalRankings.length,
      winners_count: winners.length,
      published_at: new Date().toISOString(),
      total_votes: finalRankings.reduce((sum, s) => sum + (s.votes_count || 0), 0)
    })
  );

  for (const winner of winners) {
    db.prepare(`
      INSERT INTO notifications (user_id, type, content)
      VALUES (?, 'challenge_winner', ?)
    `).run(winner.user_id, `恭喜！您的作品在"${activity.title}"中获得「${winner.award_name}」！`);
  }

  ctx.body = {
    success: true,
    winners,
    total_rankings: finalRankings.length,
    total_winners: winners.length
  };
};

exports.getWinners = async (ctx) => {
  const { activity_id, season_id } = ctx.query;

  let where = [];
  let params = [];

  if (activity_id) {
    where.push('w.activity_id = ?');
    params.push(activity_id);
  }
  if (season_id) {
    where.push('w.season_id = ?');
    params.push(season_id);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const winners = db.prepare(`
    SELECT w.*, u.username, u.avatar, s.title as submission_title,
      s.description as submission_description, s.attachment_url,
      a.name as season_name, a.cover_url
    FROM challenge_winners w
    JOIN users u ON w.user_id = u.id
    JOIN activity_submissions s ON w.submission_id = s.id
    LEFT JOIN challenge_seasons a ON w.season_id = a.id
    ${whereSql}
    ORDER BY w.rank_position ASC, w.final_score DESC
  `).all(...params);

  ctx.body = winners;
};

exports.getRankings = async (ctx) => {
  const { activity_id, season_id, limit = 100 } = ctx.query;

  if (!activity_id && !season_id) {
    ctx.status = 400;
    ctx.body = { error: '请指定活动或赛季' };
    return;
  }

  let activity;
  if (activity_id) {
    activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(parseInt(activity_id));
    if (!activity) {
      ctx.status = 404;
      ctx.body = { error: '活动不存在' };
      return;
    }
  }

  const seasonId = activity?.season_id || parseInt(season_id);
  const activityId = activity?.id || parseInt(activity_id);

  let votingRule = db.prepare(`
    SELECT * FROM challenge_voting_rules
    WHERE (activity_id = ? OR season_id = ?)
    LIMIT 1
  `).get(activityId, seasonId);

  if (!votingRule) {
    votingRule = {
      vote_weight_public: 1.0,
      vote_weight_jury: 3.0,
      vote_weight_creator: 2.0,
      score_formula: 'weighted_sum'
    };
  }

  let whereSql = '';
  let params = [];
  if (activityId) {
    whereSql = 'WHERE s.activity_id = ? AND s.status = ?';
    params = [activityId, 'approved'];
  } else if (seasonId) {
    whereSql = `
      JOIN activities a ON s.activity_id = a.id
      WHERE a.season_id = ? AND s.status = ?
    `;
    params = [seasonId, 'approved'];
  }

  const submissions = db.prepare(`
    SELECT s.*, u.username, u.avatar
    FROM activity_submissions s
    JOIN users u ON s.user_id = u.id
    ${whereSql}
  `).all(...params);

  const rankings = [];

  for (const sub of submissions) {
    const publicVotes = db.prepare(`
      SELECT COALESCE(COUNT(*), 0) as total
      FROM activity_votes
      WHERE submission_id = ? AND vote_type = 'public'
    `).get(sub.id).total;

    const juryData = db.prepare(`
      SELECT
        COUNT(*) as review_count,
        COALESCE(AVG(total_score), 0) as avg_score
      FROM challenge_jury_scores
      WHERE submission_id = ?
    `).get(sub.id);

    const publicScore = publicVotes * votingRule.vote_weight_public;
    const juryScore = juryData.avg_score * votingRule.vote_weight_jury;
    const creatorScore = (sub.score || 0) * votingRule.vote_weight_creator;

    let finalScore;
    switch (votingRule.score_formula) {
      case 'average':
        finalScore = (publicScore + juryScore + creatorScore) / 3;
        break;
      case 'jury_only':
        finalScore = juryScore;
        break;
      case 'public_only':
        finalScore = publicScore;
        break;
      case 'weighted_sum':
      default:
        finalScore = publicScore + juryScore + creatorScore;
    }

    finalScore = Math.round(finalScore * 100) / 100;

    rankings.push({
      submission_id: sub.id,
      user_id: sub.user_id,
      username: sub.username,
      avatar: sub.avatar,
      submission_title: sub.title,
      votes_count: publicVotes,
      public_score: Math.round(publicScore * 100) / 100,
      jury_score: Math.round(juryScore * 100) / 100,
      creator_score: Math.round(creatorScore * 100) / 100,
      final_score: finalScore,
      jury_review_count: juryData.review_count,
      activity_id: sub.activity_id
    });
  }

  rankings.sort((a, b) => b.final_score - a.final_score);
  rankings.forEach((r, i) => { r.rank_position = i + 1; });

  if (limit && parseInt(limit) > 0) {
    rankings.splice(parseInt(limit));
  }

  ctx.body = {
    list: rankings,
    total: rankings.length,
    voting_rule: votingRule
  };
};

exports.adminAssignWinner = async (ctx) => {
  const {
    submission_id, award_id, award_name, award_level, rank_position, is_featured, certificate_url
  } = ctx.request.body;

  if (!submission_id) {
    ctx.status = 400;
    ctx.body = { error: '请指定作品' };
    return;
  }

  const sub = db.prepare(`
    SELECT s.*, a.season_id
    FROM activity_submissions s
    LEFT JOIN activities a ON s.activity_id = a.id
    WHERE s.id = ?
  `).get(submission_id);

  if (!sub) {
    ctx.status = 404;
    ctx.body = { error: '作品不存在' };
    return;
  }

  const award = award_id
    ? db.prepare('SELECT * FROM challenge_awards WHERE id = ?').get(award_id)
    : null;

  db.prepare(`
    INSERT INTO challenge_winners (
      activity_id, season_id, submission_id, user_id, award_id,
      award_name, award_level, rank_position, final_score,
      jury_score, public_score, votes_count, is_featured, certificate_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(submission_id) DO UPDATE SET
      award_id = excluded.award_id,
      award_name = excluded.award_name,
      award_level = excluded.award_level,
      rank_position = excluded.rank_position,
      is_featured = excluded.is_featured,
      certificate_url = excluded.certificate_url
  `).run(
    sub.activity_id, sub.season_id || null, submission_id, sub.user_id,
    award_id || null, award_name || award?.award_name || '获奖',
    award_level || award?.award_level || 'custom', rank_position || sub.rank || 1,
    sub.final_score || sub.score || 0, sub.jury_score || 0,
    sub.public_score || 0, sub.votes_count || 0,
    is_featured ? 1 : 0, certificate_url || null
  );

  db.prepare(`
    UPDATE activity_submissions SET
      is_winner = 1,
      award_name = ?,
      rank = COALESCE(?, rank)
    WHERE id = ?
  `).run(award_name || award?.award_name || '获奖', rank_position || null, submission_id);

  db.prepare(`
    INSERT INTO notifications (user_id, type, content)
    VALUES (?, 'challenge_winner', ?)
  `).run(sub.user_id, `恭喜！您的作品「${sub.title}」获得了「${award_name || award?.award_name || '获奖'}」荣誉！`);

  ctx.body = { success: true };
};

exports.getResultSnapshot = async (ctx) => {
  const { activity_id, season_id } = ctx.query;

  let where = [];
  let params = [];

  if (activity_id) {
    where.push('activity_id = ?');
    params.push(activity_id);
  }
  if (season_id) {
    where.push('season_id = ?');
    params.push(season_id);
  }

  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const snapshots = db.prepare(`
    SELECT * FROM challenge_result_snapshots
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT 10
  `).all(...params);

  snapshots.forEach(s => {
    try {
      if (s.rankings_data) s.rankings = JSON.parse(s.rankings_data);
      if (s.awards_data) s.awards = JSON.parse(s.awards_data);
      if (s.summary_data) s.summary = JSON.parse(s.summary_data);
      delete s.rankings_data;
      delete s.awards_data;
      delete s.summary_data;
    } catch (e) {}
  });

  ctx.body = snapshots;
};

exports.getSeasonOverview = async (ctx) => {
  const seasonId = parseInt(ctx.params.id);

  const season = db.prepare('SELECT * FROM challenge_seasons WHERE id = ?').get(seasonId);
  if (!season) {
    ctx.status = 404;
    ctx.body = { error: '赛季不存在' };
    return;
  }

  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT ar.user_id) as total_participants,
      COUNT(DISTINCT asub.id) as total_submissions,
      COUNT(DISTINCT CASE WHEN asub.status = 'approved' THEN asub.id END) as approved_submissions,
      COUNT(DISTINCT av.id) as total_votes
    FROM activities a
    LEFT JOIN activity_registrations ar ON ar.activity_id = a.id
    LEFT JOIN activity_submissions asub ON asub.activity_id = a.id
    LEFT JOIN activity_votes av ON av.submission_id = asub.id
    WHERE a.season_id = ?
  `).get(seasonId);

  const topCreators = db.prepare(`
    SELECT u.id, u.username, u.avatar,
      COUNT(asub.id) as submission_count,
      COALESCE(SUM(asub.votes_count), 0) as total_votes,
      COALESCE(AVG(asub.final_score), 0) as avg_score
    FROM users u
    JOIN activity_submissions asub ON asub.user_id = u.id
    JOIN activities a ON asub.activity_id = a.id
    WHERE a.season_id = ? AND asub.status = 'approved'
    GROUP BY u.id, u.username, u.avatar
    ORDER BY submission_count DESC, total_votes DESC
    LIMIT 10
  `).all(seasonId);

  const winners = db.prepare(`
    SELECT w.*, u.username, u.avatar, s.title as submission_title,
      s.attachment_url, s.description
    FROM challenge_winners w
    JOIN users u ON w.user_id = u.id
    JOIN activity_submissions s ON w.submission_id = s.id
    WHERE w.season_id = ?
    ORDER BY w.rank_position ASC, w.final_score DESC
  `).all(seasonId);

  ctx.body = {
    season,
    stats,
    top_creators: topCreators,
    winners
  };
};

exports.enhancedVote = async (ctx) => {
  const submissionId = parseInt(ctx.params.id);
  const userId = ctx.state.user.id;
  const { vote_type = 'public' } = ctx.request.body;

  const submission = db.prepare(`
    SELECT s.*, a.activity_id, a.season_id,
      act.voting_start, act.voting_end, act.season_id as act_season_id
    FROM activity_submissions s
    LEFT JOIN activities act ON s.activity_id = act.id
    WHERE s.id = ?
  `).get(submissionId);

  if (!submission) {
    ctx.status = 404;
    ctx.body = { error: '作品不存在' };
    return;
  }

  let rule = db.prepare(`
    SELECT * FROM challenge_voting_rules
    WHERE activity_id = ? OR season_id = ? OR season_id = ?
    LIMIT 1
  `).get(submission.activity_id, submission.season_id, submission.act_season_id);

  if (!rule) {
    rule = { allow_self_vote: 0, daily_vote_limit: 0, total_vote_limit_per_user: 0, max_votes_per_submission: 1 };
  }

  if (rule.allow_self_vote !== 1 && submission.user_id === userId) {
    ctx.status = 400;
    ctx.body = { error: '不能给自己的作品投票' };
    return;
  }

  const now = new Date();
  if (submission.voting_start && new Date(submission.voting_start) > now) {
    ctx.status = 400;
    ctx.body = { error: '投票尚未开始' };
    return;
  }
  if (submission.voting_end && new Date(submission.voting_end) < now) {
    ctx.status = 400;
    ctx.body = { error: '投票已结束' };
    return;
  }

  const existingVote = db.prepare(`
    SELECT * FROM activity_votes
    WHERE submission_id = ? AND user_id = ?
  `).get(submissionId, userId);

  if (existingVote) {
    db.prepare('DELETE FROM activity_votes WHERE id = ?').run(existingVote.id);
    db.prepare(`
      UPDATE activity_submissions
      SET votes_count = votes_count - 1,
          public_score = public_score - ?
      WHERE id = ?
    `).run(existingVote.weight || 1, submissionId);

    ctx.body = { success: true, canceled: true, votes_count: Math.max(0, (submission.votes_count || 1) - 1) };
    return;
  }

  if (rule.daily_vote_limit > 0) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayVotes = db.prepare(`
      SELECT COUNT(*) as count FROM activity_votes
      WHERE user_id = ? AND created_at >= ?
    `).get(userId, todayStart.toISOString()).count;

    if (todayVotes >= rule.daily_vote_limit) {
      ctx.status = 400;
      ctx.body = { error: `今日投票已达上限(${rule.daily_vote_limit}票)` };
      return;
    }
  }

  if (rule.total_vote_limit_per_user > 0) {
    const userVotes = db.prepare(`
      SELECT COUNT(*) as count FROM activity_votes v
      JOIN activity_submissions s ON v.submission_id = s.id
      WHERE v.user_id = ? AND (s.activity_id = ? OR s.activity_id IN (SELECT id FROM activities WHERE season_id = ?))
    `).get(userId, submission.activity_id, submission.act_season_id || submission.season_id).count;

    if (userVotes >= rule.total_vote_limit_per_user) {
      ctx.status = 400;
      ctx.body = { error: `您的投票已达上限(${rule.total_vote_limit_per_user}票)` };
      return;
    }
  }

  let weight = 1.0;
  if (vote_type === 'jury') {
    weight = rule.vote_weight_jury || 3.0;
  } else if (vote_type === 'creator') {
    weight = rule.vote_weight_creator || 2.0;
  } else {
    weight = rule.vote_weight_public || 1.0;
  }

  db.prepare(`
    INSERT INTO activity_votes (submission_id, user_id, vote_type, weight, score)
    VALUES (?, ?, ?, ?, ?)
  `).run(submissionId, userId, vote_type, weight, weight);

  const newCount = (submission.votes_count || 0) + 1;
  db.prepare(`
    UPDATE activity_submissions
    SET votes_count = ?,
        public_score = COALESCE(public_score, 0) + ?,
        score = score + ?
    WHERE id = ?
  `).run(newCount, weight, Math.round(weight), submissionId);

  ctx.body = { success: true, votes_count: newCount, weight };
};

exports.getPendingJuryReviews = async (ctx) => {
  const userId = ctx.state.user.id;
  const { activity_id, season_id } = ctx.query;

  let juryWhere = ['user_id = ?', "status = 'active'"];
  let juryParams = [userId];

  if (activity_id) {
    juryWhere.push('activity_id = ?');
    juryParams.push(activity_id);
  }
  if (season_id) {
    juryWhere.push('season_id = ?');
    juryParams.push(season_id);
  }

  const juryList = db.prepare(`
    SELECT * FROM challenge_jury
    WHERE ${juryWhere.join(' AND ')}
  `).all(...juryParams);

  if (juryList.length === 0) {
    ctx.body = { pending: [], reviewed: [], total_pending: 0 };
    return;
  }

  const activityIds = juryList.map(j => j.activity_id).filter(Boolean);
  const seasonIds = juryList.map(j => j.season_id).filter(Boolean);

  let where = ["s.status = 'approved'"];
  let params = [];

  if (activityIds.length > 0) {
    where.push(`s.activity_id IN (${activityIds.map(() => '?').join(',')})`);
    params.push(...activityIds);
  }
  if (seasonIds.length > 0) {
    where.push(`s.activity_id IN (SELECT id FROM activities WHERE season_id IN (${seasonIds.map(() => '?').join(',')}))`);
    params.push(...seasonIds);
  }

  const whereSql = 'WHERE ' + where.join(' AND ');

  const allSubmissions = db.prepare(`
    SELECT s.*, u.username, a.title as activity_title, a.id as activity_id
    FROM activity_submissions s
    JOIN users u ON s.user_id = u.id
    JOIN activities a ON s.activity_id = a.id
    ${whereSql}
    ORDER BY s.created_at DESC
  `).all(...params);

  const reviewedIds = new Set(
    db.prepare(`
      SELECT submission_id FROM challenge_jury_scores
      WHERE jury_id IN (${juryList.map(() => '?').join(',')})
    `).all(...juryList.map(j => j.id)).map(r => r.submission_id)
  );

  const pending = allSubmissions.filter(s => !reviewedIds.has(s.id));
  const reviewed = allSubmissions.filter(s => reviewedIds.has(s.id));

  const scores = db.prepare(`
    SELECT js.submission_id, js.*
    FROM challenge_jury_scores js
    WHERE js.jury_id IN (${juryList.map(() => '?').join(',')})
  `).all(...juryList.map(j => j.id));

  const scoreMap = {};
  scores.forEach(s => { scoreMap[s.submission_id] = s; });

  reviewed.forEach(s => {
    s.my_score = scoreMap[s.id];
  });

  ctx.body = {
    pending,
    reviewed,
    total_pending: pending.length,
    total_reviewed: reviewed.length
  };
};
