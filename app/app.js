const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

const authRouter = require('./routes/auth');
const fieldsRouter = require('./routes/fields');
const tournamentsRouter = require('./routes/tournaments');
const matchesRouter = require('./routes/matches');
const usersRouter = require('./routes/users');
const Booking = require('./models/Booking');

const app = express();
const PORT = process.env.PORT || 3000;
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/provolone';

// Configurazione della connessione MongoDB
async function bootstrap() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connessione a MongoDB riuscita su:', mongoURI);

    // Eseguiamo il seed dei campi se la collezione è vuota
    await seedFieldsIfNeeded();

    app.listen(PORT, function() {
      console.log(`Server in ascolto sulla porta ${PORT}`);
    });
  } catch (err) {
    console.error('Errore di connessione a MongoDB:', err);
    process.exitCode = 1;
  }
}

// Middleware per il parsing del corpo delle richieste JSON e urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurazione di express-session per salvare la sessione in memoria (soluzione didattica)
app.use(session({
  secret: 'chiave_segreta_esame_programmazione_web_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // Il cookie scade dopo 1 giorno
  }
}));

// Serve i file statici del frontend dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rotta Utility: GET /api/whoami
// Ritorna le informazioni dell'utente loggato correntemente
app.get('/api/whoami', function(req, res) {
  if (!req.session || !req.session.user) {
    return res.json({ loggedIn: false });
  }

  Booking.find({ user: req.session.user.id })
    .populate('field', 'name')
    .sort({ date: 1, slot: 1 })
    .then(function(bookings) {
      return res.json({ loggedIn: true, user: req.session.user, bookings: bookings });
    })
    .catch(function(err) {
      console.error('Errore nel recupero delle prenotazioni utente:', err);
      return res.status(500).json({ error: 'Errore nel recupero del profilo utente' });
    });
});

// Registrazione dei router API
app.use('/api/auth', authRouter);
app.use('/api/fields', fieldsRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api', matchesRouter); // Gestisce rotte annidate sia /api/tournaments/:id/matches che /api/matches/:id
app.use('/api/users', usersRouter);

bootstrap();

// Funzione helper per popolare i campi iniziali al primo avvio
async function seedFieldsIfNeeded() {
  try {
    const Field = require('./models/Field');
    const count = await Field.countDocuments();
    if (count === 0) {
      console.log('Collezione campi vuota. Avvio autoseeding...');
      const defaultFields = [
        {
          name: 'Campetto San Siro',
          sport: 'football',
          address: 'Via dei Piccolomini 5, Milano',
          slots: ["09:00-10:30", "10:30-12:00", "15:00-16:30", "16:30-18:00", "18:00-19:30", "19:30-21:00", "21:00-22:30"]
        },
        {
          name: 'PalaVolley Treviso',
          sport: 'volleyball',
          address: 'Viale della Repubblica 22, Treviso',
          slots: ["10:00-11:30", "11:30-13:00", "16:00-17:30", "17:30-19:00", "19:00-20:30", "20:30-22:00"]
        },
        {
          name: 'Forum Basket',
          sport: 'basketball',
          address: 'Via Giuseppe Di Vittorio 6, Assago',
          slots: ["09:30-11:00", "11:00-12:30", "14:30-16:00", "16:00-17:30", "17:30-19:00", "19:00-20:30", "20:30-22:00"]
        },
        {
          name: 'Stadio Olimpico Calcetto',
          sport: 'football',
          address: 'Viale dei Gladiatori, Roma',
          slots: ["15:00-16:30", "16:30-18:00", "18:00-19:30", "19:30-21:00", "21:00-22:30", "22:30-00:00"]
        }
      ];
      await Field.insertMany(defaultFields);
      console.log('Seeding dei campi sportivi completato.');
    }
  } catch (err) {
    console.error('Errore durante l\'autoseeding dei campi:', err);
  }
}
