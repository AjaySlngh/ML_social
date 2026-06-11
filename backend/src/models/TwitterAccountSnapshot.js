const mongoose = require('mongoose');

const twitterAccountSnapshotSchema = new mongoose.Schema(
  {
    accountHandle: {
      type: String,
      required: true,
      index: true,
    },
    accountName: {
      type: String,
      default: '',
    },
    collectedAt: {
      type: Date,
      required: true,
      index: true,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    tweetCount: {
      type: Number,
      default: 0,
    },
    listedCount: {
      type: Number,
      default: 0,
    },
    profileVisitsCount: {
      type: Number,
      default: null,
    },
    raw: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

twitterAccountSnapshotSchema.index({ accountHandle: 1, collectedAt: 1 }, { unique: true });

module.exports = mongoose.model('TwitterAccountSnapshot', twitterAccountSnapshotSchema);
