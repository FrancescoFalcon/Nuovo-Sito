const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');

// Middleware di autenticazione locale
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Accesso negato. Effettua il login.' });
  }
  next();
}

// GET /api/tournaments?q=query
// Lista di tutti i tornei, ricercabili per nome o sport
router.get('/', async function(req, res) {
  try {
    const q = req.query.q;
    let query = {};

    if (q) {
      const regex = new RegExp(q, 'i');
      query = {
        $or: [
          { name: regex },
          { sport: regex }
        ]
      };
    }

    const tournaments = await Tournament.find(query).populate('creator', 'username name surname');
    return res.json(tournaments);
  } catch (err) {
    return res.status(500).json({ error: 'Errore nel recupero dei tornei' });
  }
});

// POST /api/tournaments
// Crea un nuovo torneo (protetta)
router.post('/', requireAuth, async function(req, res) {
  try {
    const { name, sport, maxTeams, startDate } = req.body;
    const userId = req.session.user.id;

    if (!name || !sport || !maxTeams || !startDate) {
      return res.status(400).json({ error: 'Tutti i campi (nome, sport, max squadre, data inizio) sono obbligatori' });
    }

    const newTournament = new Tournament({
      name: name,
      sport: sport,
      maxTeams: parseInt(maxTeams),
      startDate: new Date(startDate),
      creator: userId,
      teams: [],
      scheduleGenerated: false
    });

    await newTournament.save();
    return res.status(201).json(newTournament);
  } catch (err) {
    return res.status(500).json({ error: 'Errore nella creazione del torneo' });
  }
});

// GET /api/tournaments/:id
// Dettagli del torneo
router.get('/:id', async function(req, res) {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('creator', 'username name surname');
    if (!tournament) {
      return res.status(404).json({ error: 'Torneo non trovato' });
    }
    return res.json(tournament);
  } catch (err) {
    return res.status(500).json({ error: 'Errore nel recupero dei dettagli del torneo' });
  }
});

// PUT /api/tournaments/:id
// Modifica del torneo (solo creatore) - Gestisce anche l'aggiunta di Squadre e Giocatori
router.put('/:id', requireAuth, async function(req, res) {
  try {
    const tournamentId = req.params.id;
    const userId = req.session.user.id;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Torneo non trovato' });
    }

    // Verifica che l'utente loggato sia il creatore del torneo
    if (tournament.creator.toString() !== userId) {
      return res.status(403).json({ error: 'Non sei autorizzato a modificare questo torneo' });
    }

    const { action } = req.body;

    // Caso 1: Aggiunta di una squadra al torneo
    if (action === 'addTeam') {
      const { teamName } = req.body;
      if (!teamName || teamName.trim() === '') {
        return res.status(400).json({ error: 'Il nome della squadra è obbligatorio' });
      }

      if (tournament.scheduleGenerated) {
        return res.status(400).json({ error: 'Impossibile aggiungere squadre. Il calendario è già stato generato.' });
      }

      if (tournament.teams.length >= tournament.maxTeams) {
        return res.status(400).json({ error: 'Numero massimo di squadre raggiunto per questo torneo.' });
      }

      // Evita doppioni dei nomi squadra nel torneo
      const nameExists = tournament.teams.some(function(t) {
        return t.name.toLowerCase() === teamName.trim().toLowerCase();
      });
      if (nameExists) {
        return res.status(400).json({ error: 'Una squadra con questo nome è già iscritta al torneo.' });
      }

      tournament.teams.push({ name: teamName.trim(), players: [] });
      await tournament.save();
      return res.json(tournament);
    }

    // Caso 2: Aggiunta di un giocatore ad una determinata squadra
    if (action === 'addPlayer') {
      const { teamId, playerName, playerSurname, playerJerseyNumber } = req.body;

      if (!teamId || !playerName || !playerSurname) {
        return res.status(400).json({ error: 'ID squadra, nome e cognome del giocatore sono obbligatori' });
      }

      // Troviamo la squadra all'interno del torneo
      const team = tournament.teams.id(teamId);
      if (!team) {
        return res.status(404).json({ error: 'Squadra non trovata nel torneo' });
      }

      const newPlayer = {
        name: playerName.trim(),
        surname: playerSurname.trim()
      };
      if (playerJerseyNumber) {
        newPlayer.jerseyNumber = parseInt(playerJerseyNumber);
      }

      team.players.push(newPlayer);
      await tournament.save();
      return res.json(tournament);
    }

    // Caso 3: Modifica dei dati generali del torneo (nome, maxTeams, startDate)
    if (tournament.scheduleGenerated) {
      return res.status(400).json({ error: 'Impossibile modificare i dati generali. Il calendario è già stato generato.' });
    }

    const { name, maxTeams, startDate } = req.body;
    if (name) tournament.name = name;
    if (maxTeams) {
      if (parseInt(maxTeams) < tournament.teams.length) {
        return res.status(400).json({ error: 'Il numero massimo di squadre non può essere inferiore alle squadre già iscritte.' });
      }
      tournament.maxTeams = parseInt(maxTeams);
    }
    if (startDate) tournament.startDate = new Date(startDate);

    await tournament.save();
    return res.json(tournament);

  } catch (err) {
    return res.status(500).json({ error: 'Errore durante l\'aggiornamento del torneo' });
  }
});

// DELETE /api/tournaments/:id
// Elimina il torneo (solo creatore)
router.delete('/:id', requireAuth, async function(req, res) {
  try {
    const tournamentId = req.params.id;
    const userId = req.session.user.id;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Torneo non trovato' });
    }

    if (tournament.creator.toString() !== userId) {
      return res.status(403).json({ error: 'Non sei autorizzato a eliminare questo torneo' });
    }

    // Rimuoviamo anche tutte le partite associate a questo torneo
    await Match.deleteMany({ tournament: tournamentId });
    await Tournament.findByIdAndDelete(tournamentId);

    return res.json({ message: 'Torneo e relative partite eliminati con successo' });
  } catch (err) {
    return res.status(500).json({ error: 'Errore durante l\'eliminazione del torneo' });
  }
});

// GET /api/tournaments/:id/standings
// Restituisce la classifica in tempo reale basata sulle partite giocate
router.get('/:id/standings', async function(req, res) {
  try {
    const tournamentId = req.params.id;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Torneo non trovato' });
    }

    // Prendi tutti i match giocati per questo torneo
    const matches = await Match.find({ tournament: tournamentId, status: 'played' });

    // Inizializza la struttura della classifica per ciascuna squadra iscritta
    const standingsMap = {};
    tournament.teams.forEach(function(team) {
      standingsMap[team.name] = {
        team: team.name,
        points: 0,
        played: 0,
        scored: 0,
        conceded: 0,
        difference: 0
      };
    });

    // Elabora i punteggi
    matches.forEach(function(match) {
      const tA = match.teamA;
      const tB = match.teamB;

      // Se per qualche motivo una squadra non è nella mappa (es: eliminata o modificata), inizializzala al volo
      if (!standingsMap[tA]) {
        standingsMap[tA] = { team: tA, points: 0, played: 0, scored: 0, conceded: 0, difference: 0 };
      }
      if (!standingsMap[tB]) {
        standingsMap[tB] = { team: tB, points: 0, played: 0, scored: 0, conceded: 0, difference: 0 };
      }

      const scoreA = match.scoreA;
      const scoreB = match.scoreB;

      standingsMap[tA].played += 1;
      standingsMap[tB].played += 1;
      standingsMap[tA].scored += scoreA;
      standingsMap[tA].conceded += scoreB;
      standingsMap[tB].scored += scoreB;
      standingsMap[tB].conceded += scoreA;

      // Calcola punti in base allo sport
      if (tournament.sport === 'football') {
        if (scoreA > scoreB) {
          standingsMap[tA].points += 3;
        } else if (scoreA < scoreB) {
          standingsMap[tB].points += 3;
        } else {
          standingsMap[tA].points += 1;
          standingsMap[tB].points += 1;
        }
      } else {
        // Volleyball / Basketball: 2 punti al vincitore, 0 al perdente (niente pareggi)
        if (scoreA > scoreB) {
          standingsMap[tA].points += 2;
        } else if (scoreA < scoreB) {
          standingsMap[tB].points += 2;
        }
      }
    });

    // Calcola differenza reti/punti e converti in array
    const standingsList = Object.values(standingsMap).map(function(item) {
      item.difference = item.scored - item.conceded;
      return item;
    });

    // Ordina la classifica: 1) punti desc, 2) diff desc, 3) fatti desc
    standingsList.sort(function(a, b) {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.difference !== a.difference) {
        return b.difference - a.difference;
      }
      return b.scored - a.scored;
    });

    return res.json(standingsList);
  } catch (err) {
    return res.status(500).json({ error: 'Errore nel calcolo della classifica' });
  }
});

module.exports = router;
