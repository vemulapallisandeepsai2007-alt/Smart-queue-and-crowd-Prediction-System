const mongoose = require('mongoose');

const queueStatSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Date string (YYYY-MM-DD) is required'],
      index: true,
    },
    hour: {
      type: Number, // 0 - 23
      required: [true, 'Hour (0-23) is required'],
      min: 0,
      max: 23,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    waitingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    cancelledCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on (department, date, hour)
queueStatSchema.index({ department: 1, date: 1, hour: 1 }, { unique: true });

module.exports = mongoose.model('QueueStat', queueStatSchema);
