/**
 * RawTweet DAO - 原始推文数据访问对象
 *
 * 负责管理尚未完成 AI 分析的推文
 * 使用 sql.js 实现
 */

import { getDatabase, saveDatabase } from './schema.js';
import { logger } from '../utils/logger.js';
import type { RawTweet, TweetData, SignalType } from '../types/index.js';

export class RawTweetDAO {
  private db: Awaited<ReturnType<typeof getDatabase>> | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    this.db = await getDatabase();
    this.initializeTable();
  }

  private async getDb() {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  /**
   * 初始化表结构
   */
  private initializeTable(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS raw_tweets (
        id TEXT PRIMARY KEY,
        tweet_data TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending_analysis', 'analyzing', 'completed', 'failed')),
        predicted_type TEXT,
        created_at TEXT NOT NULL,
        signal_id TEXT,
        error TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_raw_tweets_status ON raw_tweets(status);
      CREATE INDEX IF NOT EXISTS idx_raw_tweets_created_at ON raw_tweets(created_at DESC);
    `;

    if (this.db) {
      this.db.exec(createTableSQL);
      logger.info('[RawTweetDAO] Table initialized');
    }
  }

  /**
   * 创建原始推文记录
   */
  async create(tweet: TweetData, predictedType?: SignalType): Promise<RawTweet> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    const rawTweet: RawTweet = {
      id: `raw_${tweet.id}_${Date.now()}`,
      tweetData: tweet,
      status: 'pending_analysis',
      predictedType,
      createdAt: new Date(now),
    };

    const insertSQL = `
      INSERT INTO raw_tweets (id, tweet_data, status, predicted_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const stmt = db.prepare(insertSQL);
    stmt.run([
      rawTweet.id,
      JSON.stringify(tweet),
      rawTweet.status,
      predictedType || null,
      now,
      now
    ]);
    stmt.free();

    saveDatabase(db);
    logger.debug(`[RawTweetDAO] Created raw tweet: ${rawTweet.id}`);
    return rawTweet;
  }

  /**
   * 批量创建原始推文记录
   */
  async createBatch(tweets: TweetData[], predictedTypes?: Map<string, SignalType>): Promise<RawTweet[]> {
    const db = await this.getDb();
    const rawTweets: RawTweet[] = [];
    const now = new Date().toISOString();

    const insertSQL = `
      INSERT INTO raw_tweets (id, tweet_data, status, predicted_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    for (const tweet of tweets) {
      const rawTweet: RawTweet = {
        id: `raw_${tweet.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        tweetData: tweet,
        status: 'pending_analysis',
        predictedType: predictedTypes?.get(tweet.id),
        createdAt: new Date(now),
      };

      const stmt = db.prepare(insertSQL);
      stmt.run([
        rawTweet.id,
        JSON.stringify(tweet),
        rawTweet.status,
        rawTweet.predictedType || null,
        now,
        now
      ]);
      stmt.free();

      rawTweets.push(rawTweet);
    }

    saveDatabase(db);
    logger.info(`[RawTweetDAO] Created ${rawTweets.length} raw tweets in batch`);
    return rawTweets;
  }

  /**
   * 根据 ID 获取原始推文
   */
  async getById(id: string): Promise<RawTweet | null> {
    const db = await this.getDb();
    const stmt = db.prepare('SELECT * FROM raw_tweets WHERE id = ?');
    const result = stmt.getAsObject([id]) as any;
    stmt.free();

    if (!result || Object.keys(result).length === 0) return null;

    return this.mapRowToRawTweet(result);
  }

  /**
   * 根据 tweet ID 获取原始推文
   */
  async getByTweetId(tweetId: string): Promise<RawTweet | null> {
    const db = await this.getDb();
    const stmt = db.prepare('SELECT * FROM raw_tweets WHERE id LIKE ? ORDER BY created_at DESC LIMIT 1');
    const result = stmt.getAsObject([`${tweetId}%`]) as any;
    stmt.free();

    if (!result || Object.keys(result).length === 0) return null;

    return this.mapRowToRawTweet(result);
  }

  /**
   * 获取所有待分析的推文
   */
  async getPendingAnalysis(limit: number = 50): Promise<RawTweet[]> {
    const db = await this.getDb();
    const sql = `
      SELECT * FROM raw_tweets
      WHERE status = 'pending_analysis'
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;

    const results = db.exec(sql);
    return this.execResultsToRawTweets(results);
  }

  /**
   * 获取正在分析的推文
   */
  async getAnalyzing(): Promise<RawTweet[]> {
    const db = await this.getDb();
    const sql = `
      SELECT * FROM raw_tweets
      WHERE status = 'analyzing'
      ORDER BY created_at ASC
    `;

    const results = db.exec(sql);
    return this.execResultsToRawTweets(results);
  }

  /**
   * 更新状态为分析中
   */
  async updateStatusToAnalyzing(id: string): Promise<boolean> {
    const db = await this.getDb();
    const stmt = db.prepare(`
      UPDATE raw_tweets
      SET status = 'analyzing', updated_at = ?
      WHERE id = ? AND status = 'pending_analysis'
    `);
    stmt.run([new Date().toISOString(), id]);
    stmt.free();

    // Check changes
    const checkStmt = db.prepare('SELECT changes() as changes');
    const changesResult = checkStmt.getAsObject([]) as any;
    checkStmt.free();

    saveDatabase(db);
    return changesResult.changes > 0;
  }

  /**
   * 标记分析完成，关联 Signal
   */
  async markCompleted(id: string, signalId: string): Promise<boolean> {
    const db = await this.getDb();
    const stmt = db.prepare(`
      UPDATE raw_tweets
      SET status = 'completed', signal_id = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run([signalId, new Date().toISOString(), id]);
    stmt.free();

    const checkStmt = db.prepare('SELECT changes() as changes');
    const changesResult = checkStmt.getAsObject([]) as any;
    checkStmt.free();

    saveDatabase(db);
    return changesResult.changes > 0;
  }

  /**
   * 标记分析失败
   */
  async markFailed(id: string, error: string): Promise<boolean> {
    const db = await this.getDb();
    const stmt = db.prepare(`
      UPDATE raw_tweets
      SET status = 'failed', error = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run([error, new Date().toISOString(), id]);
    stmt.free();

    const checkStmt = db.prepare('SELECT changes() as changes');
    const changesResult = checkStmt.getAsObject([]) as any;
    checkStmt.free();

    saveDatabase(db);
    return changesResult.changes > 0;
  }

  /**
   * 获取最近的原始推文（包括已完成和失败的）
   */
  async getRecent(limit: number = 20, includeCompleted: boolean = false): Promise<RawTweet[]> {
    const db = await this.getDb();
    let sql = `
      SELECT * FROM raw_tweets
      WHERE status IN ('pending_analysis', 'analyzing'
    `;

    if (includeCompleted) {
      sql += ", 'completed', 'failed'";
    }

    sql += `
      )
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const results = db.exec(sql);
    return this.execResultsToRawTweets(results);
  }

  /**
   * 清理过期的原始推文（超过 24 小时）
   */
  async cleanupExpired(): Promise<number> {
    const db = await this.getDb();
    const expiryTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const stmt = db.prepare('DELETE FROM raw_tweets WHERE datetime(created_at) < datetime(?) AND status IN ("completed", "failed")');
    stmt.run([expiryTime]);
    stmt.free();

    const checkStmt = db.prepare('SELECT changes() as changes');
    const changesResult = checkStmt.getAsObject([]) as any;
    checkStmt.free();

    saveDatabase(db);
    const count = changesResult.changes || 0;
    logger.info(`[RawTweetDAO] Cleaned up ${count} expired raw tweets`);
    return count;
  }

  /**
   * 将 db.exec() 的结果转换为 RawTweet 数组
   */
  private execResultsToRawTweets(results: any[]): RawTweet[] {
    if (!results || results.length === 0) {
      return [];
    }

    const columns = results[0].columns;
    const values = results[0].values;

    const rows = values.map(row => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    return rows.map(row => this.mapRowToRawTweet(row));
  }

  /**
   * 映射数据库行到 RawTweet 对象
   */
  private mapRowToRawTweet(row: any): RawTweet {
    return {
      id: row.id,
      tweetData: JSON.parse(row.tweet_data),
      status: row.status,
      predictedType: row.predicted_type,
      createdAt: new Date(row.created_at),
      signalId: row.signal_id,
      error: row.error,
    };
  }
}
