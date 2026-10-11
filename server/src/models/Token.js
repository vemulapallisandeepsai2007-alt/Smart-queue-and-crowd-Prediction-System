const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Date is required in YYYY-MM-DD format'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true,
    },
    number: {
      type: Number,
      required: [true, 'Token number is required'],
      min: [1, 'Token number must be between 1 and 75'],
      max: [75, 'Token number must be between 1 and 75'],
    },
    slot: {
      type: String,
      enum: {
        values: ['Morning', 'Afternoon', 'Evening'],
        message: '{VALUE} is not a valid slot',
      },
      required: [true, 'Slot is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'booked', 'completed', 'cancelled', 'skipped'],
        message: '{VALUE} is not a valid token status',
      },
      default: 'available',
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    walkIn: {
      type: Boolean,
      default: false,
    },
    walkInPatient: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      age: { type: Number, min: 0, max: 120 },
      gender: { type: String, enum: ['Male', 'Female', 'Other', ''] },
    },
    patient: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      age: { type: Number, min: 0, max: 120 },
      gender: { type: String, enum: ['Male', 'Female', 'Other', ''] },
    },
    bookedByStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
    bookedAt: {
      type: Date,
      default: null,
    },
    calledAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    skippedAt: {
      type: Date,
      default: null,
    },
    skipReason: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: String,
      enum: ['user', 'staff', null],
      default: null,
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound UNIQUE index on (department, date, number)
tokenSchema.index({ department: 1, date: 1, number: 1 }, { unique: true });

// Compound index to quickly find active booked tokens per user/department/date
tokenSchema.index({ user: 1, department: 1, date: 1, status: 1 });

module.exports = mongoose.model('Token', tokenSchema);
