require('dotenv').config();
const db = require('../src/db');

console.log('开始迁移 Patch 挑战赛模块...');

db.exec(`
  PRAGMA foreign_keys = OFF;

  CREATE TABLE IF NOT EXISTS challenge_seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    season_no INTEGER NOT NULL,
    year INTEGER NOT NULL,
    theme TEXT,
    description TEXT,
    cover_url TEXT,
    banner_url TEXT,
    status TEXT DEFAULT 'draft',
    start_date DATETIME,
    end_date DATETIME,
    registration_start DATETIME,
    registration_end DATETIME,
    submission_start DATETIME,
    submission_end DATETIME,
    voting_start DATETIME,
    voting_end DATETIME,
    result_publish_date DATETIME,
    max_registrations INTEGER DEFAULT 0,
    max_submissions_per_user INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, season_no)
  );

  CREATE TABLE IF NOT EXISTS challenge_voting_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER,
    season_id INTEGER,
    rule_name TEXT NOT NULL,
    rule_type TEXT DEFAULT 'public',
    allow_self_vote INTEGER DEFAULT 0,
    daily_vote_limit INTEGER DEFAULT 0,
    total_vote_limit_per_user INTEGER DEFAULT 0,
    max_votes_per_submission INTEGER DEFAULT 1,
    vote_weight_public REAL DEFAULT 1.0,
    vote_weight_jury REAL DEFAULT 3.0,
    vote_weight_creator REAL DEFAULT 2.0,
    score_formula TEXT DEFAULT 'weighted_sum',
    score_weights TEXT,
    min_jury_reviews INTEGER DEFAULT 0,
    require_jury_score INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES challenge_seasons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS challenge_awards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER,
    season_id INTEGER,
    award_name TEXT NOT NULL,
    award_level TEXT DEFAULT 'custom',
    rank_position INTEGER,
    prize_description TEXT,
    reward_coins INTEGER DEFAULT 0,
    badge_url TEXT,
    count INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES challenge_seasons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS challenge_winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER,
    season_id INTEGER,
    submission_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    award_id INTEGER,
    award_name TEXT NOT NULL,
    award_level TEXT,
    rank_position INTEGER,
    final_score REAL DEFAULT 0,
    jury_score REAL DEFAULT 0,
    public_score REAL DEFAULT 0,
    creator_score REAL DEFAULT 0,
    votes_count INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    certificate_url TEXT,
    awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES challenge_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (submission_id) REFERENCES activity_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (award_id) REFERENCES challenge_awards(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS challenge_jury (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER,
    season_id INTEGER,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'jury',
    status TEXT DEFAULT 'active',
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES challenge_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(activity_id, user_id),
    UNIQUE(season_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS challenge_jury_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    jury_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    dimension1_score REAL DEFAULT 0,
    dimension2_score REAL DEFAULT 0,
    dimension3_score REAL DEFAULT 0,
    dimension4_score REAL DEFAULT 0,
    dimension5_score REAL DEFAULT 0,
    total_score REAL DEFAULT 0,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES activity_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (jury_id) REFERENCES challenge_jury(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(submission_id, jury_id)
  );

  CREATE TABLE IF NOT EXISTS challenge_result_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER,
    season_id INTEGER,
    snapshot_type TEXT DEFAULT 'final',
    rankings_data TEXT,
    awards_data TEXT,
    summary_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL,
    FOREIGN KEY (season_id) REFERENCES challenge_seasons(id) ON DELETE SET NULL
  );
`);

const columns = db.prepare("PRAGMA table_info(activities)").all().map(c => c.name);

if (!columns.includes('voting_start')) {
  db.exec(`
    ALTER TABLE activities ADD COLUMN voting_start DATETIME;
    ALTER TABLE activities ADD COLUMN voting_end DATETIME;
    ALTER TABLE activities ADD COLUMN season_id INTEGER REFERENCES challenge_seasons(id) ON DELETE SET NULL;
    ALTER TABLE activities ADD COLUMN challenge_config TEXT;
    ALTER TABLE activities ADD COLUMN result_published INTEGER DEFAULT 0;
    ALTER TABLE activities ADD COLUMN result_publish_date DATETIME;
  `);
  console.log('已扩展 activities 表');
}

const subColumns = db.prepare("PRAGMA table_info(activity_submissions)").all().map(c => c.name);

if (!subColumns.includes('jury_score')) {
  db.exec(`
    ALTER TABLE activity_submissions ADD COLUMN jury_score REAL DEFAULT 0;
    ALTER TABLE activity_submissions ADD COLUMN public_score REAL DEFAULT 0;
    ALTER TABLE activity_submissions ADD COLUMN creator_score REAL DEFAULT 0;
    ALTER TABLE activity_submissions ADD COLUMN final_score REAL DEFAULT 0;
    ALTER TABLE activity_submissions ADD COLUMN dimensions_score TEXT;
    ALTER TABLE activity_submissions ADD COLUMN is_winner INTEGER DEFAULT 0;
    ALTER TABLE activity_submissions ADD COLUMN award_name TEXT;
  `);
  console.log('已扩展 activity_submissions 表');
}

const voteColumns = db.prepare("PRAGMA table_info(activity_votes)").all().map(c => c.name);

if (!voteColumns.includes('vote_type')) {
  db.exec(`
    ALTER TABLE activity_votes ADD COLUMN vote_type TEXT DEFAULT 'public';
    ALTER TABLE activity_votes ADD COLUMN weight REAL DEFAULT 1.0;
  `);
  console.log('已扩展 activity_votes 表');
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_seasons_status ON challenge_seasons(status, year);
  CREATE INDEX IF NOT EXISTS idx_winners_submission ON challenge_winners(submission_id);
  CREATE INDEX IF NOT EXISTS idx_winners_season ON challenge_winners(season_id, award_level);
  CREATE INDEX IF NOT EXISTS idx_jury_scores_submission ON challenge_jury_scores(submission_id);
  CREATE INDEX IF NOT EXISTS idx_snapshots_season ON challenge_result_snapshots(season_id);
  CREATE INDEX IF NOT EXISTS idx_votes_type ON activity_votes(vote_type);
`);

console.log('Patch 挑战赛模块数据库迁移完成！');
