require('dotenv').config();

const { getCryptoTrendAnalysis } = require('../services/twitterResearch');

async function run() {
  const listId = String(process.env.TWITTER_RESEARCH_LIST_ID || '').trim();
  if (!listId) {
    throw new Error('Set TWITTER_RESEARCH_LIST_ID in backend .env before running research trend sync.');
  }

  const result = await getCryptoTrendAnalysis({ listId });

  const summary = {
    listId: result.listId,
    windowDays: result.window.days,
    fetchedTweets: result.fetchedTweets,
    analyzedTweets: result.analyzedTweets,
    topTopic: result.topicBreakdown[0] || null,
    generatedAt: new Date().toISOString(),
  };

  console.log('Twitter research trend sync complete');
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error('Twitter research trend sync failed:', error.message);
  process.exitCode = 1;
});
