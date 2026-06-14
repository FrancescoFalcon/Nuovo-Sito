const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// POST /api/auth/signup
// Registrazione di un nuovo utente
router.post('/signup', async function(req, res) {
  try {
    const { username, password, name, surname } = req.body;

    // Controllo campi obbligatori
    if (!username || !password || !name || !surname) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    // Verifica se lo username esiste già
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      return res.status(400).json({ error: 'Questo username è già registrato' });
    }

    // Hash della password prima di salvarla
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username: username,
      password: hashedPassword,
      name: name,
      surname: surname
    });

    await newUser.save();
    return res.status(201).json({ message: 'Utente registrato con successo' });
  } catch (err) {
    return res.status(500).json({ error: 'Errore durante la registrazione' });
  }
});

// POST /api/auth/signin
// Login dell'utente
router.post('/signin', async function(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password obbligatori' });
    }

    // Ricerca dell'utente nel database
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Confronto delle password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Salviamo l'utente in sessione
    req.session.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      surname: user.surname
    };

    return res.json({
      message: 'Login effettuato con successo',
      user: req.session.user
    });
  } catch (err) {
    return res.status(500).json({ error: 'Errore durante il login' });
  }
});

// POST /api/auth/signout
// Logout dell'utente (comodo per completare le funzionalità)
router.post('/signout', function(req, res) {
  req.session.destroy(function(err) {
    if (err) {
      return res.status(500).json({ error: 'Errore durante il logout' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logout effettuato con successo' });
  });
});

module.exports = router;
