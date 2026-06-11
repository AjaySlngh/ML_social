const mongoose = require('mongoose');

const metricSnapshotSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    collectedAt: {
      type: Date,
      required: true,
      index: true,
    },
    likesCount: {
      type: Number,
      required: true,
      default: 0,
    },
    commentsCount: {
      type: Number,
      required: true,
      default: 0,
    },
    impressionsCount: {
      type: Number,
      required: true,
      default: 0,
    },
    savesOrBookmarksCount: {
      type: Number,
      required: true,
      default: 0,
    },
    sharesCount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

metricSnapshotSchema.index({ post: 1, collectedAt: 1 }, { unique: true });

module.exports = mongoose.model('MetricSnapshot', metricSnapshotSchema);