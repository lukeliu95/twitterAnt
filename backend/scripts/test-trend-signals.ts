// import fetch from 'node-fetch'; // 使用 Node.js 原生 fetch


const API_BASE_URL = 'http://localhost:3001/api/v1';

// 构造 Mock 推文
// 我们使用了 'ai', 'crypto', 'launch' 等关键词，这些在 tweets.ts 的规则中定义为 trend 类型
const mockTweets = [
  {
    id: 't_trend_1',
    text: 'The new AI features in GPT-5 are absolutely mind-blowing! This is going to change everything. #AI #Tech',
    author: {
      username: 'tech_guru',
      displayName: 'Tech Guru',
      verified: true,
      followerCount: 50000,
    },
    engagement: {
      replies: 100,
      retweets: 500,
      likes: 2000,
      views: 100000,
    },
    timestamp: new Date().toISOString(),
    url: 'https://twitter.com/tech_guru/status/t_trend_1',
    type: 'original',
  },
  {
    id: 't_trend_2',
    text: 'Crypto markets are showing a huge uptrend this week. Bitcoin might hit 100k soon! 🚀',
    author: {
      username: 'crypto_king',
      displayName: 'Crypto King',
      verified: false,
      followerCount: 10000,
    },
    engagement: {
      replies: 50,
      retweets: 200,
      likes: 800,
      views: 50000,
    },
    timestamp: new Date().toISOString(),
    url: 'https://twitter.com/crypto_king/status/t_trend_2',
    type: 'original',
  },
  {
    id: 't_trend_3',
    text: 'Just launched my new SaaS product on Product Hunt! Check it out.',
    author: {
      username: 'maker_john',
      displayName: 'John Maker',
      verified: true,
      followerCount: 2000,
    },
    engagement: {
      replies: 10,
      retweets: 5,
      likes: 30,
      views: 1000,
    },
    timestamp: new Date().toISOString(),
    url: 'https://twitter.com/maker_john/status/t_trend_3',
    type: 'original',
  },
  // 添加一个对照组，不应该是 Trend
  {
    id: 't_demand_1',
    text: 'I need a freelancer to help me build a website. Anyone available?',
    author: {
      username: 'client_alice',
      displayName: 'Alice',
      verified: false,
      followerCount: 100,
    },
    engagement: {
      replies: 5,
      retweets: 0,
      likes: 2,
      views: 100,
    },
    timestamp: new Date().toISOString(),
    url: 'https://twitter.com/client_alice/status/t_demand_1',
    type: 'original',
  },
];

async function runTest() {
  console.log('🚀 Starting Trend Signal Test...');

  // 1. 提交推文
  console.log('\n📡 Sending tweets to API...');
  try {
    const response = await fetch(`${API_BASE_URL}/tweets/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweets: mockTweets }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Submission Result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error('❌ Failed to submit tweets');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error submitting tweets:', error);
    process.exit(1);
  }

  // 等待一点时间让处理完成
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. 查询 Trend 信号
  console.log('\n🔍 Querying Trend Signals...');
  try {
    const signalsResponse = await fetch(`${API_BASE_URL}/signals?type=trend`);
    
    if (!signalsResponse.ok) {
        throw new Error(`HTTP error! status: ${signalsResponse.status}`);
    }

    const signalsResult = await signalsResponse.json();

    if (!signalsResult.success) {
      console.error('❌ Failed to fetch signals');
      process.exit(1);
    }

    const signals = signalsResult.data.signals;
    console.log(`Found ${signals.length} trend signals.`);
    
    // 打印出来的信号摘要，方便人工核对
    signals.forEach((s: any) => {
        console.log(`- [${s.score}] ${s.summary} (Tweet ID: ${s.tweetId})`);
    });

    // 3. 验证结果
    const foundTrend1 = signals.find((s: any) => s.tweetId === 't_trend_1');
    const foundTrend2 = signals.find((s: any) => s.tweetId === 't_trend_2');
    const foundDemandAsTrend = signals.find((s: any) => s.tweetId === 't_demand_1');

    let passed = true;

    if (foundTrend1) {
      console.log('✅ Correctly identified AI trend signal');
    } else {
      console.error('❌ Failed to identify AI trend signal');
      passed = false;
    }

    if (foundTrend2) {
      console.log('✅ Correctly identified Crypto trend signal');
    } else {
      console.error('❌ Failed to identify Crypto trend signal');
      passed = false;
    }

    if (!foundDemandAsTrend) {
      console.log('✅ Correctly excluded Demand tweet from Trend signals');
    } else {
      console.error('❌ Incorrectly identified Demand tweet as Trend signal');
      passed = false;
    }

    if (passed) {
      console.log('\n🎉 All critical tests passed!');
    } else {
      console.error('\n💥 Some tests failed.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error fetching signals:', error);
    process.exit(1);
  }
}

runTest().catch(console.error);
