const mongoose = require('mongoose');

const doctorSubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    experienceYears: {
      type: Number,
      default: 1,
      min: [0, 'Experience cannot be negative'],
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
  },
  { _id: true }
);

const defaultSlots = [
  { name: 'Morning', startTime: '09:00', endTime: '12:30', tokenFrom: 1, tokenTo: 25 },
  { name: 'Afternoon', startTime: '14:00', endTime: '17:00', tokenFrom: 26, tokenTo: 50 },
  { name: 'Evening', startTime: '17:30', endTime: '20:30', tokenFrom: 51, tokenTo: 75 },
];

const defaultBreaks = [
  { label: 'Lunch', startTime: '12:30', endTime: '14:00' },
  { label: 'Tea', startTime: '17:00', endTime: '17:30' },
];

const departmentSchema = new mongoose.Schema(
  {
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      required: [true, 'Place reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    avgServiceMinutes: {
      type: Number,
      default: 10,
      min: [1, 'Average service minutes must be at least 1 minute'],
    },
    doctors: [doctorSubSchema],
    slots: {
      type: [
        {
          name: {
            type: String,
            enum: ['Morning', 'Afternoon', 'Evening'],
            required: true,
          },
          startTime: { type: String, required: true },
          endTime: { type: String, required: true },
          tokenFrom: { type: Number, required: true },
          tokenTo: { type: Number, required: true },
        },
      ],
      default: defaultSlots,
    },
    breaks: {
      type: [
        {
          label: { type: String, required: true },
          startTime: { type: String, required: true },
          endTime: { type: String, required: true },
        },
      ],
      default: defaultBreaks,
    },
    opensAt: {
      type: String,
      default: '09:00',
    },
    closesAt: {
      type: String,
      default: '20:30',
    },
    nowServingToken: {
      type: Number,
      default: null,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = {
  defaultSlots,
  defaultBreaks,
  Department: mongoose.model('Department', departmentSchema),
};
module.exports = mongoose.model('Department', departmentSchema);
module.exports.defaultSlots = defaultSlots;
module.exports.defaultBreaks = defaultBreaks;
