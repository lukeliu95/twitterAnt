/**
 * 延长信号过期时间
 * 将所有信号的过期时间延长到 30 天后
 */

import { getDatabase, saveDatabase } from '../database/schema.js';

async function extendExpiry(): Promise<void> {
  console.log('🔧 Extending signal expiry times...\n');

  const db = await getDatabase();

  // 查询所有过期信号
  const results = db.exec(`
    SELECT id, expires_at, created_at
    FROM signals
    WHERE datetime(expires_at) < datetime('now', '+30 days')
  `);

  if (!results || results.length === 0 || !results[0] || !results[0].values) {
    console.log('✅ No signals need expiry extension\n');
    return;
  }

  const rows = results[0].values;
  console.log(`📊 Found ${rows.length} signals to extend\n`);

  // 将过期时间延长到 30 天后
  const stmt = db.prepare(`
    UPDATE signals
    SET expires_at = datetime('now', '+30 days')
    WHERE datetime(expires_at) < datetime('now', '+30 days')
  `);
  stmt.run([]);
  stmt.free();

  saveDatabase(db);

  console.log(`✅ Extended ${rows.length} signals to expire in 30 days\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // 显示更新后的统计
  const countResults = db.exec('SELECT COUNT(*) as count FROM signals');
  const total = countResults[0]?.values[0]?.[0] as number || 0;
  console.log(`📊 Total signals: ${total}\n`);
}

extendExpiry()
  .then(() => {
    console.log('🎉 Expiry extension completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
