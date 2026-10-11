const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: {
        values: ['Male', 'Female', 'Other'],
        message: '{VALUE} is not a valid gender',
      },
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function (value) {
          return value && value <= new Date();
        },
        message: 'Date of birth cannot be in the future',
      },
    },
    age: {
      type: Number,
      min: [0, 'Age cannot be less than 0'],
      max: [120, 'Age cannot be greater than 120'],
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      default: null,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

function calculateAgeFromDOB(dob) {
  if (!dob) return null;
  let birth;
  if (typeof dob === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dob)) {
    const [y, m, d] = dob.split('T')[0].split('-').map(Number);
    birth = new Date(y, m - 1, d);
  } else {
    birth = new Date(dob);
  }
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

userSchema.virtual('calculatedAge').get(function () {
  if (this.age !== undefined && this.age !== null) {
    return this.age;
  }
  return calculateAgeFromDOB(this.dob);
});

userSchema.methods.getEffectiveAge = function () {
  if (this.age !== undefined && this.age !== null) {
    return this.age;
  }
  return calculateAgeFromDOB(this.dob);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  if (obj.age === undefined || obj.age === null) {
    obj.age = calculateAgeFromDOB(this.dob);
  }
  return obj;
};

module.exports = mongoose.model('User', userSchema);
module.exports.calculateAgeFromDOB = calculateAgeFromDOB;
