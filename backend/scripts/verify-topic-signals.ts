
import { OrchestratorAgent } from '../src/agents/orchestrator-agent';
import { TweetData } from '../src/types';
import { SIGNAL_TYPES } from '../src/config/signal-rules';

async function testTopicSignals() {
  console.log('Testing Topic Signals...');
  const orchestrator = new OrchestratorAgent();

  const techTweet: TweetData = {
    id: 't1',
    text: 'The new GPT-5 model is absolutely mind-blowing! The reasoning capabilities have jumped significantly. #AI #Tech',
    author: {
      username: 'tech_guru',
      displayName: 'Tech Guru',
      verified: true,
      followerCount: 50000
    },
    engagement: {
      likes: 1000,
      retweets: 500,
      replies: 100,
      views: 50000
    },
    timestamp: new Date().toISOString(),
    url: 'http://twitter.com/t1',
    type: 'original'
  };

  console.log('\nAnalyzing Tech Tweet...');
  const techSignal = await orchestrator.analyze(techTweet);
  
  if (techSignal) {
    console.log('✅ Signal detected:', techSignal.type);
    if (techSignal.type === SIGNAL_TYPES.TECH_PRODUCT) {
      console.log('✅ Correctly identified as TECH_PRODUCT');
    } else {
      console.log('❌ Incorrect type:', techSignal.type);
    }
  } else {
    console.log('❌ No signal detected for tech tweet');
  }

  const incomeTweet: TweetData = {
    id: 't2',
    text: 'Just made my first $1000 from my side project! Here is how I built a micro-SaaS in 2 weeks. #indiehacker #SaaS',
    author: {
      username: 'indie_dev',
      displayName: 'Indie Dev',
      verified: false,
      followerCount: 5000
    },
    engagement: {
      likes: 500,
      retweets: 100,
      replies: 50,
      views: 10000
    },
    timestamp: new Date().toISOString(),
    url: 'http://twitter.com/t2',
    type: 'original'
  };

  console.log('\nAnalyzing Income Tweet...');
  const incomeSignal = await orchestrator.analyze(incomeTweet);
  
  if (incomeSignal) {
    console.log('✅ Signal detected:', incomeSignal.type);
    if (incomeSignal.type === SIGNAL_TYPES.INCOME_MONETIZATION || incomeSignal.type === SIGNAL_TYPES.BUSINESS_STARTUP) {
      console.log('✅ Correctly identified as INCOME/BUSINESS');
    } else {
      console.log('❌ Incorrect type:', incomeSignal.type);
    }
  } else {
    console.log('❌ No signal detected for income tweet');
  }
}

testTopicSignals().catch(console.error);
