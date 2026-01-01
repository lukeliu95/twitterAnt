/**
 * 数据库修复脚本
 *
 * 功能：
 * - 修复所有包含 "undefined" 字符串的记录
 * - 将 "undefined" 替换为有效的 JSON（空数组或空对象）
 * - 清理空字符串值
 *
 * 运行方式：
 * pnpm run repair-data
 */

import { getDatabase, saveDatabase } from '../database/schema.js';

/**
 * 修复单个值
 */
function repairValue(value: any, type: 'array' | 'object'): string {
  // 如果已经是有效值，直接返回
  if (value && value !== 'undefined' && value !== '') {
    // 尝试验证是否为有效 JSON
    try {
      JSON.parse(value);
      return value;
    } catch {
      // 不是有效 JSON，需要修复
    }
  }

  // 修复 "undefined" 字符串或空字符串
  if (value === 'undefined' || value === '' || value === null || value === undefined) {
    return type === 'array' ? '[]' : '{}';
  }

  return value;
}

/**
 * 修复数据库
 */
async function repairDatabase(): Promise<void> {
  console.log('🔧 Starting database repair...\n');

  const db = await getDatabase();

  // 查询所有记录
  const results = db.exec('SELECT id, action_plan, matched_skills, original_tweet FROM signals');

  if (!results || results.length === 0 || !results[0] || !results[0].values) {
    console.log('✅ No signals found in database (or database is empty)');
    return;
  }

  const rows = results[0].values;
  console.log(`📊 Found ${rows.length} signals to check\n`);

  let repaired = 0;
  const details: string[] = [];

  for (const row of rows) {
    const [id, actionPlan, matchedSkills, originalTweet] = row as any[];
    let needsUpdate = false;
    const repairs: string[] = [];

    // 获取当前值
    const currentActionPlan = actionPlan;
    const currentMatchedSkills = matchedSkills;
    const currentOriginalTweet = originalTweet;

    // 检查并修复 action_plan
    const newActionPlan = repairValue(currentActionPlan, 'array');
    if (newActionPlan !== currentActionPlan) {
      needsUpdate = true;
      repairs.push(`action_plan: "${currentActionPlan}" → "${newActionPlan}"`);
    }

    // 检查并修复 matched_skills
    const newMatchedSkills = repairValue(currentMatchedSkills, 'array');
    if (newMatchedSkills !== currentMatchedSkills) {
      needsUpdate = true;
      repairs.push(`matched_skills: "${currentMatchedSkills}" → "${newMatchedSkills}"`);
    }

    // 检查并修复 original_tweet
    const newOriginalTweet = repairValue(currentOriginalTweet, 'object');
    if (newOriginalTweet !== currentOriginalTweet) {
      needsUpdate = true;
      repairs.push(`original_tweet: "${currentOriginalTweet}" → "${newOriginalTweet}"`);
    }

    if (needsUpdate) {
      const stmt = db.prepare(`
        UPDATE signals
        SET action_plan = ?, matched_skills = ?, original_tweet = ?
        WHERE id = ?
      `);
      stmt.run([newActionPlan, newMatchedSkills, newOriginalTweet, id]);
      stmt.free();

      repaired++;
      details.push(`  ✏️  Signal ${id}:`);
      repairs.forEach(r => details.push(`      ${r}`));
    }
  }

  // 保存数据库
  saveDatabase(db);

  // 输出结果
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Repair Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (repaired > 0) {
    console.log(`✅ Successfully repaired ${repaired} signal(s)\n`);
    console.log('Details:');
    details.forEach(d => console.log(d));
  } else {
    console.log('✅ No repairs needed - all data is valid!\n');
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// 运行修复
repairDatabase()
  .then(() => {
    console.log('🎉 Database repair completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database repair failed:', error);
    process.exit(1);
  });
