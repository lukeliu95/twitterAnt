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

  // 创建信号表
  db.run(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      tweet_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('demand', 'revenue', 'skill', 'trend')),
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
