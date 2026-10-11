const Settings = require('../models/Settings');

/**
 * GET /api/admin/settings
 * Fetch current system threshold settings
 */
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getGlobalSettings();
    return res.json({
      success: true,
      settings: {
        crowdAlertThreshold: settings.crowdAlertThreshold,
        lowThreshold: settings.lowThreshold,
        mediumThreshold: settings.mediumThreshold,
        highThreshold: settings.highThreshold,
      },
    });
  } catch (error) {
    console.error('Error in getSettings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings.',
    });
  }
};

/**
 * PUT /api/admin/settings
 * Update system threshold settings
 */
const updateSettings = async (req, res) => {
  try {
    const { crowdAlertThreshold, lowThreshold, mediumThreshold, highThreshold } = req.body;

    const alertVal = Number(crowdAlertThreshold);
    const lowVal = Number(lowThreshold);
    const medVal = Number(mediumThreshold);
    const highVal = Number(highThreshold);

    if (isNaN(alertVal) || alertVal < 1) {
      return res.status(400).json({
        success: false,
        message: 'Crowd alert threshold must be a positive number.',
      });
    }

    if (isNaN(lowVal) || isNaN(medVal) || isNaN(highVal) || lowVal < 1 || medVal < 1 || highVal < 1) {
      return res.status(400).json({
        success: false,
        message: 'Thresholds must be positive numbers.',
      });
    }

    if (lowVal >= medVal || medVal >= highVal) {
      return res.status(400).json({
        success: false,
        message: 'Thresholds must satisfy: Low < Medium < High.',
      });
    }

    let settings = await Settings.getGlobalSettings();
    settings.crowdAlertThreshold = alertVal;
    settings.lowThreshold = lowVal;
    settings.mediumThreshold = medVal;
    settings.highThreshold = highVal;
    await settings.save();

    return res.json({
      success: true,
      message: 'Settings updated successfully.',
      settings: {
        crowdAlertThreshold: settings.crowdAlertThreshold,
        lowThreshold: settings.lowThreshold,
        mediumThreshold: settings.mediumThreshold,
        highThreshold: settings.highThreshold,
      },
    });
  } catch (error) {
    console.error('Error in updateSettings:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update settings.',
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
