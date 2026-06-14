const mongoose = require('mongoose');

// Schema per gli utenti registrati
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  surname: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true // Aggiunge createdAt e updatedAt automaticamente
});

module.exports = mongoose.model('User', userSchema);
