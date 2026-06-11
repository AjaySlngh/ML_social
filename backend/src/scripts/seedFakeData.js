require('dotenv').config();

const mongoose = require('mongoose');

const connectToDatabase = require('../config/db');
const Post = require('../models/Post');
const MetricSnapshot = require('../models/MetricSnapshot');
const { generateFakePosts, generateSeedPayload } = require('../data/fakeSeedData');

async function seed() {
  await connectToDatabase();

  await MetricSnapshot.deleteMany({});
  await Post.deleteMany({});

  const fakePosts = generateFakePosts();

  const createdPosts = await Post.insertMany(
    fakePosts.map(({ baseline, ...post }) => post)
  );

  const postDocumentsWithBaseline = createdPosts.map((post) => {
    const seedSource = fakePosts.find((item) => item.externalPostId === post.externalPostId);

    return {
      ...post.toObject(),
      baseline: seedSource.baseline,
    };
  });

  const snapshots = generateSeedPayload(postDocumentsWithBaseline, 14);
  await MetricSnapshot.insertMany(snapshots);

  console.log(`Seed complete: ${createdPosts.length} posts and ${snapshots.length} snapshots inserted.`);
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });