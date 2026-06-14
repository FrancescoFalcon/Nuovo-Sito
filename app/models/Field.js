const mongoose = require('mongoose');

// Schema per i campi sportivi
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
    // Esempio: ["09:00-10:30", "10:30-12:00", "15:00-16:30", "16:30-18:00", "18:00-19:30", "19:30-21:00", "21:00-22:30"]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Field', fieldSchema);
