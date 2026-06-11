const mongoose = require('mongoose');

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ml_social';

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
}

module.exports = connectToDatabase;