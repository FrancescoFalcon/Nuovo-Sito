// Stato globale dell'applicazione
let currentUser = null;
let currentActiveSection = 'section-fields';

// Eseguiamo il codice all'avvio
document.addEventListener('DOMContentLoaded', function() {
  initNavigation();
  checkAuth();
  setupEventListeners();
  loadFields();
  loadTournaments();
  loadUsers();
});

// --- AUTENTICAZIONE E STATO UTENTE ---

// Verifica lo stato dell'utente loggato
async function checkAuth() {
  try {
    const res = await fetch('/api/whoami');
    const data = await res.json();
    
    const navProfile = document.getElementById('btn-nav-profile');
    const btnCreateTournament = document.getElementById('btn-show-create-tournament');
    
    if (data.loggedIn) {
      currentUser = data.user;
      
      // Barra di navigazione per utenti loggati
      navProfile.classList.remove('hidden');
      if (btnCreateTournament) btnCreateTournament.classList.remove('hidden');
      
      document.getElementById('auth-header-container').innerHTML = `
        <span style="font-size: 0.9rem; margin-right: 5px;">Utente: <strong>${currentUser.name}</strong></span>
        <button class="btn btn-secondary btn-sm" id="btn-header-logout">Esci</button>
      `;
      
      document.getElementById('btn-header-logout').addEventListener('click', logout);
      
      // Popola dati profilo
      document.getElementById('profile-user-fullname').innerText = `${currentUser.name} ${currentUser.surname}`;
      document.getElementById('profile-user-username').innerText = `@${currentUser.username}`;
      
      renderProfileBookings(data.bookings || []);
      loadUserTournamentsInProfile();
    } else {
      currentUser = null;
      navProfile.classList.add('hidden');
      if (btnCreateTournament) btnCreateTournament.classList.add('hidden');
      
      document.getElementById('auth-header-container').innerHTML = `
        <button class="btn btn-secondary btn-sm" id="btn-header-login">Accedi</button>
        <button class="btn btn-primary btn-sm" id="btn-header-signup">Registrati</button>
      `;
      
      document.getElementById('btn-header-login').addEventListener('click', function() {
        showSection('section-login');
      });
      document.getElementById('btn-header-signup').addEventListener('click', function() {
        showSection('section-signup');
      });
    }
  } catch (err) {
    console.error('Errore nel controllo autenticazione:', err);
  }
}

// Esegue il logout
async function logout() {
  try {
    const res = await fetch('/api/auth/signout', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      currentUser = null;
      checkAuth();
      showSection('section-fields');
    }
  } catch (err) {
    console.error('Errore logout:', err);
  }
}

// --- NAVIGAZIONE SPA ---

function initNavigation() {
  const navMap = {
    'btn-nav-fields': 'section-fields',
    'btn-nav-tournaments': 'section-tournaments',
    'btn-nav-users': 'section-users',
    'btn-nav-profile': 'section-profile',
    'btn-header-login': 'section-login',
    'btn-header-signup': 'section-signup'
  };

  Object.keys(navMap).forEach(function(btnId) {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', function() {
        showSection(navMap[btnId]);
      });
    }
  });

  // Click sul logo ricarica la pagina iniziale dei campi
  document.getElementById('nav-logo').addEventListener('click', function() {
    showSection('section-fields');
  });
}

function showSection(sectionId) {
  const sections = document.querySelectorAll('.spa-section');
  sections.forEach(function(sec) {
    sec.classList.remove('active');
  });

  const targetSec = document.getElementById(sectionId);
  if (targetSec) {
    targetSec.classList.add('active');
    currentActiveSection = sectionId;
  }

  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(function(btn) {
    btn.classList.remove('active');
  });

  if (sectionId === 'section-fields') document.getElementById('btn-nav-fields').classList.add('active');
  if (sectionId === 'section-tournaments') document.getElementById('btn-nav-tournaments').classList.add('active');
  if (sectionId === 'section-users') document.getElementById('btn-nav-users').classList.add('active');
  if (sectionId === 'section-profile') document.getElementById('btn-nav-profile').classList.add('active');

  // Ripristina viste liste in caso di dettagli aperti
  if (sectionId === 'section-fields') {
    document.getElementById('field-detail-container').classList.add('hidden');
    document.getElementById('fields-grid-container').classList.remove('hidden');
    loadFields();
  }
  if (sectionId === 'section-tournaments') {
    document.getElementById('tournament-detail-container').classList.add('hidden');
    document.getElementById('tournaments-grid-container').classList.remove('hidden');
    document.getElementById('create-tournament-form-container').classList.add('hidden');
    loadTournaments();
  }
  if (sectionId === 'section-users') {
    document.getElementById('user-detail-container').classList.add('hidden');
    document.getElementById('users-grid-container').classList.remove('hidden');
    loadUsers();
  }
  if (sectionId === 'section-profile') {
    checkAuth();
  }
}

// --- IMPOSTAZIONE EVENTI ---

function setupEventListeners() {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('link-go-to-signup').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('section-signup');
  });

  document.getElementById('signup-form').addEventListener('submit', handleSignup);
  document.getElementById('link-go-to-login').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('section-login');
  });

  // Ricerca Campi
  document.getElementById('btn-search-fields').addEventListener('click', function() {
    const q = document.getElementById('search-fields-input').value;
    loadFields(q);
  });
  document.getElementById('search-fields-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      loadFields(this.value);
    }
  });

  // Back Campi
  document.getElementById('btn-back-fields').addEventListener('click', function() {
    document.getElementById('field-detail-container').classList.add('hidden');
    document.getElementById('fields-grid-container').classList.remove('hidden');
  });

  // Ricerca Tornei
  document.getElementById('btn-search-tournaments').addEventListener('click', function() {
    const q = document.getElementById('search-tournaments-input').value;
    loadTournaments(q);
  });
  document.getElementById('search-tournaments-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      loadTournaments(this.value);
    }
  });

  // Form Creazione Torneo
  document.getElementById('btn-show-create-tournament').addEventListener('click', function() {
    document.getElementById('create-tournament-form-container').classList.remove('hidden');
    document.getElementById('tournaments-grid-container').classList.add('hidden');
  });

  document.getElementById('btn-cancel-create-tournament').addEventListener('click', function() {
    document.getElementById('create-tournament-form-container').classList.add('hidden');
    document.getElementById('tournaments-grid-container').classList.remove('hidden');
  });

  document.getElementById('create-tournament-form').addEventListener('submit', handleCreateTournament);

  // Back Tornei
  document.getElementById('btn-back-tournaments').addEventListener('click', function() {
    document.getElementById('tournament-detail-container').classList.add('hidden');
    document.getElementById('tournaments-grid-container').classList.remove('hidden');
  });

  // Iscrizione Squadra
  document.getElementById('add-team-form').addEventListener('submit', handleAddTeam);

  // Modali
  document.getElementById('btn-close-result-modal').addEventListener('click', function() {
    document.getElementById('match-result-modal').classList.add('hidden');
  });
  document.getElementById('match-result-form').addEventListener('submit', handleSaveMatchResult);

  document.getElementById('btn-close-player-modal').addEventListener('click', function() {
    document.getElementById('add-player-modal').classList.add('hidden');
  });
  document.getElementById('add-player-form').addEventListener('submit', handleAddPlayer);

  // Ricerca Utenti
  document.getElementById('btn-search-users').addEventListener('click', function() {
    const q = document.getElementById('search-users-input').value;
    loadUsers(q);
  });
  document.getElementById('search-users-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      loadUsers(this.value);
    }
  });

  // Back Utenti
  document.getElementById('btn-back-users').addEventListener('click', function() {
    document.getElementById('user-detail-container').classList.add('hidden');
    document.getElementById('users-grid-container').classList.remove('hidden');
  });

  document.getElementById('btn-profile-logout').addEventListener('click', logout);
}

// --- FUNZIONALITA MODULI ---

// Login
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username-input').value;
  const password = document.getElementById('login-password-input').value;

  try {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });
    const data = await res.json();
    
    if (res.ok) {
      alert(data.message);
      document.getElementById('login-form').reset();
      await checkAuth();
      showSection('section-fields');
    } else {
      alert(data.error || 'Errore di autenticazione');
    }
  } catch (err) {
    console.error(err);
    alert('Errore di connessione');
  }
}

// Registrazione
async function handleSignup(e) {
  e.preventDefault();
  const username = document.getElementById('signup-username-input').value;
  const name = document.getElementById('signup-name-input').value;
  const surname = document.getElementById('signup-surname-input').value;
  const password = document.getElementById('signup-password-input').value;

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password, name: name, surname: surname })
    });
    const data = await res.json();

    if (res.ok) {
      alert(data.message);
      document.getElementById('signup-form').reset();
      showSection('section-login');
    } else {
      alert(data.error || 'Errore di registrazione');
    }
  } catch (err) {
    console.error(err);
    alert('Errore di connessione');
  }
}

// --- GESTIONE CAMPI ---

// Carica lista campi
async function loadFields(q = '') {
  try {
    const url = q ? `/api/fields?q=${encodeURIComponent(q)}` : '/api/fields';
    const res = await fetch(url);
    const fields = await res.json();

    const container = document.getElementById('fields-grid-container');
    container.innerHTML = '';

    if (fields.length === 0) {
      container.innerHTML = '<p class="info-message">Nessun campo trovato.</p>';
      return;
    }

    fields.forEach(function(field) {
      const card = document.createElement('div');
      card.className = 'item-card';
      
      let sportLabel = field.sport === 'football' ? 'Calcio' : (field.sport === 'volleyball' ? 'Pallavolo' : 'Basket');

      card.innerHTML = `
        <div>
          <span class="sport-badge ${field.sport}">${sportLabel}</span>
          <h3>${field.name}</h3>
          <p>📍 ${field.address}</p>
        </div>
        <div class="item-card-footer">
          <span style="font-size: 0.8rem; color: #64748b;">${field.slots.length} orari</span>
          <button class="btn btn-primary btn-sm" onclick="showFieldDetail('${field._id}')">Prenota</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

// Dettagli campo sportivo e slot orari
async function showFieldDetail(fieldId) {
  try {
    const res = await fetch(`/api/fields/${fieldId}`);
    const field = await res.json();

    document.getElementById('fields-grid-container').classList.add('hidden');
    document.getElementById('field-detail-container').classList.remove('hidden');

    let sportLabel = field.sport === 'football' ? 'Calcio' : (field.sport === 'volleyball' ? 'Pallavolo' : 'Basket');

    document.getElementById('field-detail-sport').className = `sport-badge ${field.sport}`;
    document.getElementById('field-detail-sport').innerText = sportLabel;
    document.getElementById('field-detail-name').innerText = field.name;
    document.getElementById('field-detail-address').innerText = `📍 ${field.address}`;

    const dateInput = document.getElementById('booking-date-input');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.min = today;

    const newDateInput = dateInput.cloneNode(true);
    dateInput.parentNode.replaceChild(newDateInput, dateInput);
    newDateInput.addEventListener('change', function() {
      loadFieldSlots(fieldId, newDateInput.value);
    });

    loadFieldSlots(fieldId, today);
  } catch (err) {
    console.error(err);
  }
}

// Carica slot liberi o occupati per data
async function loadFieldSlots(fieldId, date) {
  const loader = document.getElementById('slots-loading-message');
  const container = document.getElementById('slots-grid-container');
  
  loader.classList.remove('hidden');
  container.innerHTML = '';

  try {
    const res = await fetch(`/api/fields/${fieldId}/slots?date=${date}`);
    const slots = await res.json();
    loader.classList.add('hidden');

    slots.forEach(function(slotInfo) {
      const slotCard = document.createElement('div');
      slotCard.className = 'slot-card';

      const timeHtml = `<div class="slot-time">${slotInfo.slot}</div>`;
      let statusHtml = '';
      let actionHtml = '';

      if (slotInfo.booked) {
        statusHtml = `<div class="slot-status-text booked">Occupato (${slotInfo.user.username})</div>`;
        if (currentUser && slotInfo.user.id === currentUser.id) {
          actionHtml = `<button class="btn btn-danger btn-sm" onclick="cancelBooking('${fieldId}', '${slotInfo.bookingId}', '${date}')">Cancella mio</button>`;
        } else {
          actionHtml = `<button class="btn btn-secondary btn-sm" disabled>Non disp.</button>`;
        }
      } else {
        statusHtml = `<div class="slot-status-text free">Disponibile</div>`;
        if (currentUser) {
          actionHtml = `<button class="btn btn-accent btn-sm" onclick="bookSlot('${fieldId}', '${slotInfo.slot}', '${date}')">Prenota</button>`;
        } else {
          actionHtml = `<button class="btn btn-secondary btn-sm" onclick="showSection('section-login')">Accedi</button>`;
        }
      }

      slotCard.innerHTML = timeHtml + statusHtml + actionHtml;
      container.appendChild(slotCard);
    });
  } catch (err) {
    loader.classList.add('hidden');
    container.innerHTML = '<p class="info-message">Errore caricamento disponibilità.</p>';
    console.error(err);
  }
}

// Effettua prenotazione
async function bookSlot(fieldId, slot, date) {
  try {
    const res = await fetch(`/api/fields/${fieldId}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: date, slot: slot })
    });
    const data = await res.json();

    if (res.ok) {
      alert('Campo prenotato!');
      loadFieldSlots(fieldId, date);
    } else {
      alert(data.error || 'Errore prenotazione');
    }
  } catch (err) {
    console.error(err);
  }
}

// Cancella prenotazione
async function cancelBooking(fieldId, bookingId, date) {
  if (!confirm('Annullare la prenotazione?')) return;
  try {
    const res = await fetch(`/api/fields/${fieldId || 'dummy'}/bookings/${bookingId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (res.ok) {
      alert(data.message);
      if (fieldId) {
        loadFieldSlots(fieldId, date);
      } else {
        checkAuth(); // Aggiorna Mio Profilo
      }
    } else {
      alert(data.error || 'Errore cancellazione');
    }
  } catch (err) {
    console.error(err);
  }
}

// --- GESTIONE TORNEI ---

// Carica lista tornei
async function loadTournaments(q = '') {
  try {
    const url = q ? `/api/tournaments?q=${encodeURIComponent(q)}` : '/api/tournaments';
    const res = await fetch(url);
    const tournaments = await res.json();

    const container = document.getElementById('tournaments-grid-container');
    container.innerHTML = '';

    if (tournaments.length === 0) {
      container.innerHTML = '<p class="info-message">Nessun torneo trovato.</p>';
      return;
    }

    tournaments.forEach(function(t) {
      const card = document.createElement('div');
      card.className = 'item-card';

      let sportLabel = t.sport === 'football' ? 'Calcio' : (t.sport === 'volleyball' ? 'Pallavolo' : 'Basket');
      const dateStr = new Date(t.startDate).toLocaleDateString('it-IT');

      card.innerHTML = `
        <div>
          <span class="sport-badge ${t.sport}">${sportLabel}</span>
          <h3>${t.name}</h3>
          <p>Data inizio: ${dateStr}</p>
          <p style="font-size: 0.8rem; color: #64748b;">Iscritte: ${t.teams.length}/${t.maxTeams} squadre</p>
        </div>
        <div class="item-card-footer">
          <span style="font-size: 0.75rem; color: #64748b;">Org: @${t.creator.username}</span>
          <button class="btn btn-primary btn-sm" onclick="showTournamentDetail('${t._id}')">Dettagli</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

// Crea torneo
async function handleCreateTournament(e) {
  e.preventDefault();
  const name = document.getElementById('tournament-name-input').value;
  const sport = document.getElementById('tournament-sport-input').value;
  const maxTeams = document.getElementById('tournament-maxteams-input').value;
  const startDate = document.getElementById('tournament-startdate-input').value;

  try {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, sport: sport, maxTeams: maxTeams, startDate: startDate })
    });
    const data = await res.json();

    if (res.ok) {
      alert('Torneo creato!');
      document.getElementById('create-tournament-form').reset();
      document.getElementById('create-tournament-form-container').classList.add('hidden');
      document.getElementById('tournaments-grid-container').classList.remove('hidden');
      loadTournaments();
    } else {
      alert(data.error || 'Errore creazione torneo');
    }
  } catch (err) {
    console.error(err);
  }
}

// Dettagli del torneo (classifica, iscrizioni squadre, calendario)
async function showTournamentDetail(tournamentId) {
  try {
    const res = await fetch(`/api/tournaments/${tournamentId}`);
    const tournament = await res.json();

    document.getElementById('tournaments-grid-container').classList.add('hidden');
    document.getElementById('tournament-detail-container').classList.remove('hidden');

    let sportLabel = tournament.sport === 'football' ? 'Calcio' : (tournament.sport === 'volleyball' ? 'Pallavolo' : 'Basket');

    document.getElementById('tournament-detail-sport').className = `sport-badge ${tournament.sport}`;
    document.getElementById('tournament-detail-sport').innerText = sportLabel;
    document.getElementById('tournament-detail-name').innerText = tournament.name;
    document.getElementById('tournament-detail-creator').innerText = `@${tournament.creator.username}`;
    document.getElementById('tournament-detail-startdate').innerText = new Date(tournament.startDate).toLocaleDateString('it-IT');
    document.getElementById('tournament-detail-teams-count').innerText = `${tournament.teams.length} / ${tournament.maxTeams}`;

    const isCreator = currentUser && tournament.creator._id === currentUser.id;
    const controls = document.getElementById('tournament-creator-controls');
    
    if (isCreator) {
      controls.classList.remove('hidden');
      const btnDelete = document.getElementById('btn-delete-tournament');
      const newBtnDelete = btnDelete.cloneNode(true);
      btnDelete.parentNode.replaceChild(newBtnDelete, btnDelete);
      newBtnDelete.addEventListener('click', function() {
        deleteTournament(tournamentId);
      });
    } else {
      controls.classList.add('hidden');
    }

    const addTeamFormContainer = document.getElementById('add-team-form-container');
    if (isCreator && !tournament.scheduleGenerated && tournament.teams.length < tournament.maxTeams) {
      addTeamFormContainer.classList.remove('hidden');
      document.getElementById('add-team-form').setAttribute('data-tournament-id', tournamentId);
    } else {
      addTeamFormContainer.classList.add('hidden');
    }

    renderTournamentTeams(tournament, isCreator);

    const btnGenerate = document.getElementById('btn-generate-schedule');
    const newBtnGenerate = btnGenerate.cloneNode(true);
    btnGenerate.parentNode.replaceChild(newBtnGenerate, btnGenerate);

    if (isCreator && !tournament.scheduleGenerated && tournament.teams.length === tournament.maxTeams) {
      newBtnGenerate.classList.remove('hidden');
      newBtnGenerate.addEventListener('click', function() {
        generateTournamentSchedule(tournamentId);
      });
    } else {
      newBtnGenerate.classList.add('hidden');
    }

    loadTournamentStandings(tournamentId);
    loadTournamentMatches(tournamentId, isCreator);

  } catch (err) {
    console.error(err);
  }
}

// Elimina torneo
async function deleteTournament(id) {
  if (!confirm('Eliminare questo torneo?')) return;
  try {
    const res = await fetch(`/api/tournaments/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      showSection('section-tournaments');
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error(err);
  }
}

// Aggiunge una squadra
async function handleAddTeam(e) {
  e.preventDefault();
  const tournamentId = this.getAttribute('data-tournament-id');
  const teamNameInput = document.getElementById('team-name-input');
  const teamName = teamNameInput.value;

  try {
    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addTeam', teamName: teamName })
    });
    const data = await res.json();

    if (res.ok) {
      alert('Squadra iscritta!');
      teamNameInput.value = '';
      showTournamentDetail(tournamentId);
    } else {
      alert(data.error || 'Errore iscrizione squadra');
    }
  } catch (err) {
    console.error(err);
  }
}

// Disegna squadre iscritte e permette inserimento giocatori
function renderTournamentTeams(tournament, isCreator) {
  const container = document.getElementById('tournament-teams-list-container');
  container.innerHTML = '';

  if (tournament.teams.length === 0) {
    container.innerHTML = '<p class="info-message">Nessuna squadra iscritta.</p>';
    return;
  }

  tournament.teams.forEach(function(team) {
    const teamDiv = document.createElement('div');
    teamDiv.className = 'team-item';

    let playersHtml = '';
    if (team.players.length === 0) {
      playersHtml = '<li class="info-message" style="padding: 0;">Nessun giocatore registrato.</li>';
    } else {
      team.players.forEach(function(p) {
        const num = p.jerseyNumber ? `[#${p.jerseyNumber}] ` : '';
        playersHtml += `<li>${num}${p.name} ${p.surname}</li>`;
      });
    }

    const addPlayerBtn = isCreator 
      ? `<button class="btn btn-secondary btn-sm" onclick="openAddPlayerModal('${tournament._id}', '${team._id}', '${team.name}')">+ Giocatore</button>`
      : '';

    teamDiv.innerHTML = `
      <div class="team-header">
        <span>🛡️ ${team.name}</span>
        ${addPlayerBtn}
      </div>
      <ul class="players-list">
        ${playersHtml}
      </ul>
    `;
    container.appendChild(teamDiv);
  });
}

function openAddPlayerModal(tournamentId, teamId, teamName) {
  document.getElementById('modal-player-team-name').innerText = teamName;
  document.getElementById('modal-player-team-id-input').value = teamId;
  document.getElementById('add-player-form').setAttribute('data-tournament-id', tournamentId);
  document.getElementById('add-player-modal').classList.remove('hidden');
}

// Aggiunge giocatore
async function handleAddPlayer(e) {
  e.preventDefault();
  const tournamentId = this.getAttribute('data-tournament-id');
  const teamId = document.getElementById('modal-player-team-id-input').value;
  const name = document.getElementById('player-name-input').value;
  const surname = document.getElementById('player-surname-input').value;
  const jerseyNumber = document.getElementById('player-jersey-input').value;

  try {
    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addPlayer',
        teamId: teamId,
        playerName: name,
        playerSurname: surname,
        playerJerseyNumber: jerseyNumber
      })
    });
    const data = await res.json();

    if (res.ok) {
      alert('Giocatore aggiunto!');
      document.getElementById('add-player-form').reset();
      document.getElementById('add-player-modal').classList.add('hidden');
      showTournamentDetail(tournamentId);
    } else {
      alert(data.error || 'Errore inserimento giocatore');
    }
  } catch (err) {
    console.error(err);
  }
}

// Genera calendario incontri
async function generateTournamentSchedule(tournamentId) {
  try {
    const res = await fetch(`/api/tournaments/${tournamentId}/matches/generate`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      showTournamentDetail(tournamentId);
    } else {
      alert(data.error || 'Errore generazione calendario');
    }
  } catch (err) {
    console.error(err);
  }
}

// Carica classifica
async function loadTournamentStandings(tournamentId) {
  try {
    const res = await fetch(`/api/tournaments/${tournamentId}/standings`);
    const standings = await res.json();

    const tbody = document.getElementById('tournament-standings-tbody');
    tbody.innerHTML = '';

    if (standings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Iscrivi le squadre per visualizzare la classifica.</td></tr>';
      return;
    }

    standings.forEach(function(item, index) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: bold;">${index + 1}</td>
        <td>${item.team}</td>
        <td style="font-weight: bold; color: #2563eb;">${item.points}</td>
        <td>${item.played}</td>
        <td>${item.scored}</td>
        <td>${item.conceded}</td>
        <td>${item.difference}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

// Carica incontri torneo
async function loadTournamentMatches(tournamentId, isCreator) {
  const container = document.getElementById('tournament-matches-container');
  container.innerHTML = '';

  try {
    const res = await fetch(`/api/tournaments/${tournamentId}/matches`);
    const matches = await res.json();

    if (matches.length === 0) {
      container.innerHTML = '<p class="info-message">Nessun incontro programmato.</p>';
      return;
    }

    const now = new Date();

    matches.forEach(function(match) {
      const matchDiv = document.createElement('div');
      matchDiv.className = 'match-item';

      const matchDate = new Date(match.date);
      const dateStr = matchDate.toLocaleDateString('it-IT');
      const isPastOrToday = matchDate <= now;

      let actionBtn = '';
      if (isCreator && isPastOrToday && match.status === 'upcoming') {
        actionBtn = `
          <button class="btn btn-secondary btn-sm" style="margin-top: 5px;" 
            onclick="openMatchResultModal('${match._id}', '${match.teamA}', '${match.teamB}')">
            Inserisci Risultato
          </button>
        `;
      }

      const scoreDisplay = match.status === 'played'
        ? `<div class="match-score">${match.scoreA} - ${match.scoreB}</div>`
        : `<div class="match-score" style="color: #64748b; font-weight: normal;">vs</div>`;

      matchDiv.innerHTML = `
        <div class="match-info-row">
          <span>📅 Data: ${dateStr}</span>
          <span style="font-weight: 500;">${match.status === 'played' ? 'Giocato' : 'Da giocare'}</span>
        </div>
        <div class="match-teams-row">
          <span style="flex: 1;">${match.teamA}</span>
          ${scoreDisplay}
          <span style="flex: 1; text-align: right;">${match.teamB}</span>
        </div>
        ${actionBtn}
      `;
      container.appendChild(matchDiv);
    });
  } catch (err) {
    container.innerHTML = '<p class="info-message">Errore caricamento incontri.</p>';
    console.error(err);
  }
}

function openMatchResultModal(matchId, teamA, teamB) {
  document.getElementById('modal-match-id-input').value = matchId;
  document.getElementById('modal-match-teams-label').innerText = `${teamA} vs ${teamB}`;
  document.getElementById('modal-team-a-label').innerText = teamA;
  document.getElementById('modal-team-b-label').innerText = teamB;
  document.getElementById('score-a-input').value = '';
  document.getElementById('score-b-input').value = '';
  document.getElementById('match-result-modal').classList.remove('hidden');
}

// Inserisce risultato match
async function handleSaveMatchResult(e) {
  e.preventDefault();
  const matchId = document.getElementById('modal-match-id-input').value;
  const scoreA = document.getElementById('score-a-input').value;
  const scoreB = document.getElementById('score-b-input').value;

  try {
    const res = await fetch(`/api/matches/${matchId}/result`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoreA: scoreA, scoreB: scoreB })
    });
    const data = await res.json();

    if (res.ok) {
      alert('Risultato inserito!');
      document.getElementById('match-result-modal').classList.add('hidden');
      showTournamentDetail(data.tournament);
    } else {
      alert(data.error || 'Impossibile salvare il risultato');
    }
  } catch (err) {
    console.error(err);
  }
}

// --- GESTIONE UTENTI ---

// Carica lista utenti
async function loadUsers(q = '') {
  try {
    const url = q ? `/api/users?q=${encodeURIComponent(q)}` : '/api/users';
    const res = await fetch(url);
    const users = await res.json();

    const container = document.getElementById('users-grid-container');
    container.innerHTML = '';

    if (users.length === 0) {
      container.innerHTML = '<p class="info-message">Nessun utente trovato.</p>';
      return;
    }

    users.forEach(function(user) {
      const card = document.createElement('div');
      card.className = 'item-card';

      card.innerHTML = `
        <div>
          <h3>${user.name} ${user.surname}</h3>
          <p>@${user.username}</p>
        </div>
        <div class="item-card-footer">
          <button class="btn btn-primary btn-sm" onclick="showUserDetail('${user._id}')">Vedi Profilo</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

// Mostra dettagli utente e suoi tornei
async function showUserDetail(userId) {
  try {
    const res = await fetch(`/api/users/${userId}`);
    const data = await res.json();

    document.getElementById('users-grid-container').classList.add('hidden');
    document.getElementById('user-detail-container').classList.remove('hidden');

    document.getElementById('user-detail-name').innerText = `${data.user.name} ${data.user.surname}`;
    document.getElementById('user-detail-username').innerText = `@${data.user.username}`;

    const tournamentsGrid = document.getElementById('user-tournaments-grid-container');
    tournamentsGrid.innerHTML = '';

    if (data.tournaments.length === 0) {
      tournamentsGrid.innerHTML = '<p class="info-message">Nessun torneo creato da questo utente.</p>';
      return;
    }

    data.tournaments.forEach(function(t) {
      const card = document.createElement('div');
      card.className = 'item-card';
      let sportLabel = t.sport === 'football' ? 'Calcio' : (t.sport === 'volleyball' ? 'Pallavolo' : 'Basket');

      card.innerHTML = `
        <div>
          <span class="sport-badge ${t.sport}">${sportLabel}</span>
          <h3>${t.name}</h3>
          <p>Inizio: ${new Date(t.startDate).toLocaleDateString('it-IT')}</p>
        </div>
        <div class="item-card-footer">
          <span style="font-size: 0.8rem; color: #64748b;">${t.teams.length}/${t.maxTeams} squadre</span>
          <button class="btn btn-secondary btn-sm" onclick="goToTournamentFromUser('${t._id}')">Vedi Torneo</button>
        </div>
      `;
      tournamentsGrid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

function goToTournamentFromUser(tournamentId) {
  showSection('section-tournaments');
  showTournamentDetail(tournamentId);
}

// --- MIO PROFILO ---

// Disegna prenotazioni utente correntemente loggato
function renderProfileBookings(bookings) {
  const tbody = document.getElementById('profile-bookings-tbody');
  tbody.innerHTML = '';

  const activeBookings = bookings.filter(function(b) {
    const startTime = b.slot.split('-')[0];
    const bookingDate = new Date(`${b.date}T${startTime}:00`);
    return bookingDate >= new Date();
  });

  if (activeBookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nessuna prenotazione attiva.</td></tr>';
    return;
  }

  activeBookings.forEach(function(b) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.field.name}</td>
      <td>${new Date(b.date).toLocaleDateString('it-IT')}</td>
      <td>${b.slot}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="cancelBooking('', '${b._id}', '')">Annulla</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Carica tornei creati dall'utente loggato nel suo profilo
async function loadUserTournamentsInProfile() {
  const container = document.getElementById('profile-tournaments-grid-container');
  container.innerHTML = '';

  try {
    const res = await fetch(`/api/users/${currentUser.id}`);
    const data = await res.json();

    if (data.tournaments.length === 0) {
      container.innerHTML = '<p class="info-message">Non hai creato nessun torneo.</p>';
      return;
    }

    data.tournaments.forEach(function(t) {
      const card = document.createElement('div');
      card.className = 'item-card';
      let sportLabel = t.sport === 'football' ? 'Calcio' : (t.sport === 'volleyball' ? 'Pallavolo' : 'Basket');

      card.innerHTML = `
        <div>
          <span class="sport-badge ${t.sport}">${sportLabel}</span>
          <h3>${t.name}</h3>
          <p>Inizio: ${new Date(t.startDate).toLocaleDateString('it-IT')}</p>
        </div>
        <div class="item-card-footer">
          <span style="font-size: 0.8rem; color: #64748b;">${t.teams.length}/${t.maxTeams} squadre</span>
          <button class="btn btn-primary btn-sm" onclick="goToTournamentFromUser('${t._id}')">Gestisci</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}
