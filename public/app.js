
const backendUrl = '/api';
let currentUser = null;
let currentRole = null;

function renderLogin() {
	document.getElementById('app').innerHTML = `
		<div class='glass-card'>
			<div class='title'>🗳️ Noble Voting System</div>
			<div class='subtitle'>Secure & Transparent Voting Platform</div>
			<form id='loginForm'>
				<input type='text' id='username' placeholder='Username' required>
				<input type='password' id='password' placeholder='Password' required>
				<button class='btn btn-primary' type='submit'>Sign In</button>
			</form>
			<div id='loginMsg'></div>
			<div class='admin-toggle' id='adminLogin'>Admin Login</div>
		</div>
	`;
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
	document.getElementById('adminLogin').onclick = () => {
		document.getElementById('username').value = 'admin';
		document.getElementById('password').value = 'admin';
	};
}

function renderDashboard() {
	document.getElementById('app').innerHTML = `
		<div class='glass-card'>
			<div class='title'>Welcome, ${currentUser}!</div>
			<div class='subtitle'>Noble Voting System Dashboard</div>
			<button class='btn btn-primary' id='startVotingBtn'>Cast Your Vote</button>
			<button class='btn' id='seePartiesBtn'>View Parties & Candidates</button>
			<button class='btn' id='resultsBtn'>Live Results</button>
			<button class='btn' id='aboutBtn'>About System</button>
			<a href='#' class='logout-link' id='logout'>Logout</a>
		</div>
	`;
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
					<div class='title'>⏸️ Voting Paused</div>
					<div class='subtitle'>Voting is currently not active</div>
					<button class='btn' onclick='window.location.reload()'>Back to Dashboard</button>
				</div>
			`;
			return;
		}
		fetch(backendUrl + '/parties-with-candidates').then(r=>r.json()).then(partiesData => {
			if (partiesData.length === 0 || partiesData.every(p => p.candidates.length === 0)) {
				document.getElementById('app').innerHTML = `
					<div class='glass-card'>
						<div class='title'>No Candidates</div>
						<div class='subtitle'>No candidates available yet</div>
						<button class='btn' onclick='window.location.reload()'>Back</button>
					</div>
				`;
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
					<div class='title'>Cast Your Vote</div>
					<div class='subtitle'>Select a candidate from any party below</div>
					${partiesHtml}
					<button class='btn btn-primary' id='submitVote' style='margin-top:1.5rem;' disabled>Submit Vote</button>
					<div id='voteMsg'></div>
					<button class='btn' id='backBtn' style='margin-top:1rem;'>Back</button>
				</div>
			`;
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
				<div class='title'>Parties & Candidates</div>
				<div class='subtitle'>Browse all participating parties</div>
				${partiesHtml}
				<button class='btn' id='backBtn'>Back</button>
			</div>
		`;
		document.getElementById('backBtn').onclick = renderDashboard;
	});
}

function renderResults() {
	fetch(backendUrl + '/results').then(r=>r.json()).then(results => {
		let candidatesList = Object.entries(results.candidateVotes).map(([c,v])=>`<li>${c} <span class='badge'>${v} votes</span></li>`).join('');
		let partiesList = Object.entries(results.partyVotes).map(([p,v])=>`<li>${p} <span class='badge'>${v} votes</span></li>`).join('');
		document.getElementById('app').innerHTML = `
			<div class='glass-card'>
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
					<div style='text-align:center;font-size:1.5rem;color:#fff;font-weight:700;'>${results.winner || 'TBD'}</div>
				</div>
				<div class='card-section'>
					<div class='section-title'>🏆 Leading Party</div>
					<div style='text-align:center;font-size:1.5rem;color:#fff;font-weight:700;'>${results.partyWinner || 'TBD'}</div>
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
		document.getElementById('backBtn').onclick = renderDashboard;
	});
}

function renderAbout() {
	document.getElementById('app').innerHTML = `
		<div class='glass-card'>
			<div class='title'>About Noble Voting System</div>
			<div class='subtitle'>Transparent Democratic Platform</div>
			<div class='card-section'>
				<p style='color:#fff;line-height:1.8;'>
					Noble Voting System is a modern, secure, and transparent digital voting platform designed for educational institutions and organizations. 
					Features include real-time results, secure authentication, party-based candidate organization, and a powerful admin dashboard.
				</p>
			</div>
			<button class='btn' id='backBtn'>Back</button>
		</div>
	`;
	document.getElementById('backBtn').onclick = renderDashboard;
}

function renderAdminPanel() {
	Promise.all([
		fetch(backendUrl + '/session').then(r=>r.json()),
		fetch(backendUrl + '/parties').then(r=>r.json()),
		fetch(backendUrl + '/candidates').then(r=>r.json()),
		fetch(backendUrl + '/voters').then(r=>r.json()),
		fetch(backendUrl + '/results').then(r=>r.json())
	]).then(([session, parties, candidates, voters, results]) => {
		let partiesHtml = parties.length ? parties.map(p=>`<li>${p.name} <button class='badge' onclick='deleteParty("${p.name}")'>Delete</button></li>`).join('') : '<li>No parties yet</li>';
		let candidatesHtml = candidates.length ? candidates.map(c=>`<li>${c.name} (${c.party}) <button class='badge' onclick='deleteCandidate("${c.name}")'>Delete</button></li>`).join('') : '<li>No candidates yet</li>';
		let votersHtml = voters.length ? voters.map(v=>`<li>${v.username} → ${v.candidate}</li>`).join('') : '<li>No votes yet</li>';
		
		document.getElementById('app').innerHTML = `
			<div class='glass-card' style='max-width:700px;'>
				<div class='title'>⚙️ Admin Control Center</div>
				<div class='subtitle'>Noble Voting System Administration</div>
				
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
					<div class='section-title'>Quick Actions</div>
					<form id='addPartyForm' style='margin-bottom:1rem;'>
						<input type='text' id='partyName' placeholder='Add New Party' required>
						<button class='btn' type='submit'>Add Party</button>
					</form>
					<form id='addCandidateForm'>
						<input type='text' id='candidateName' placeholder='Candidate Name' required>
						<input type='text' id='candidateParty' placeholder='Party Name' required>
						<button class='btn' type='submit'>Add Candidate</button>
					</form>
				</div>

				<div class='grid'>
					<div class='card-section'>
						<div class='section-title'>Parties (${parties.length})</div>
						<ul class='list'>${partiesHtml}</ul>
					</div>
					<div class='card-section'>
						<div class='section-title'>Candidates (${candidates.length})</div>
						<ul class='list'>${candidatesHtml}</ul>
					</div>
				</div>

				<div class='card-section'>
					<div class='section-title'>Recent Votes</div>
					<ul class='list'>${votersHtml}</ul>
				</div>

				<div class='card-section'>
					<div class='section-title'>Live Results</div>
					<div class='stats'>
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

				<button class='btn btn-danger' id='resetBtn' style='margin-top:1rem;'>Reset All Votes</button>
				<a href='#' class='logout-link' id='logout'>Logout</a>
			</div>
		`;

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
		document.getElementById('resetBtn').onclick = () => {
			if (confirm('Reset all votes? This cannot be undone!')) {
				fetch(backendUrl + '/reset-votes', {method:'POST'}).then(()=>renderAdminPanel());
			}
		};
		document.getElementById('logout').onclick = () => { currentUser = null; currentRole = null; renderLogin(); };
	});
}

// Initial render
renderLogin();
