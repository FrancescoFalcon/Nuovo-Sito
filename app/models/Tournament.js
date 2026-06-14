const mongoose = require('mongoose');

// Schema annidato per i giocatori delle squadre
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

// Schema annidato per le squadre
const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  players: [playerSchema]
});

// Schema per i tornei
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
