
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static('public'));

const dataDir = path.join(__dirname, 'data');

// Helper functions
const readJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  } catch {
    return file === 'users.json' ? [{ username: 'admin', password: 'admin', role: 'admin' }] : [];
  }
};

const writeJSON = (file, data) => {
  fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2));
};

// Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON('users.json');
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, role: user.role });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/api/session', (req, res) => {
  const session = readJSON('session.json');
  res.json(session.length > 0 ? session[0] : { active: false });
});

app.post('/api/session', (req, res) => {
  writeJSON('session.json', [req.body]);
  res.json({ success: true });
});

app.get('/api/parties', (req, res) => {
  res.json(readJSON('parties.json'));
});

app.post('/api/parties', (req, res) => {
  const parties = readJSON('parties.json');
  parties.push(req.body);
  writeJSON('parties.json', parties);
  res.json({ success: true });
});

app.delete('/api/parties/:name', (req, res) => {
  const parties = readJSON('parties.json').filter(p => p.name !== req.params.name);
  writeJSON('parties.json', parties);
  const candidates = readJSON('candidates.json').filter(c => c.party !== req.params.name);
  writeJSON('candidates.json', candidates);
  res.json({ success: true });
});

app.get('/api/candidates', (req, res) => {
  res.json(readJSON('candidates.json'));
});

app.post('/api/candidates', (req, res) => {
  const candidates = readJSON('candidates.json');
  candidates.push(req.body);
  writeJSON('candidates.json', candidates);
  res.json({ success: true });
});

app.delete('/api/candidates/:name', (req, res) => {
  const candidates = readJSON('candidates.json').filter(c => c.name !== req.params.name);
  writeJSON('candidates.json', candidates);
  res.json({ success: true });
});

app.get('/api/parties-with-candidates', (req, res) => {
  const parties = readJSON('parties.json');
  const candidates = readJSON('candidates.json');
  const result = parties.map(party => ({
    name: party.name,
    candidates: candidates.filter(c => c.party === party.name)
  }));
  res.json(result);
});

app.post('/api/vote', (req, res) => {
  const { username, candidate } = req.body;
  const votes = readJSON('votes.json');
  if (votes.find(v => v.username === username)) {
    return res.json({ success: false, message: 'You have already voted' });
  }
  const candidates = readJSON('candidates.json');
  const candidateData = candidates.find(c => c.name === candidate);
  if (!candidateData) {
    return res.json({ success: false, message: 'Invalid candidate' });
  }
  votes.push({ username, candidate, party: candidateData.party });
  writeJSON('votes.json', votes);
  res.json({ success: true });
});

app.get('/api/voters', (req, res) => {
  res.json(readJSON('votes.json'));
});

app.get('/api/results', (req, res) => {
  const votes = readJSON('votes.json');
  const candidateVotes = {};
  const partyVotes = {};
  
  votes.forEach(v => {
    candidateVotes[v.candidate] = (candidateVotes[v.candidate] || 0) + 1;
    partyVotes[v.party] = (partyVotes[v.party] || 0) + 1;
  });

  const winner = Object.keys(candidateVotes).reduce((a, b) => candidateVotes[a] > candidateVotes[b] ? a : b, null);
  const partyWinner = Object.keys(partyVotes).reduce((a, b) => partyVotes[a] > partyVotes[b] ? a : b, null);

  res.json({
    totalVoters: votes.length,
    candidateVotes,
    partyVotes,
    winner,
    partyWinner
  });
});

app.post('/api/reset-votes', (req, res) => {
  writeJSON('votes.json', []);
  res.json({ success: true });
});

// User Management Endpoints
app.get('/api/users', (req, res) => {
  res.json(readJSON('users.json'));
});

app.post('/api/users', (req, res) => {
  const { username, password, role } = req.body;
  const users = readJSON('users.json');
  
  if (users.find(u => u.username === username)) {
    return res.json({ success: false, message: 'Username already exists' });
  }
  
  users.push({ username, password, role: role || 'user' });
  writeJSON('users.json', users);
  res.json({ success: true });
});

app.delete('/api/users/:username', (req, res) => {
  const users = readJSON('users.json').filter(u => u.username !== req.params.username);
  writeJSON('users.json', users);
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
