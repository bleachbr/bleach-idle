// =======================================================================
// ELENCO JOGÁVEL: quem pode ser escolhido no menu e como aparece no HUD
// Só entra na escolha quem já tem o kit de animações em src/assets/characters/<id>/anims.
// =======================================================================

const KIT_MANIFESTS = import.meta.glob('./assets/characters/*/anims/manifest.json');
const WITH_KIT = new Set(Object.keys(KIT_MANIFESTS).map((path) => path.split('/')[3]));

export const DEFAULT_CHARACTER = 'ichigo_shikai';

const CAST = [
  { id: 'ichigo_shikai', name: 'Ichigo Kurosaki', stage: 'Shikai Ativa', avatar: '🗡️', style: 'Espada gigante e Getsuga' },
  { id: 'ishida', name: 'Uryū Ishida', stage: 'Quincy', avatar: '🏹', style: 'Arco espiritual e lâmina' },
  { id: 'sado', name: 'Yasutora Sado', stage: 'Braços Blindados', avatar: '👊', style: 'Socos de longo alcance' },
  { id: 'grimmjow', name: 'Grimmjow Jaegerjaquez', stage: 'Sexta Espada', avatar: '🐆', style: 'Katana, garras e Cero' }
];

export function listPlayableCharacters() {
  return CAST.filter((c) => WITH_KIT.has(c.id));
}

export function getPlayableCharacter(id) {
  return listPlayableCharacters().find((c) => c.id === id) || CAST[0];
}
