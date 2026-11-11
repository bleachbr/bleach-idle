// =======================================================================
// VERSÃO DO BUILD NAS URLS DE TEXTURA
// O nginx guarda /src/assets/ por 1 hora (infra/nginx.container.conf) e o nome do arquivo
// não muda quando um sprite é regenerado. Sem a versão na URL, quem jogou antes do deploy
// continua vendo a tira antiga até o cache vencer.
// =======================================================================

// O Vite troca __ASSET_VERSION__ por um valor novo a cada build (vite.config.js).
// Fora do Vite (testes no Node) o identificador não existe.
export const ASSET_VERSION = typeof __ASSET_VERSION__ !== 'undefined' ? __ASSET_VERSION__ : '';

const GAME_ASSETS = '/src/assets/';

export function versionedAssetUrl(url, version = ASSET_VERSION) {
  if (!version || typeof url !== 'string' || !url.startsWith(GAME_ASSETS)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
}
