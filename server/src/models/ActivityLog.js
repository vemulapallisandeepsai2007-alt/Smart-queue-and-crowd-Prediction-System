const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
  {
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      required: true,
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'booked',
        'completed',
        'cancelled',
        'skipped',
        'recalled',
        'staff_approved',
        'staff_deactivated',
        'counter_paused',
        'counter_resumed',
        'alert',
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookup by place sorted by time
ActivityLogSchema.index({ place: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
