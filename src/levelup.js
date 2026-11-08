// =======================================================================
// BLEACH: SOUL SURVIVOR - SISTEMA DE LEVEL-UP COM AUTO-SELECT EM 10s
// Escolha dinâmica de poderes e passivas com temporizador automático
// =======================================================================

const AVAILABLE_POWERS = [
  { key: 'getsuga', type: 'weapon', name: 'Getsuga Tenshō', icon: '🌙', desc: 'Rajada espiritual perfurante devastadora (180 Dano).' },
  { key: 'byakurai', type: 'weapon', name: 'Hadō #4 Byakurai', icon: '⚡', desc: 'Raio elétrico perfurante veloz em linha reta (45 Dano).' },
  { key: 'shakkaho', type: 'weapon', name: 'Hadō #31 Shakkahō', icon: '🔥', desc: 'Esfera ígnea de Reiatsu com explosão em área (70 Dano).' },
  { key: 'shunpo', type: 'passive', name: 'Especialista Shunpo', icon: '👟', desc: '+30% velocidade de movimento e pulo ágil.' },
  { key: 'reiatsu', type: 'passive', name: 'Pressão Espiritual', icon: '💎', desc: '+35% de dano espiritual em todos os ataques.' },
  { key: 'magnet', type: 'passive', name: 'Vórtice de Reishi', icon: '🧲', desc: '+80% de alcance para atrair Reishi caído.' }
];

export const LEVELUP_TIMEOUT_SECONDS = 10.0;
let levelUpOpen = false;
let currentOptions = [];
let autoTimerId = null;
let remainingSeconds = LEVELUP_TIMEOUT_SECONDS;
let onSelectCallback = null;
let onSkipCallback = null;

export function isLevelUpBannerOpen() {
  return levelUpOpen;
}

export function getCurrentBannerOptions() {
  return currentOptions;
}

function updateTimerDisplay(seconds) {
  const timerEl = document.getElementById('levelup-timer-badge');
  if (timerEl) {
    timerEl.textContent = `⏱️ Auto-escolha em ${Math.ceil(seconds)}s`;
  }
}

function stopAutoTimer() {
  if (autoTimerId) {
    clearInterval(autoTimerId);
    autoTimerId = null;
  }
}

function triggerAutoRandomSelection() {
  if (!levelUpOpen || currentOptions.length === 0) return;
  const randomIdx = Math.floor(Math.random() * currentOptions.length);
  stopAutoTimer();
  if (onSelectCallback) {
    onSelectCallback(randomIdx, currentOptions[randomIdx]);
  }
}

function startAutoTimer() {
  stopAutoTimer();
  remainingSeconds = 10.0;
  updateTimerDisplay(remainingSeconds);
  autoTimerId = setInterval(() => {
    remainingSeconds -= 0.5;
    updateTimerDisplay(remainingSeconds);
    if (remainingSeconds <= 0) {
      triggerAutoRandomSelection();
    }
  }, 500);
}

function createCardNode(opt, idx, onSelect) {
  const card = document.createElement('div');
  card.className = 'banner-card';
  const isWeapon = opt.type === 'weapon';
  const typeLabel = isWeapon ? 'Poder Ativo' : 'Passiva Ativa';
  const typeClass = isWeapon ? 'weapon' : 'passive';
  card.innerHTML = `
    <div class="banner-card-top">
      <span class="card-num-badge">[${idx + 1}]</span>
      <span class="card-type-tag ${typeClass}">${typeLabel}</span>
    </div>
    <div class="banner-card-body">
      <div class="banner-card-icon">${opt.icon}</div>
      <div>
        <div class="banner-card-title">${opt.name}</div>
        <div class="banner-card-desc">${opt.desc}</div>
        <div class="banner-card-subtag">⚠️ Substitui poder anterior</div>
      </div>
    </div>
  `;
  card.onclick = (e) => { e.stopPropagation(); onSelect(idx); };
  return card;
}

export function openLevelUpDialog({ onSelect, onSkip }) {
  levelUpOpen = true;
  onSelectCallback = onSelect;
  onSkipCallback = onSkip;
  const banner = document.getElementById('levelup-banner');
  const container = document.getElementById('banner-cards-container');
  if (!banner || !container) return;

  container.innerHTML = '';
  currentOptions = AVAILABLE_POWERS.slice().sort(() => 0.5 - Math.random()).slice(0, 3);
  currentOptions.forEach((opt, idx) => {
    container.appendChild(createCardNode(opt, idx, selectOptionIndex));
  });

  setupBannerHeaderAndSkip(onSkip);
  banner.classList.remove('hidden');
  startAutoTimer();
}

function setupBannerHeaderAndSkip(onSkip) {
  let timerBadge = document.getElementById('levelup-timer-badge');
  if (!timerBadge) {
    timerBadge = document.createElement('span');
    timerBadge.id = 'levelup-timer-badge';
    timerBadge.className = 'levelup-timer-badge';
    const header = document.querySelector('.banner-top-row') || document.querySelector('.levelup-banner-header');
    if (header) {
      const skipBtn = document.getElementById('btn-skip-levelup');
      if (skipBtn) header.insertBefore(timerBadge, skipBtn);
      else header.appendChild(timerBadge);
    }
  }
  const skipBtn = document.getElementById('btn-skip-levelup');
  if (skipBtn) {
    skipBtn.onclick = (e) => { e.stopPropagation(); stopAutoTimer(); closeLevelUpDialog(); onSkip(); };
  }
}

export function selectOptionIndex(index) {
  if (!levelUpOpen || !currentOptions[index]) return;
  const chosen = currentOptions[index];
  stopAutoTimer();
  closeLevelUpDialog();
  if (onSelectCallback) onSelectCallback(index, chosen);
}

export function handleLevelUpKeyInput(key) {
  if (!levelUpOpen) return false;
  if (key === '1' || key === '2' || key === '3') {
    selectOptionIndex(parseInt(key, 10) - 1);
    return true;
  }
  if (key === '0' || key === 'p') {
    stopAutoTimer();
    closeLevelUpDialog();
    if (onSkipCallback) onSkipCallback();
    return true;
  }
  return false;
}

export function closeLevelUpDialog() {
  levelUpOpen = false;
  stopAutoTimer();
  const banner = document.getElementById('levelup-banner');
  if (banner) banner.classList.add('hidden');
  currentOptions = [];
}
