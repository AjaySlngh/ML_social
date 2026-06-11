require('dotenv').config();

const mongoose = require('mongoose');

const connectToDatabase = require('../config/db');
const { syncTwitterHistory } = require('../services/twitterSync');

function getHandlesFromEnv() {
  const raw = process.env.TWITTER_SYNC_USERS || '';
  return raw
    .split(',')
    .map((handle) => handle.trim())
    .filter(Boolean);
}

async function run() {
  const handles = getHandlesFromEnv();
  if (handles.length === 0) {
    throw new Error('Set TWITTER_SYNC_USERS in backend .env (comma-separated handles) before running sync.');
  }

  const trackingWindowDays = Number(process.env.TWITTER_TRACKING_WINDOW_DAYS || 120);

  await connectToDatabase();
  const summary = await syncTwitterHistory({ handles, trackingWindowDays });

  console.log('Twitter sync complete');
  console.log(JSON.stringify(summary, null, 2));
}

run()
  .catch((error) => {
    console.error('Twitter sync failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
