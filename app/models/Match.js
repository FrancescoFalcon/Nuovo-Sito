const mongoose = require('mongoose');

// Schema per le partite del torneo
const matchSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  teamA: {
    type: String, // Usiamo il nome come stringa per semplicità
    required: true
  },
  teamB: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  field: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Field' // Opzionale, può essere assegnato a un campo reale
  },
  status: {
    type: String,
    enum: ['upcoming', 'played'],
    default: 'upcoming'
  },
  scoreA: {
    type: Number
  },
  scoreB: {
    type: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Match', matchSchema);
