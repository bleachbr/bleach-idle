// =======================================================================
// FORMA DO JOGADOR POR NÍVEL
// O Ichigo começa em shikai e libera o Bankai no nível 35 (docs/ROADMAP.md, frente 2).
// A forma é só o sprite: arsenal, atributos e escolha do menu continuam os do personagem.
// Sem Three.js: quem carrega o kit da forma é src/playerSprite.js.
// =======================================================================

export const BANKAI_LEVEL = 35;

const FORMS = {
  ichigo_shikai: [{ level: BANKAI_LEVEL, id: 'ichigo_bankai' }]
};

// Maior forma já liberada e com kit no repositório; sem kit, o personagem fica como está.
export function playerFormId(charId, level, hasKit) {
  const unlocked = (FORMS[charId] || []).filter((form) => level >= form.level && hasKit(form.id));
  return unlocked.length ? unlocked[unlocked.length - 1].id : charId;
}

// Todas as formas do personagem, para carregar as texturas antes de a troca acontecer.
export function playerFormIds(charId, hasKit) {
  return [charId, ...(FORMS[charId] || []).map((form) => form.id).filter(hasKit)];
}
