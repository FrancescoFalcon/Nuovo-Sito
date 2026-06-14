const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Tournament = require('../models/Tournament');

// GET /api/users?q=query
// Lista di tutti gli utenti, filtrabile per username, nome o cognome
router.get('/', async function(req, res) {
  try {
    const q = req.query.q;
    let query = {};

    if (q) {
      const regex = new RegExp(q, 'i');
      query = {
        $or: [
          { username: regex },
          { name: regex },
          { surname: regex }
        ]
      };
    }

    // Escludiamo la password per sicurezza
    const users = await User.find(query).select('-password');
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: 'Errore nel recupero degli utenti' });
  }
});

// GET /api/users/:id
// Dettagli dell'utente e lista dei tornei da lui creati
router.get('/:id', async function(req, res) {
  try {
    const userId = req.params.id;

    // Recupera i dati dell'utente (senza password)
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Recupera tutti i tornei creati da questo utente
    const tournaments = await Tournament.find({ creator: userId });

    return res.json({
      user: user,
      tournaments: tournaments
    });
  } catch (err) {
    return res.status(500).json({ error: 'Errore nel recupero dei dettagli dell\'utente' });
  }
});

module.exports = router;
