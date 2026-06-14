const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');

// Middleware di autenticazione locale
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Accesso negato. Effettua il login.' });
  }
  next();
}

// POST /api/tournaments/:id/matches/generate
// Genera il calendario (single round-robin) del torneo (solo creatore)
router.post('/tournaments/:id/matches/generate', requireAuth, async function(req, res) {
  try {
    const tournamentId = req.params.id;
    const userId = req.session.user.id;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Torneo non trovato' });
    }

    // Controlla se l'utente è il creatore del torneo
    if (tournament.creator.toString() !== userId) {
      return res.status(403).json({ error: 'Solo il creatore del torneo può generare il calendario' });
    }

    // Verifica se il calendario è già stato generato
    if (tournament.scheduleGenerated) {
      return res.status(400).json({ error: 'Il calendario per questo torneo è già stato generato' });
    }

    // Verifica che siano iscritte tutte le squadre previste
    if (tournament.teams.length !== tournament.maxTeams) {
      return res.status(400).json({
        error: `Impossibile generare il calendario. Squadre iscritte: ${tournament.teams.length}/${tournament.maxTeams}.`
      });
    }

    // Algoritmo Round-Robin (Algoritmo di Berger per accoppiamenti)
    const teamsList = [...tournament.teams];
    // Se il numero di squadre è dispari, aggiungiamo una squadra fittizia "Riposo"
    if (teamsList.length % 2 !== 0) {
      teamsList.push({ name: 'Riposo', dummy: true });
    }

    const n = teamsList.length;
    const rounds = n - 1;
    const matchesToCreate = [];

    for (let round = 0; round < rounds; round++) {
      // Calcoliamo la data di questo turno (1 turno ogni 7 giorni a partire dalla startDate del torneo)
      const roundDate = new Date(tournament.startDate);
      roundDate.setDate(roundDate.getDate() + round * 7);

      for (let i = 0; i < n / 2; i++) {
        const homeIdx = (round + i) % (n - 1);
        let awayIdx = (round + n - 1 - i) % (n - 1);

        let homeTeam = teamsList[homeIdx];
        let awayTeam = teamsList[awayIdx];

        // Se i == 0, la prima squadra gioca con l'ultima del vettore
        if (i === 0) {
          homeTeam = teamsList[n - 1];
        }

        // Se una delle due squadre è quella di "Riposo" fittizia, saltiamo l'inserimento
        if (homeTeam.dummy || awayTeam.dummy) {
          continue;
        }

        matchesToCreate.push({
          tournament: tournamentId,
          teamA: homeTeam.name,
          teamB: awayTeam.name,
          date: roundDate,
          status: 'upcoming'
        });
      }
    }

    // Salviamo tutti i match generati nel database
    await Match.insertMany(matchesToCreate);

    // Aggiorniamo lo stato del torneo
    tournament.scheduleGenerated = true;
    await tournament.save();

    return res.status(201).json({
      message: 'Calendario generato con successo',
      matchesCreated: matchesToCreate.length
    });

  } catch (err) {
    return res.status(500).json({ error: 'Errore nella generazione del calendario' });
  }
});

// GET /api/tournaments/:id/matches
// Restituisce la lista di tutti i match di un determinato torneo
router.get('/tournaments/:id/matches', async function(req, res) {
  try {
    const tournamentId = req.params.id;
    const matches = await Match.find({ tournament: tournamentId }).sort({ date: 1 });
    return res.json(matches);
  } catch (err) {
    return res.status(500).json({ error: 'Errore nel recupero dei match' });
  }
});

// GET /api/matches/:id
// Dettagli di una singola partita
router.get('/matches/:id', async function(req, res) {
  try {
    const match = await Match.findById(req.params.id).populate({
      path: 'tournament',
      populate: { path: 'creator', select: 'username name surname' }
    });
    if (!match) {
      return res.status(404).json({ error: 'Partita non trovata' });
    }
    return res.json(match);
  } catch (err) {
    return res.status(500).json({ error: 'Errore nel recupero dei dettagli del match' });
  }
});

// PUT /api/matches/:id/result
// Inserisci il risultato del match (solo creatore del torneo)
router.put('/matches/:id/result', requireAuth, async function(req, res) {
  try {
    const matchId = req.params.id;
    const userId = req.session.user.id;
    const { scoreA, scoreB } = req.body;

    if (scoreA === undefined || scoreB === undefined) {
      return res.status(400).json({ error: 'I punteggi delle due squadre sono obbligatori' });
    }

    // Recuperiamo il match e popoliamo il torneo associato per controllare il creatore
    const match = await Match.findById(matchId).populate('tournament');
    if (!match) {
      return res.status(404).json({ error: 'Partita non trovata' });
    }

    if (match.tournament.creator.toString() !== userId) {
      return res.status(403).json({ error: 'Solo il creatore del torneo può inserire i risultati' });
    }

    // Vincolo: controlliamo che la data dell'incontro sia già passata o odierna
    const now = new Date();
    if (new Date(match.date) > now) {
      return res.status(400).json({ error: 'Impossibile inserire il risultato per un incontro futuro' });
    }

    // Vincolo: pallavolo e pallacanestro non ammettono pareggi
    if (match.tournament.sport !== 'football' && parseInt(scoreA) === parseInt(scoreB)) {
      return res.status(400).json({ error: 'I pareggi non sono ammessi nella pallavolo o nella pallacanestro' });
    }

    match.scoreA = parseInt(scoreA);
    match.scoreB = parseInt(scoreB);
    match.status = 'played';

    await match.save();
    return res.json(match);

  } catch (err) {
    return res.status(500).json({ error: 'Errore nell\'inserimento del risultato' });
  }
});

module.exports = router;
