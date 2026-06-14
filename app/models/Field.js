const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sport: {
    type: String,
    required: true,
    enum: ['football', 'volleyball', 'basketball']
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  slots: {
    type: [String],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Field', fieldSchema);
