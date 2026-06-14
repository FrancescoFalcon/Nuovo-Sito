const express = require('express');
const router = express.Router();
const Field = require('../models/Field');
const Booking = require('../models/Booking');

// Middleware di autenticazione locale per le rotte protette
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Accesso negato. Effettua il login.' });
  }
  next();
}

// GET /api/fields?q=query
// Lista dei campi sportivi, opzionalmente filtrabile
router.get('/', async function(req, res) {
  try {
    const q = req.query.q;
    let query = {};

    if (q) {
      const regex = new RegExp(q, 'i');
      query = {
        $or: [
          { name: regex },
          { address: regex },
          { sport: regex }
        ]
      };
    }

    const fields = await Field.find(query);
    return res.json(fields);
  } catch (err) {
    return res.status(500).json({ error: 'Errore nel recupero dei campi' });
  }
});

// GET /api/fields/:id
// Dettagli di un singolo campo
router.get('/:id', async function(req, res) {
  try {
    const field = await Field.findById(req.params.id);
    if (!field) {
      return res.status(404).json({ error: 'Campo non trovato' });
    }
    return res.json(field);
  } catch (err) {
    return res.status(500).json({ error: 'Errore nel recupero del campo' });
  }
});

// GET /api/fields/:id/slots?date=YYYY-MM-DD
// Disponibilità per una specifica data
router.get('/:id/slots', async function(req, res) {
  try {
    const fieldId = req.params.id;
    const date = req.query.date;

    if (!date) {
      return res.status(400).json({ error: 'La data è obbligatoria (formato YYYY-MM-DD)' });
    }

    const field = await Field.findById(fieldId);
    if (!field) {
      return res.status(404).json({ error: 'Campo non trovato' });
    }

    // Troviamo tutte le prenotazioni per quel campo in quella data
    const bookings = await Booking.find({ field: fieldId, date: date }).populate('user', 'username name surname');

    // Mappiamo i possibili slot del campo evidenziando quelli già prenotati
    const slotsStatus = field.slots.map(function(slot) {
      const booking = bookings.find(function(b) {
        return b.slot === slot;
      });

      return {
        slot: slot,
        booked: !!booking,
        bookingId: booking ? booking._id : null,
        user: booking ? {
          id: booking.user._id,
          username: booking.user.username,
          name: booking.user.name,
          surname: booking.user.surname
        } : null
      };
    });

    return res.json(slotsStatus);
  } catch (err) {
    return res.status(500).json({ error: 'Errore nel calcolo degli slot liberi' });
  }
});

// POST /api/fields/:id/bookings
// Prenota uno slot (protetta)
router.post('/:id/bookings', requireAuth, async function(req, res) {
  try {
    const fieldId = req.params.id;
    const { date, slot } = req.body;
    const userId = req.session.user.id;

    if (!date || !slot) {
      return res.status(400).json({ error: 'Data e slot sono obbligatori' });
    }

    const field = await Field.findById(fieldId);
    if (!field) {
      return res.status(404).json({ error: 'Campo non trovato' });
    }

    // Controlliamo se lo slot fa parte dei possibili slot del campo
    if (!field.slots.includes(slot)) {
      return res.status(400).json({ error: 'Slot orario non valido per questo campo' });
    }

    // Controlliamo se lo slot è nel passato
    const startTime = slot.split('-')[0]; // Es: "18:00"
    const slotDateTime = new Date(`${date}T${startTime}:00`);
    if (slotDateTime < new Date()) {
      return res.status(400).json({ error: 'Impossibile prenotare slot nel passato' });
    }

    // Controlliamo se è già prenotato (impedisci prenotazione doppia)
    const existingBooking = await Booking.findOne({ field: fieldId, date: date, slot: slot });
    if (existingBooking) {
      return res.status(400).json({ error: 'Lo slot selezionato è già stato prenotato' });
    }

    const newBooking = new Booking({
      field: fieldId,
      user: userId,
      date: date,
      slot: slot
    });

    await newBooking.save();
    return res.status(201).json(newBooking);
  } catch (err) {
    return res.status(500).json({ error: 'Errore durante la prenotazione' });
  }
});

// DELETE /api/fields/:id/bookings/:bookingId
// Cancella una prenotazione (protetta)
router.delete('/:id/bookings/:bookingId', requireAuth, async function(req, res) {
  try {
    const bookingId = req.params.bookingId;
    const userId = req.session.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    // Verifica che l'utente stia cancellando la propria prenotazione
    if (booking.user.toString() !== userId) {
      return res.status(403).json({ error: 'Non hai i permessi per cancellare questa prenotazione' });
    }

    // Controlliamo che sia una prenotazione futura
    const startTime = booking.slot.split('-')[0];
    const bookingDateTime = new Date(`${booking.date}T${startTime}:00`);
    if (bookingDateTime < new Date()) {
      return res.status(400).json({ error: 'Non puoi cancellare prenotazioni passate' });
    }

    await Booking.findByIdAndDelete(bookingId);
    return res.json({ message: 'Prenotazione cancellata con successo' });
  } catch (err) {
    return res.status(500).json({ error: 'Errore durante la cancellazione della prenotazione' });
  }
});

module.exports = router;
