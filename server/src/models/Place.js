const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema(
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
      required: [true, 'Place name is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      default: 'Guntur',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (coords) {
            return (
              Array.isArray(coords) &&
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message: 'Coordinates must be valid [longitude, latitude]',
        },
      },
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['db', 'osm'],
      default: 'db',
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial queries
placeSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Place', placeSchema);
