const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
  field: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Field',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, 
    required: true
  },
  slot: {
    type: String, 
    required: true
  }
}, {
  timestamps: true
});
bookingSchema.index({ field: 1, date: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);
