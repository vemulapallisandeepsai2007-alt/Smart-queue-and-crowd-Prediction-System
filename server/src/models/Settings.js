const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'global',
      unique: true,
      index: true,
    },
    crowdAlertThreshold: {
      type: Number,
      default: 75,
      min: [1, 'Crowd alert threshold must be at least 1'],
    },
    lowThreshold: {
      type: Number,
      default: 25,
      min: [1, 'Low threshold must be at least 1'],
    },
    mediumThreshold: {
      type: Number,
      default: 50,
      min: [1, 'Medium threshold must be at least 1'],
    },
    highThreshold: {
      type: Number,
      default: 75,
      min: [1, 'High threshold must be at least 1'],
    },
  },
  {
    timestamps: true,
  }
);

// Helper to get or create default settings singleton
settingsSchema.statics.getGlobalSettings = async function () {
  let settings = await this.findOne({ key: 'global' });
  if (!settings) {
    settings = await this.create({
      key: 'global',
      crowdAlertThreshold: 75,
      lowThreshold: 25,
      mediumThreshold: 50,
      highThreshold: 75,
    });
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
