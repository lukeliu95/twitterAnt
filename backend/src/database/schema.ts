/**
 * SQLite 数据库 Schema 定义
 * Local First 架构 - 用户数据存储在本地
 * 使用 sql.js (纯 JavaScript SQLite，无需原生编译)
 */

import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'money-signal.db');
const DATA_DIR = join(process.cwd(), 'data');

// 全局数据库实例
let dbInstance: Database | null = null;
let SqlJsModule: any = null;

/**
 * 初始化 sql.js
 */
async function initSqlJsModule(): Promise<any> {
  if (!SqlJsModule) {
    SqlJsModule = await initSqlJs();
  }
  return SqlJsModule;
}

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<Database> {
  await initSqlJsModule();

  // 确保 data 目录存在
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  let db: Database;

  // 如果数据库文件已存在，加载它
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SqlJsModule.Database(buffer);
    console.log('[Database] Loaded existing database from', DB_PATH);
  } else {
    // 创建新数据库
    db = new SqlJsModule.Database();
    console.log('[Database] Created new database');
  }

  // 迁移：更新 signals 表以支持新版信号类型（v0.3）
  migrateSignalTypes(db);

  // 创建信号表（v0.3 - 支持新版信号类型）
  db.run(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      tweet_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN (
        'tech_product', 'business_startup', 'income_monetization', 'data_insights',
        'skills_learning', 'opinion_discussion', 'social_viral',
        'viral', 'insightful', 'data_driven', 'industry_news', 'controversial',
        'demand', 'revenue', 'skill', 'trend'
      )),
      score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
      summary TEXT NOT NULL,
      description TEXT,
      reason TEXT,
      action_plan TEXT,
      matched_skills TEXT,
      competition TEXT,
      original_tweet TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_saved INTEGER DEFAULT 0 CHECK(is_saved IN (0, 1)),
      saved_at TEXT,
      user_notes TEXT DEFAULT '',
      UNIQUE(tweet_id)
    );
  `);

  // 如果 user_notes 列不存在（向后兼容），添加它
  try {
    db.run(`ALTER TABLE signals ADD COLUMN user_notes TEXT DEFAULT '';`);
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(type);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_signals_score ON signals(score DESC);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_signals_created ON signals(created_at DESC);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_signals_saved ON signals(is_saved, saved_at DESC);`);

  // 保存数据库到文件
  saveDatabase(db);

  return db;
}

/**
 * 迁移：更新 signals 表以支持新版信号类型
 * SQLite 不支持直接修改 CHECK 约束，需要重建表
 */
function migrateSignalTypes(db: Database): void {
  try {
    // 检查表是否存在
    const checkResult = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='signals'`);
    if (!checkResult || checkResult.length === 0) {
      return; // 表不存在，无需迁移
    }

    // 检查是否需要迁移（查看旧约束）
    const schemaResult = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='signals'`);
    if (schemaResult && schemaResult.length > 0) {
      const currentSchema = schemaResult[0].values[0][0] as string;
      // 如果已经包含新版类型，无需迁移
      if (currentSchema.includes("'tech_product'") || currentSchema.includes("'social_viral'")) {
        console.log('[Database] Signal types already migrated, skipping');
        return;
      }
    }

    console.log('[Database] Migrating signals table for v0.3...');

    // 1. 创建新表
    db.run(`
      CREATE TABLE signals_new (
        id TEXT PRIMARY KEY,
        tweet_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN (
          'tech_product', 'business_startup', 'income_monetization', 'data_insights',
          'skills_learning', 'opinion_discussion', 'social_viral',
          'viral', 'insightful', 'data_driven', 'industry_news', 'controversial',
          'demand', 'revenue', 'skill', 'trend'
        )),
        score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
        summary TEXT NOT NULL,
        description TEXT,
        reason TEXT,
        action_plan TEXT,
        matched_skills TEXT,
        competition TEXT,
        original_tweet TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        is_saved INTEGER DEFAULT 0 CHECK(is_saved IN (0, 1)),
        saved_at TEXT,
        user_notes TEXT DEFAULT '',
        UNIQUE(tweet_id)
      );
    `);

    // 2. 复制数据
    db.run(`
      INSERT INTO signals_new
      SELECT * FROM signals
    `);

    // 3. 删除旧表
    db.run(`DROP TABLE signals;`);

    // 4. 重命名新表
    db.run(`ALTER TABLE signals_new RENAME TO signals;`);

    console.log('[Database] Signals table migrated successfully');
  } catch (e) {
    // 可能表已经是新版或迁移失败，忽略错误
    console.log('[Database] Migration skipped or failed:', e);
  }
}

/**
 * 保存数据库到文件
 */
export function saveDatabase(db: Database): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

/**
 * 获取数据库实例（单例模式）
 */
export async function getDatabase(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await initDatabase();
  }
  return dbInstance;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (dbInstance) {
    saveDatabase(dbInstance);
    dbInstance.close();
    dbInstance = null;
  }
}
