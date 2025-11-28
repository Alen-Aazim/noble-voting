const backendUrl = '/api';
let currentUser = null;
let currentRole = null;
let adminActiveTab = 'voting-system';

// Load theme preference
function loadTheme() {
	const theme = localStorage.getItem('theme') || 'dark';
	if (theme === 'light') {
		document.body.classList.add('light-mode');
	}
}

// Toggle theme
function toggleTheme() {
	document.body.classList.toggle('light-mode');
	const isDark = !document.body.classList.contains('light-mode');
	localStorage.setItem('theme', isDark ? 'dark' : 'light');
	updateThemeButton();
}

// Update theme button icon
function updateThemeButton() {
	const btn = document.querySelector('.theme-toggle');
	if (btn) {
		const isDark = !document.body.classList.contains('light-mode');
		btn.textContent = isDark ? '🌙' : '☀️';
	}
}

// Load theme on startup
loadTheme();

function renderLogin() {
	document.getElementById('app').innerHTML = `
		<div class='glass-card'>
			<button class='theme-toggle' onclick='toggleTheme()'>🌙</button>
			<div class='title'>🗳️ Noble Voting System</div>
			<div class='subtitle'>Secure & Transparent Voting Platform</div>
			<form id='loginForm'>
				<input type='text' id='username' placeholder='Username' required>
				<input type='password' id='password' placeholder='Password' required>
				<button class='btn btn-primary' type='submit'>Sign In</button>
			</form>
			<div id='loginMsg'></div>
		</div>
	`;
	updateThemeButton();
	document.getElementById('loginForm').onsubmit = async (e) => {
		e.preventDefault();
		const username = document.getElementById('username').value;
		const password = document.getElementById('password').value;
		const res = await fetch(backendUrl + '/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		const data = await res.json();
		if (data.success) {
			currentUser = username;
			currentRole = data.role;
			if (currentRole === 'admin') renderAdminPanel();
			else renderDashboard();
		} else {
			document.getElementById('loginMsg').innerHTML = `<div class='message error'>${data.message || 'Login failed'}</div>`;
		}
	};
}

function renderDashboard() {
	document.getElementById('app').innerHTML = `
		<div class='glass-card'>
			<button class='theme-toggle' onclick='toggleTheme()'>🌙</button>
			<div class='title'>Welcome, ${currentUser}!</div>
			<div class='subtitle'>Noble Voting System Dashboard</div>
			<button class='btn btn-primary' id='startVotingBtn'>Cast Your Vote</button>
			<button class='btn' id='seePartiesBtn'>View Parties & Candidates</button>
			<button class='btn' id='resultsBtn'>Live Results</button>
			<button class='btn' id='aboutBtn'>About System</button>
			<a href='#' class='logout-link' id='logout'>Logout</a>
		</div>
	`;
	updateThemeButton();
	document.getElementById('startVotingBtn').onclick = renderVotingPage;
	document.getElementById('seePartiesBtn').onclick = renderPartiesCandidates;
	document.getElementById('resultsBtn').onclick = renderResults;
	document.getElementById('aboutBtn').onclick = renderAbout;
	document.getElementById('logout').onclick = () => { currentUser = null; currentRole = null; renderLogin(); };
}

function renderVotingPage() {
	fetch(backendUrl + '/session').then(r=>r.json()).then(session => {
		if (!session.active) {
			document.getElementById('app').innerHTML = `
				<div class='glass-card'>
					<button class='theme-toggle' onclick='toggleTheme()'>🌙</button>
					<div class='title'>⏸️ Voting Paused</div>
					<div class='subtitle'>Voting is currently not active</div>
					<button class='btn' onclick='window.location.reload()'>Back to Dashboard</button>
				</div>
			`;
			updateThemeButton();
			return;
		}
		fetch(backendUrl + '/parties-with-candidates').then(r=>r.json()).then(partiesData => {
			if (partiesData.length === 0 || partiesData.every(p => p.candidates.length === 0)) {
				document.getElementById('app').innerHTML = `
					<div class='glass-card'>
						<button class='theme-toggle' onclick='toggleTheme()'>🌙</button>
						<div class='title'>No Candidates</div>
						<div class='subtitle'>No candidates available yet</div>
						<button class='btn' onclick='window.location.reload()'>Back</button>
					</div>
				`;
				updateThemeButton();
				return;
			}
			let selectedCandidate = null;
			let partiesHtml = partiesData.map(party => {
				if (party.candidates.length === 0) return '';
				let candidatesHtml = party.candidates.map(c => `
					<div class='candidate-card' data-name='${c.name}'>
						<div class='candidate-name'>${c.name}</div>
					</div>
				`).join('');
				return `
					<div class='party-category'>
						<div class='party-header'>🎯 ${party.name}</div>
						${candidatesHtml}
					</div>
				`;
			}).join('');
			
			document.getElementById('app').innerHTML = `
				<div class='glass-card'>
					<button class='theme-toggle' onclick='toggleTheme()'>🌙</button>
					<div class='title'>Cast Your Vote</div>
					<div class='subtitle'>Select a candidate from any party below</div>
					${partiesHtml}
					<button class='btn btn-primary' id='submitVote' style='margin-top:1.5rem;' disabled>Submit Vote</button>
					<div id='voteMsg'></div>
					<button class='btn' id='backBtn' style='margin-top:1rem;'>Back</button>
				</div>
			`;
			updateThemeButton();
			document.querySelectorAll('.candidate-card').forEach(card => {
				card.onclick = () => {
					document.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
					card.classList.add('selected');
					selectedCandidate = card.dataset.name;
					document.getElementById('submitVote').disabled = false;
				};
			});
			document.getElementById('submitVote').onclick = async () => {
				if (!selectedCandidate) return;
				const res = await fetch(backendUrl + '/vote', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ username: currentUser, candidate: selectedCandidate })
				});
				const data = await res.json();
				document.getElementById('voteMsg').innerHTML = data.success 
					? `<div class='message success'>✓ Vote cast successfully!</div>` 
					: `<div class='message error'>${data.message || 'Vote failed'}</div>`;
				if (data.success) {
					setTimeout(() => renderDashboard(), 2000);
				}
			};
			document.getElementById('backBtn').onclick = renderDashboard;
		});
	});
}

function renderPartiesCandidates() {
	fetch(backendUrl + '/parties-with-candidates').then(r=>r.json()).then(partiesData => {
		let partiesHtml = partiesData.length ? partiesData.map(party => {
			let candidatesHtml = party.candidates.length 
				? party.candidates.map(c=>`<li>${c.name}</li>`).join('') 
				: '<li class="no-candidates">No candidates yet</li>';
			return `
				<div class='party-category'>
					<div class='party-header'>🎯 ${party.name}</div>
					<ul class='list'>${candidatesHtml}</ul>
				</div>
			`;
		}).join('') : '<div class="no-candidates">No parties available</div>';
		
		document.getElementById('app').innerHTML = `
			<div class='glass-card'>
				<button class='theme-toggle' onclick='toggleTheme()'>🌙</button>
				<div class='title'>Parties & Candidates</div>
				<div class='subtitle'>Browse all participating parties</div>
				${partiesHtml}
				<button class='btn' id='backBtn'>Back</button>
			</div>
		`;
		updateThemeButton();
		document.getElementById('backBtn').onclick = renderDashboard;
	});
}

function renderResults() {
	fetch(backendUrl + '/results').then(r=>r.json()).then(results => {
		let candidatesList = Object.entries(results.candidateVotes).map(([c,v])=>`<li>${c} <span class='badge'>${v} votes</span></li>`).join('');
		let partiesList = Object.entries(results.partyVotes).map(([p,v])=>`<li>${p} <span class='badge'>${v} votes</span></li>`).join('');
		document.getElementById('app').innerHTML = `
			<div class='glass-card'>
				<button class='theme-toggle' onclick='toggleTheme()'>🌙</button>
				<div class='title'>Live Results</div>
				<div class='subtitle'>Real-time voting statistics</div>
				<div class='stats'>
					<div class='stat-box'>
						<div class='stat-number'>${results.totalVoters}</div>
						<div class='stat-label'>Total Voters</div>
					</div>
				</div>
				<div class='card-section'>
					<div class='section-title'>🏆 Leading Candidate</div>
					<div style='text-align:center;font-size:1.5rem;color:var(--text-primary);font-weight:700;'>${results.winner || 'TBD'}</div>
				</div>
				<div class='card-section'>
					<div class='section-title'>🏆 Leading Party</div>
					<div style='text-align:center;font-size:1.5rem;color:var(--text-primary);font-weight:700;'>${results.partyWinner || 'TBD'}</div>
				</div>
				<div class='card-section'>
					<div class='section-title'>Candidate Breakdown</div>
					<ul class='list'>${candidatesList || '<li>No votes yet</li>'}</ul>
				</div>
				<div class='card-section'>
					<div class='section-title'>Party Breakdown</div>
					<ul class='list'>${partiesList || '<li>No votes yet</li>'}</ul>
				</div>
				<button class='btn' id='backBtn'>Back</button>
			</div>
		`;
		updateThemeButton();
		document.getElementById('backBtn').onclick = renderDashboard;
	});
}

function renderAbout() {
	document.getElementById('app').innerHTML = `
		<div class='glass-card'>
			<button class='theme-toggle' onclick='toggleTheme()'>🌙</button>
			<div class='title'>About Noble Voting System</div>
			<div class='subtitle'>Transparent Democratic Platform</div>
			<div class='card-section'>
				<p style='color:var(--text-primary);line-height:1.8;'>
					Noble Voting System is a modern, secure, and transparent digital voting platform designed for educational institutions and organizations. 
					Features include real-time results, secure authentication, party-based candidate organization, and a powerful admin dashboard.
				</p>
			</div>
			<div class='card-section'>
				<div class='section-title'>👨‍💻 Developers</div>
				<ul class='list'>
					<li>Farzeen - Full Stack Developer</li>
					<li>Aazim - Backend Engineer</li>
					<li>LAPY HUB Team - Frontend & UI/UX</li>
				</ul>
			</div>
			<button class='btn' id='backBtn'>Back</button>
		</div>
	`;
	updateThemeButton();
	document.getElementById('backBtn').onclick = renderDashboard;
}

function renderAdminPanel() {
	Promise.all([
		fetch(backendUrl + '/session').then(r=>r.json()),
		fetch(backendUrl + '/parties').then(r=>r.json()),
		fetch(backendUrl + '/candidates').then(r=>r.json()),
		fetch(backendUrl + '/voters').then(r=>r.json()),
		fetch(backendUrl + '/results').then(r=>r.json()),
		fetch(backendUrl + '/users').then(r=>r.json())
	]).then(([session, parties, candidates, voters, results, users]) => {
		renderAdminContent(session, parties, candidates, voters, results, users);
	});
}

function renderAdminContent(session, parties, candidates, voters, results, users) {
	const tabStyle = `
		<style>
			.admin-tabs {
				display: flex;
				gap: 0.5rem;
				margin-bottom: 1.5rem;
				border-bottom: 2px solid var(--text-tertiary);
				padding-bottom: 0.5rem;
				flex-wrap: wrap;
			}
			.admin-tab {
				padding: 0.7rem 1.2rem;
				background: transparent;
				border: none;
				color: var(--text-secondary);
				cursor: pointer;
				font-size: 0.95rem;
				font-weight: 500;
				transition: 0.3s;
				border-bottom: 3px solid transparent;
				margin-bottom: -0.5rem;
			}
			.admin-tab:hover {
				color: var(--text-primary);
			}
			.admin-tab.active {
				color: var(--btn-bg);
				border-bottom-color: var(--btn-bg);
			}
			.tab-content {
				display: none;
			}
			.tab-content.active {
				display: block;
			}
		</style>
	`;

	document.getElementById('app').innerHTML = `
		${tabStyle}
		<div class='glass-card' style='max-width:900px;'>
			<button class='theme-toggle' onclick='toggleTheme()'>🌙</button>
			<div class='title'>⚙️ Admin Control Center</div>
			<div class='subtitle'>Noble Voting System Administration</div>
			
			<div class='admin-tabs'>
				<button class='admin-tab ${adminActiveTab === 'voting-system' ? 'active' : ''}' onclick='switchAdminTab("voting-system", this)'>🗳️ Voting System</button>
				<button class='admin-tab ${adminActiveTab === 'add-user' ? 'active' : ''}' onclick='switchAdminTab("add-user", this)'>👥 Add User</button>
				<button class='admin-tab ${adminActiveTab === 'live-stats' ? 'active' : ''}' onclick='switchAdminTab("live-stats", this)'>📊 Live Stats</button>
				<button class='admin-tab ${adminActiveTab === 'voters' ? 'active' : ''}' onclick='switchAdminTab("voters", this)'>🧾 Voters</button>
			</div>

			<!-- Voting System Tab -->
			<div id='voting-system' class='tab-content ${adminActiveTab === 'voting-system' ? 'active' : ''}'>
				<div class='card-section'>
					<div class='section-title'>Voting Session</div>
					<div class='stats'>
						<div class='stat-box'>
							<div class='stat-label'>Status</div>
							<div class='stat-number' style='font-size:1.3rem;'>${session.active ? '🟢 Active' : '🔴 Inactive'}</div>
						</div>
						<div class='stat-box'>
							<div class='stat-label'>Total Votes</div>
							<div class='stat-number'>${results.totalVoters}</div>
						</div>
					</div>
					<div class='grid'>
						<button class='btn btn-primary' id='startSessionBtn'>Start Voting</button>
						<button class='btn btn-danger' id='endSessionBtn'>End Voting</button>
					</div>
				</div>

				<div class='card-section'>
					<div class='section-title'>Add Party</div>
					<form id='addPartyForm'>
						<input type='text' id='partyName' placeholder='Enter party name' required>
						<button class='btn' type='submit'>Add Party</button>
					</form>
				</div>

				<div class='card-section'>
					<div class='section-title'>Add Candidate</div>
					<form id='addCandidateForm'>
						<input type='text' id='candidateName' placeholder='Candidate name' required>
						<input type='text' id='candidateParty' placeholder='Party name' required>
						<button class='btn' type='submit'>Add Candidate</button>
					</form>
				</div>

				<div class='grid'>
					<div class='card-section'>
						<div class='section-title'>Parties (${parties.length})</div>
						<ul class='list'>
							${parties.length ? parties.map(p=>`<li>${p.name} <button class='badge' onclick='deleteParty("${p.name}")'>Delete</button></li>`).join('') : '<li>No parties yet</li>'}
						</ul>
					</div>
					<div class='card-section'>
						<div class='section-title'>Candidates (${candidates.length})</div>
						<ul class='list'>
							${candidates.length ? candidates.map(c=>`<li>${c.name} <span style='color:var(--text-tertiary);'>(${c.party})</span> <button class='badge' onclick='deleteCandidate("${c.name}")'>Delete</button></li>`).join('') : '<li>No candidates yet</li>'}
						</ul>
					</div>
				</div>

				<button class='btn btn-danger' id='resetBtn' style='margin-top:1rem; width:100%;'>Reset All Votes</button>
			</div>

			<!-- Add User Tab -->
			<div id='add-user' class='tab-content ${adminActiveTab === 'add-user' ? 'active' : ''}'>
				<div class='card-section'>
					<div class='section-title'>Create New User</div>
					<form id='addUserForm'>
						<input type='text' id='newUsername' placeholder='Username' required>
						<input type='password' id='newPassword' placeholder='Password' required>
						<select id='userRole' required style='width:100%;padding:0.7rem;margin:0.5rem 0;border:none;border-radius:0.5rem;background-color:var(--input-bg);color:var(--text-primary);'>
							<option value='user'>User</option>
							<option value='admin'>Admin</option>
						</select>
						<button class='btn btn-primary' type='submit' style='width:100%;'>Create User</button>
					</form>
				</div>

				<div class='card-section'>
					<div class='section-title'>All Users (${users.length})</div>
					<ul class='list'>
						${users.length ? users.map(u=>`<li>${u.username} <span style='color:var(--text-tertiary);'>(${u.role})</span> <button class='badge' onclick='deleteUser("${u.username}")'>Delete</button></li>`).join('') : '<li>No users yet</li>'}
					</ul>
				</div>
			</div>

			<!-- Live Stats Tab -->
			<div id='live-stats' class='tab-content ${adminActiveTab === 'live-stats' ? 'active' : ''}'>
				<div class='card-section'>
					<div class='section-title'>Voting Overview</div>
					<div class='stats'>
						<div class='stat-box'>
							<div class='stat-label'>Total Votes Cast</div>
							<div class='stat-number'>${results.totalVoters}</div>
						</div>
						<div class='stat-box'>
							<div class='stat-label'>Leading Candidate</div>
							<div class='stat-number' style='font-size:1.1rem;'>${results.winner || 'TBD'}</div>
						</div>
						<div class='stat-box'>
							<div class='stat-label'>Leading Party</div>
							<div class='stat-number' style='font-size:1.1rem;'>${results.partyWinner || 'TBD'}</div>
						</div>
					</div>
				</div>

				<div class='card-section'>
					<div class='section-title'>🏆 Party Results</div>
					<ul class='list'>
						${Object.keys(results.partyVotes).length ? Object.entries(results.partyVotes).sort((a,b)=>b[1]-a[1]).map(([p,v])=>`<li>${p} <span class='badge'>${v} votes</span></li>`).join('') : '<li>No votes yet</li>'}
					</ul>
				</div>

				<div class='card-section'>
					<div class='section-title'>🎯 Candidate Results by Party</div>
					${generateCandidateStatsByParty(voters, results.candidateVotes)}
				</div>

				<div class='card-section'>
					<div class='section-title'>📋 Recent Voters</div>
					<ul class='list' style='max-height:200px;overflow-y:auto;'>
						${voters.length ? voters.map(v=>`<li>${v.username} → ${v.candidate} <span style='color:var(--text-tertiary);'>(${v.party})</span></li>`).join('') : '<li>No votes yet</li>'}
					</ul>
				</div>
			</div>

			<!-- Voters Tab -->
			<div id='voters' class='tab-content ${adminActiveTab === 'voters' ? 'active' : ''}'>
				<div class='card-section'>
					<div class='section-title'>Voters & Credentials</div>
					<ul class='list' style='max-height:300px;overflow-y:auto;'>
						${voters.length ? voters.map(v=>`<li>${v.username} — <strong>candidate:</strong> ${v.candidate} <span style='color:var(--text-tertiary);'>(${v.party})</span> — <strong>password:</strong> ${(users.find(u=>u.username===v.username) ? users.find(u=>u.username===v.username).password : '—')}</li>`).join('') : '<li>No votes yet</li>'}
					</ul>
				</div>
			</div>

			<a href='#' class='logout-link' id='logout' style='margin-top:1.5rem;'>Logout</a>
		</div>
	`;	updateThemeButton();

	// Event listeners
	window.deleteParty = (name) => {
		if (confirm(`Delete party "${name}" and all its candidates?`)) {
			fetch(backendUrl + '/parties/' + encodeURIComponent(name), {method:'DELETE'}).then(()=>renderAdminPanel());
		}
	};

	window.deleteCandidate = (name) => {
		if (confirm(`Delete candidate "${name}"?`)) {
			fetch(backendUrl + '/candidates/' + encodeURIComponent(name), {method:'DELETE'}).then(()=>renderAdminPanel());
		}
	};

	window.deleteUser = (username) => {
		if (confirm(`Delete user "${username}"?`)) {
			fetch(backendUrl + '/users/' + encodeURIComponent(username), {method:'DELETE'}).then(()=>renderAdminPanel());
		}
	};

	window.switchAdminTab = (tab, el) => {
		adminActiveTab = tab;
		document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
		document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
		if (el && el.classList) el.classList.add('active');
		document.getElementById(tab).classList.add('active');
	};

	document.getElementById('startSessionBtn').onclick = () => {
		fetch(backendUrl + '/session', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:true})}).then(()=>renderAdminPanel());
	};
	document.getElementById('endSessionBtn').onclick = () => {
		fetch(backendUrl + '/session', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:false})}).then(()=>renderAdminPanel());
	};
	document.getElementById('addPartyForm').onsubmit = (e) => {
		e.preventDefault();
		const name = document.getElementById('partyName').value;
		fetch(backendUrl + '/parties', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}).then(()=>renderAdminPanel());
	};
	document.getElementById('addCandidateForm').onsubmit = (e) => {
		e.preventDefault();
		const name = document.getElementById('candidateName').value;
		const party = document.getElementById('candidateParty').value;
		fetch(backendUrl + '/candidates', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,party})}).then(()=>renderAdminPanel());
	};
	document.getElementById('addUserForm').onsubmit = (e) => {
		e.preventDefault();
		const username = document.getElementById('newUsername').value;
		const password = document.getElementById('newPassword').value;
		const role = document.getElementById('userRole').value;
		fetch(backendUrl + '/users', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,role})}).then(r=>r.json()).then(data=>{
			if(data.success) {
				document.getElementById('newUsername').value = '';
				document.getElementById('newPassword').value = '';
				renderAdminPanel();
			} else {
				alert(data.message || 'Failed to add user');
			}
		});
	};
	document.getElementById('resetBtn').onclick = () => {
		if (confirm('Reset all votes? This cannot be undone!')) {
			fetch(backendUrl + '/reset-votes', {method:'POST'}).then(()=>renderAdminPanel());
		}
	};
	document.getElementById('logout').onclick = () => { currentUser = null; currentRole = null; renderLogin(); };
}

function generateCandidateStatsByParty(voters, candidateVotes) {
	// Group candidates by party using voter data
	const partyGroups = {};
	
	voters.forEach(v => {
		if (v.party) {
			if (!partyGroups[v.party]) {
				partyGroups[v.party] = {};
			}
			partyGroups[v.party][v.candidate] = (partyGroups[v.party][v.candidate] || 0) + 1;
		}
	});

	// If no party data from voters, just show all candidates
	if (Object.keys(partyGroups).length === 0) {
		return '<ul class="list">' + 
			Object.entries(candidateVotes).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<li>${c} <span class='badge'>${v} votes</span></li>`).join('') +
		'</ul>';
	}

	// Build grouped display
	let html = '';
	Object.entries(partyGroups).sort((a,b)=>Object.values(b[1]).reduce((x,y)=>x+y,0)-Object.values(a[1]).reduce((x,y)=>x+y,0)).forEach(([party, candidates]) => {
		const partyTotal = Object.values(candidates).reduce((a,b)=>a+b,0);
		html += `<div style='margin-bottom:1.5rem;border:1px solid var(--card-border);padding:1rem;border-radius:0.5rem;background-color:var(--input-bg);'><strong style='font-size:1.1rem;'>${party}</strong> <span class='badge'>${partyTotal} total</span><ul class='list' style='margin-top:0.5rem;'>`;
		Object.entries(candidates).sort((a,b)=>b[1]-a[1]).forEach(([candidate, votes]) => {
			html += `<li>${candidate} <span class='badge'>${votes} votes</span></li>`;
		});
		html += `</ul></div>`;
	});
	return html || '<p>No voting data available</p>';
}

// Initial render
loadTheme();
renderLogin();
