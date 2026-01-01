/**
 * 信号数据访问对象 (DAO)
 * 提供对 signals 表的 CRUD 操作
 * 使用 sql.js 实现
 */

import { getDatabase, saveDatabase } from './schema.js';
import type { Signal } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { SignalValidator } from '../utils/validator.js';

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
  async upsert(signal: Partial<Signal>): Promise<void> {
    // 在保存前验证和清理数据
    const validatedSignal = SignalValidator.validate(signal);
    const db = await this.getDb();

    // 检查是否已存在
    const checkStmt = db.prepare('SELECT id FROM signals WHERE tweet_id = ?');
    const existing = checkStmt.getAsObject([validatedSignal.tweetId]) as any;
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
        validatedSignal.type,
        validatedSignal.score,
        validatedSignal.summary,
        validatedSignal.description || '',
        validatedSignal.reason || '',
        JSON.stringify(validatedSignal.actionPlan || []),
        JSON.stringify(validatedSignal.matchedSkills || []),
        validatedSignal.competition || '',
        JSON.stringify(validatedSignal.originalTweet),
        validatedSignal.expiresAt.toISOString(),
        validatedSignal.tweetId,
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
        validatedSignal.id,
        validatedSignal.tweetId,
        validatedSignal.type,
        validatedSignal.score,
        validatedSignal.summary,
        validatedSignal.description || '',
        validatedSignal.reason || '',
        JSON.stringify(validatedSignal.actionPlan || []),
        JSON.stringify(validatedSignal.matchedSkills || []),
        validatedSignal.competition || '',
        JSON.stringify(validatedSignal.originalTweet),
        validatedSignal.createdAt.toISOString(),
        validatedSignal.expiresAt.toISOString(),
        validatedSignal.saved ? 1 : 0,
        validatedSignal.saved ? new Date().toISOString() : null,
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

    // 使用 exec() 来获取所有行
    // 如果有参数，需要替换 SQL 中的占位符
    let finalSql = sql;
    let paramIndex = 0;

    // 简单的参数替换（仅用于字符串和数字）
    finalSql = sql.replace(/\?/g, () => {
      const param = params[paramIndex++];
      if (typeof param === 'string') {
        return `'${param.replace(/'/g, "''")}'`;
      }
      return String(param);
    });

    const results = db.exec(finalSql);

    // sql.js exec() 返回结果数组
    if (!results || results.length === 0) {
      return [];
    }

    // results[0].values 包含所有行数据
    const columns = results[0].columns;
    const values = results[0].values;

    // 将值数组转换为对象数组
    const rows = values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });

    return rows.map(row => this.rowToSignal(row));
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
   * 安全的 JSON 解析辅助函数
   * 处理 "undefined" 字符串、null、空字符串等边缘情况
   */
  private safeJSONParse<T>(value: any, defaultValue: T): T {
    // 处理 null、undefined
    if (value === null || value === undefined) {
      return defaultValue;
    }

    // 处理空字符串
    if (value === '') {
      return defaultValue;
    }

    // 处理字符串 "undefined"
    if (typeof value === 'string' && value === 'undefined') {
      logger.warn(`Encountered string "undefined" in database, using default value`);
      return defaultValue;
    }

    // 如果已经是解析后的对象（某些情况下），直接返回
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as T;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn(`JSON parse failed for value: "${value}", using default value`, error);
      return defaultValue;
    }
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
      actionPlan: this.safeJSONParse<string[]>(row.action_plan, []),
      matchedSkills: this.safeJSONParse<string[]>(row.matched_skills, []),
      competition: row.competition || '',
      originalTweet: this.safeJSONParse<any>(row.original_tweet, {}),
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      saved: row.is_saved === 1,
      userNotes: row.user_notes || '',
    };
  }

  /**
   * 更新用户备注
   */
  async updateNotes(id: string, notes: string): Promise<boolean> {
    const db = await this.getDb();

    // 首先检查信号是否存在
    const checkStmt = db.prepare('SELECT id FROM signals WHERE id = ?');
    const existing = checkStmt.getAsObject([id]) as any;
    checkStmt.free();

    if (!existing || !existing.id) {
      return false;
    }

    // 更新备注
    const stmt = db.prepare('UPDATE signals SET user_notes = ? WHERE id = ?');
    stmt.run([notes || '', id]);
    stmt.free();

    saveDatabase(db);
    return true;
  }
}

// 导出单例
export const signalDAO = new SignalDAO();
