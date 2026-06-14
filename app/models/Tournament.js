const mongoose = require('mongoose');
const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  surname: {
    type: String,
    required: true,
    trim: true
  },
  jerseyNumber: {
    type: Number
  }
});

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  players: [playerSchema]
});

const tournamentSchema = new mongoose.Schema({
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
  maxTeams: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teams: [teamSchema],
  scheduleGenerated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Tournament', tournamentSchema);
