// =======================================================================
// ESCOLHA DE PERSONAGEM NO MENU: retratos do elenco jogável acima do botão de jogar
// A escolha fica guardada no navegador e volta na próxima visita.
// =======================================================================
import { versionedAssetUrl } from './assetVersion.js';
import { DEFAULT_CHARACTER, getPlayableCharacter, listPlayableCharacters } from './playableCast.js';

const STORAGE_KEY = 'soulSurvivor.character';
let selectedId = readSavedCharacter();

function readSavedCharacter() {
  try {
    return getPlayableCharacter(localStorage.getItem(STORAGE_KEY) || DEFAULT_CHARACTER).id;
  } catch {
    return DEFAULT_CHARACTER;
  }
}

function saveCharacter(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Sem armazenamento, a escolha vale só nesta visita.
  }
}

export function getSelectedCharacter() {
  return selectedId;
}

function paintChip(char) {
  const chip = document.querySelector('.character-preview-chip');
  if (!chip) return;
  chip.querySelector('.chip-avatar').textContent = char.avatar;
  chip.querySelector('.chip-name').innerHTML = `${char.name} <span class="chip-stage">(${char.stage})</span>`;
  chip.querySelector('.chip-meta').innerHTML = `${char.style} · Bioma: <b>Hueco Mundo</b>`;
}

function portraitButton(char, onPick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cast-portrait';
  button.dataset.charId = char.id;
  button.title = `${char.name} (${char.stage})`;
  button.setAttribute('aria-label', `Jogar com ${char.name}`);
  const img = document.createElement('img');
  img.src = versionedAssetUrl(`/src/assets/characters/${char.id}/front.png`);
  img.alt = '';
  button.append(img);
  button.addEventListener('click', () => onPick(char.id));
  return button;
}

function markSelected(row) {
  for (const button of row.children) {
    button.setAttribute('aria-pressed', String(button.dataset.charId === selectedId));
  }
}

export function initCharacterSelect() {
  const chip = document.querySelector('.character-preview-chip');
  if (!chip) return;
  const row = document.createElement('div');
  row.className = 'cast-select-row';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', 'Escolha do personagem');
  const pick = (id) => {
    selectedId = id;
    saveCharacter(id);
    markSelected(row);
    paintChip(getPlayableCharacter(id));
  };
  for (const char of listPlayableCharacters()) row.append(portraitButton(char, pick));
  chip.before(row);
  pick(selectedId);
}

// HUD da partida: nome e ícone de quem está em campo.
export function showCharacterInHud(id) {
  const char = getPlayableCharacter(id);
  const title = document.getElementById('player-title');
  if (title) title.innerText = `${char.name} (${char.stage})`;
  const avatar = document.getElementById('avatar-box');
  if (avatar) avatar.innerText = char.avatar;
}
