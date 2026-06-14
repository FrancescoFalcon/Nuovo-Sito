const mongoose = require('mongoose');
const Field = require('./models/Field');
const Booking = require('./models/Booking');
const Tournament = require('./models/Tournament');
const Match = require('./models/Match');
const User = require('./models/User');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/provolone';

async function seed() {
  try {
    console.log('Avvio connessione a MongoDB per seeding...');
    await mongoose.connect(mongoURI);
    console.log('Connesso a MongoDB. Reset del database in corso...');

    // Cancelliamo i dati esistenti per iniziare con un database pulito
    await Booking.deleteMany({});
    await Match.deleteMany({});
    await Tournament.deleteMany({});
    await Field.deleteMany({});
    // Conserviamo gli utenti per non perdere le registrazioni durante i test,
    // oppure possiamo cancellarli se si desidera un reset totale.
    // In questo caso facciamo un reset totale:
    await User.deleteMany({});

    console.log('Database ripulito. Inserimento dei campi sportivi di default...');

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
    console.log('Seeding completato con successo!');
  } catch (err) {
    console.error('Errore durante il seeding:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Connessione a MongoDB chiusa.');
  }
}

seed();
