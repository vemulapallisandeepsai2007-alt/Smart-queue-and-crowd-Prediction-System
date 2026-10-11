const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Hospital', 'Bank'],
        message: '{VALUE} must be either Hospital or Bank',
      },
    },
    name: {
      type: String,
      required: [true, 'Staff name is required'],
      trim: true,
    },
    staffId: {
      type: String,
      required: [true, 'Staff ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'deactivated'],
      default: 'pending',
    },
    place: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
      default: null,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

staffSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('Staff', staffSchema);
