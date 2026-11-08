// =======================================================================
// MÓDULO DO RANKING GLOBAL / HALL DA FAMA: BLEACH SOUL SURVIVOR
// Exibição e sincronização de maiores abates, tempo e dano no menu
// =======================================================================

const LOCAL_STORAGE_KEY = 'bleach_leaderboard_records';
let activeSort = 'kills';

export function formatSurvivalTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = String(Math.floor(s / 60)).padStart(2, '0');
  const secs = String(s % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export function formatDamage(damage) {
  return Math.round(damage || 0).toLocaleString('pt-BR');
}

export function getRankBadge(index) {
  if (index === 0) return '🥇 1º';
  if (index === 1) return '🥈 2º';
  if (index === 2) return '🥉 3º';
  return `${index + 1}º`;
}

function getInitialSeed() {
  return [
    { id: 's1', nickname: 'Kenpachi Zaraki', kills: 95, timeSeconds: 115, damageDealt: 51200, level: 11 },
    { id: 's2', nickname: 'Ichigo Kurosaki', kills: 84, timeSeconds: 138, damageDealt: 42500, level: 12 },
    { id: 's3', nickname: 'Kisuke Urahara', kills: 72, timeSeconds: 125, damageDealt: 38900, level: 10 },
    { id: 's4', nickname: 'Byakuya Kuchiki', kills: 65, timeSeconds: 130, damageDealt: 36400, level: 9 },
    { id: 's5', nickname: 'Rukia Kuchiki', kills: 48, timeSeconds: 105, damageDealt: 27800, level: 8 }
  ];
}

export function readLocalRecords() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return getInitialSeed();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getInitialSeed();
  } catch {
    return getInitialSeed();
  }
}

export function writeLocalRecord(newRecord) {
  try {
    const records = readLocalRecords();
    records.push(newRecord);
    const sorted = records.sort((a, b) => (b.kills || 0) - (a.kills || 0)).slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
    return sorted;
  } catch {
    return [];
  }
}

export function sortRecords(records, sortBy = 'kills') {
  return [...records].sort((a, b) => {
    if (sortBy === 'time') return (b.timeSeconds || 0) - (a.timeSeconds || 0);
    if (sortBy === 'damage') return (b.damageDealt || 0) - (a.damageDealt || 0);
    return (b.kills || 0) - (a.kills || 0);
  });
}

export async function fetchLeaderboard(sortBy = 'kills') {
  try {
    const res = await fetch(`/api/leaderboard?sort=${encodeURIComponent(sortBy)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.records)) return data.records;
    }
  } catch {
    // Falha de rede: usa cache local
  }
  return sortRecords(readLocalRecords(), sortBy);
}

export async function submitMatchScore(score) {
  const payload = {
    nickname: score.nickname || 'Shinigami',
    kills: score.kills || 0,
    timeSeconds: score.timeSeconds || 0,
    damageDealt: score.damageDealt || 0,
    level: score.level || 1,
    character: 'Ichigo (Shikai)'
  };
  writeLocalRecord(payload);
  try {
    await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch {
    // Falha de backend absorvida pelo fallback local
  }
}

function buildRecordRow(rec, idx, currentNick) {
  const badge = getRankBadge(idx);
  const isMe = currentNick && rec.nickname && rec.nickname.toLowerCase() === currentNick.toLowerCase();
  const highlightClass = isMe ? 'leaderboard-row-me' : '';
  const topClass = idx < 3 ? `rank-top-${idx + 1}` : '';
  return `
    <tr class="leaderboard-row ${highlightClass} ${topClass}">
      <td class="col-rank">${badge}</td>
      <td class="col-name"><span class="nick-text">${rec.nickname}</span> <span class="lvl-tag">Nv.${rec.level || 1}</span></td>
      <td class="col-kills">${rec.kills || 0}</td>
      <td class="col-time">${formatSurvivalTime(rec.timeSeconds)}</td>
      <td class="col-dmg">${formatDamage(rec.damageDealt)}</td>
    </tr>
  `;
}

export function renderLeaderboardTable(records, currentNick = '') {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;
  if (!records || records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">Nenhum registro encontrado.</td></tr>';
    return;
  }
  tbody.innerHTML = records.map((rec, idx) => buildRecordRow(rec, idx, currentNick)).join('');
}

export function updateTabStyles(activeTabId) {
  const tabs = document.querySelectorAll('.leaderboard-tab');
  tabs.forEach(tab => {
    if (tab.dataset.sort === activeTabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

export async function refreshLeaderboard(sortBy = activeSort) {
  activeSort = sortBy;
  updateTabStyles(sortBy);
  const inputEl = document.getElementById('player-nickname');
  const currentNick = inputEl ? inputEl.value.trim() : '';
  const records = await fetchLeaderboard(sortBy);
  renderLeaderboardTable(records, currentNick);
}

export function initLeaderboard() {
  const tabs = document.querySelectorAll('.leaderboard-tab');
  tabs.forEach(tab => {
    tab.onclick = () => {
      const sort = tab.dataset.sort || 'kills';
      refreshLeaderboard(sort);
    };
  });
  refreshLeaderboard(activeSort);
}
