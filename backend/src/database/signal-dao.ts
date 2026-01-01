/**
 * 信号数据访问对象 (DAO)
 * 提供对 signals 表的 CRUD 操作
 * 使用 sql.js 实现
 */

import { getDatabase, saveDatabase } from './schema.js';
import type { Signal } from '../types/index.js';

export class SignalDAO {
  private db: Awaited<ReturnType<typeof getDatabase>> | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    this.db = await getDatabase();
  }

  private async getDb() {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  /**
   * 插入或更新信号
   */
  async upsert(signal: Signal): Promise<void> {
    const db = await this.getDb();

    // 检查是否已存在
    const checkStmt = db.prepare('SELECT id FROM signals WHERE tweet_id = ?');
    const existing = checkStmt.getAsObject([signal.tweetId]) as any;
    checkStmt.free();

    if (existing && existing.id) {
      // 更新
      const stmt = db.prepare(`
        UPDATE signals SET
          type = ?, score = ?, summary = ?, description = ?, reason = ?,
          action_plan = ?, matched_skills = ?, competition = ?,
          original_tweet = ?, expires_at = ?
        WHERE tweet_id = ?
      `);
      stmt.run([
        signal.type,
        signal.score,
        signal.summary,
        signal.description || '',
        signal.reason || '',
        JSON.stringify(signal.actionPlan || []),
        JSON.stringify(signal.matchedSkills || []),
        signal.competition || '',
        JSON.stringify(signal.originalTweet),
        signal.expiresAt.toISOString(),
        signal.tweetId,
      ]);
      stmt.free();
    } else {
      // 插入
      const stmt = db.prepare(`
        INSERT INTO signals (
          id, tweet_id, type, score, summary, description, reason,
          action_plan, matched_skills, competition, original_tweet,
          created_at, expires_at, is_saved, saved_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run([
        signal.id,
        signal.tweetId,
        signal.type,
        signal.score,
        signal.summary,
        signal.description || '',
        signal.reason || '',
        JSON.stringify(signal.actionPlan || []),
        JSON.stringify(signal.matchedSkills || []),
        signal.competition || '',
        JSON.stringify(signal.originalTweet),
        signal.createdAt.toISOString(),
        signal.expiresAt.toISOString(),
        signal.saved ? 1 : 0,
        signal.saved ? new Date().toISOString() : null,
      ]);
      stmt.free();
    }

    saveDatabase(db);
  }

  /**
   * 获取所有信号
   */
  async getAll(options?: {
    limit?: number;
    offset?: number;
    type?: string;
    savedOnly?: boolean;
  }): Promise<Signal[]> {
    const db = await this.getDb();

    let sql = 'SELECT * FROM signals WHERE 1=1';
    const params: any[] = [];

    if (options?.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    if (options?.savedOnly) {
      sql += ' AND is_saved = 1';
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = db.prepare(sql);
    const results = stmt.getAsObject(params) as any;
    stmt.free();

    // sql.js returns either an array of rows or a single row
    const rows = Array.isArray(results) ? results : (results ? [results] : []);
    return rows.map(this.rowToSignal);
  }

  /**
   * 根据 ID 获取信号
   */
  async getById(id: string): Promise<Signal | null> {
    const db = await this.getDb();

    const stmt = db.prepare('SELECT * FROM signals WHERE id = ?');
    const result = stmt.getAsObject([id]) as any;
    stmt.free();

    if (!result || Object.keys(result).length === 0) {
      return null;
    }

    return this.rowToSignal(result);
  }

  /**
   * 切换保存状态
   */
  async toggleSaved(id: string): Promise<boolean> {
    const db = await this.getDb();

    // 首先获取当前状态
    const selectStmt = db.prepare('SELECT is_saved FROM signals WHERE id = ?');
    const result = selectStmt.getAsObject([id]) as any;
    selectStmt.free();

    if (!result || Object.keys(result).length === 0) {
      return false;
    }

    const newSavedStatus = result.is_saved === 0 ? 1 : 0;

    // 更新状态
    const updateStmt = db.prepare(`
      UPDATE signals
      SET is_saved = ?,
          saved_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
      WHERE id = ?
    `);
    updateStmt.run([newSavedStatus, newSavedStatus, id]);
    updateStmt.free();

    saveDatabase(db);
    return newSavedStatus === 1;
  }

  /**
   * 设置保存状态
   */
  async setSaved(id: string, saved: boolean): Promise<boolean> {
    const db = await this.getDb();

    const stmt = db.prepare(`
      UPDATE signals
      SET is_saved = ?,
          saved_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
      WHERE id = ?
    `);
    stmt.run([saved ? 1 : 0, saved ? 1 : 0, id]);
    stmt.free();

    saveDatabase(db);

    // 检查是否更新成功
    const checkStmt = db.prepare('SELECT changes() as changes');
    const changesResult = checkStmt.getAsObject([]) as any;
    checkStmt.free();

    return changesResult.changes > 0;
  }

  /**
   * 删除信号
   */
  async delete(id: string): Promise<boolean> {
    const db = await this.getDb();

    const stmt = db.prepare('DELETE FROM signals WHERE id = ?');
    stmt.run([id]);
    stmt.free();

    // 检查是否删除成功
    const checkStmt = db.prepare('SELECT changes() as changes');
    const changesResult = checkStmt.getAsObject([]) as any;
    checkStmt.free();

    saveDatabase(db);
    return changesResult.changes > 0;
  }

  /**
   * 删除过期信号
   */
  async deleteExpired(): Promise<number> {
    const db = await this.getDb();

    const stmt = db.prepare('DELETE FROM signals WHERE datetime(expires_at) < datetime("now")');
    stmt.run([]);
    stmt.free();

    // 获取删除的行数
    const checkStmt = db.prepare('SELECT changes() as changes');
    const changesResult = checkStmt.getAsObject([]) as any;
    checkStmt.free();

    saveDatabase(db);
    return changesResult.changes || 0;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    total: number;
    saved: number;
    byType: Record<string, number>;
  }> {
    const db = await this.getDb();

    // 使用 exec() 执行查询
    const totalResult = db.exec('SELECT COUNT(*) as count FROM signals');
    const total = totalResult[0]?.values[0]?.[0] as number || 0;

    const savedResult = db.exec('SELECT COUNT(*) as count FROM signals WHERE is_saved = 1');
    const saved = savedResult[0]?.values[0]?.[0] as number || 0;

    const typeResult = db.exec('SELECT type, COUNT(*) as count FROM signals GROUP BY type');
    const typeRows = typeResult[0]?.values || [];

    const byType: Record<string, number> = {
      demand: 0,
      revenue: 0,
      skill: 0,
      trend: 0,
    };

    for (const row of typeRows as any[][]) {
      byType[row[0]] = row[1];
    }

    return {
      total,
      saved,
      byType,
    };
  }

  /**
   * 将数据库行转换为 Signal 对象
   */
  private rowToSignal(row: any): Signal {
    return {
      id: row.id,
      tweetId: row.tweet_id,
      type: row.type as any,
      score: row.score,
      summary: row.summary,
      description: row.description || '',
      reason: row.reason || '',
      actionPlan: JSON.parse(row.action_plan || '[]'),
      matchedSkills: JSON.parse(row.matched_skills || '[]'),
      competition: row.competition || '',
      originalTweet: JSON.parse(row.original_tweet),
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      saved: row.is_saved === 1,
    };
  }
}

// 导出单例
export const signalDAO = new SignalDAO();
