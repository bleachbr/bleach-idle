// =======================================================================
// BLEACH: SOUL SURVIVOR - REGISTRO OFICIAL DE ASSETS E PERSONAGENS
// =======================================================================
// Este arquivo é atualizado automaticamente pelo gerador de sprites
// sempre que um novo personagem, monstro ou efeito FX é APROVADO.
// =======================================================================

export const PLAYABLE_CHARACTERS = {
  "ichigo_shikai": {
    "id": "ichigo_shikai",
    "name": "Ichigo Shikai",
    "category": "characters",
    "format": "walk8",
    "source": "arts/walk8/ichigo_shikai_sheet.png",
    "targetSize": 128,
    "worldScale": [
      2.2,
      2.2
    ],
    "fps": 10,
    "frameCount": 8,
    "directions": {
      "front": {
        "row": 0,
        "frames": 8,
        "file": "front.png"
      },
      "side_l": {
        "row": 1,
        "frames": 8,
        "file": "side_l.png"
      },
      "side": {
        "row": 2,
        "frames": 8,
        "file": "side.png"
      },
      "back": {
        "row": 3,
        "frames": 8,
        "file": "back.png"
      }
    },
    "diagnostics": {
      "renderedHeights": {
        "front": 107,
        "side_l": 107,
        "side": 107,
        "back": 107
      },
      "baselineY": 117,
      "maxHeightVariancePercent": 0.0
    },
    "fx": {
      "aura": "aura_shikai",
      "attack": "slash_combat",
      "skill": "skill_getsuga"
    }
  },
  "rukia": {
    "id": "rukia",
    "name": "Rukia",
    "category": "characters",
    "format": "walk8",
    "source": "arts/walk8/rukia_sheet.png",
    "targetSize": 128,
    "worldScale": [
      2.2,
      2.2
    ],
    "fps": 10,
    "frameCount": 8,
    "directions": {
      "front": {
        "row": 0,
        "frames": 8,
        "file": "front.png"
      },
      "side_l": {
        "row": 1,
        "frames": 8,
        "file": "side_l.png"
      },
      "side": {
        "row": 2,
        "frames": 8,
        "file": "side.png"
      },
      "back": {
        "row": 3,
        "frames": 8,
        "file": "back.png"
      }
    },
    "diagnostics": {
      "renderedHeights": {
        "front": 107,
        "side_l": 107,
        "side": 107,
        "back": 107
      },
      "baselineY": 117,
      "maxHeightVariancePercent": 0.0
    }
  }
};

export const MONSTERS_REGISTRY = {
  "fishbone": {
    "id": "fishbone",
    "name": "Fishbone",
    "category": "monsters",
    "format": "walk8",
    "source": "arts/walk8/fishbone_sheet.png",
    "targetSize": 128,
    "worldScale": [
      2.2,
      2.2
    ],
    "fps": 10,
    "frameCount": 8,
    "directions": {
      "front": {
        "row": 0,
        "frames": 8,
        "file": "front.png"
      },
      "side_l": {
        "row": 1,
        "frames": 8,
        "file": "side_l.png"
      },
      "side": {
        "row": 2,
        "frames": 8,
        "file": "side.png"
      },
      "back": {
        "row": 3,
        "frames": 8,
        "file": "back.png"
      }
    },
    "diagnostics": {
      "renderedHeights": {
        "front": 107,
        "side_l": 107,
        "side": 107,
        "back": 107
      },
      "baselineY": 117,
      "maxHeightVariancePercent": 0.0
    }
  },
  "menos_grande": {
    "id": "menos_grande",
    "name": "Menos Grande",
    "category": "monsters",
    "format": "walk8",
    "source": "arts/walk8/gillian_sheet.png",
    "targetSize": 128,
    "worldScale": [
      2.2,
      2.2
    ],
    "fps": 10,
    "frameCount": 8,
    "directions": {
      "front": {
        "row": 0,
        "frames": 8,
        "file": "front.png"
      },
      "side_l": {
        "row": 1,
        "frames": 8,
        "file": "side_l.png"
      },
      "side": {
        "row": 2,
        "frames": 8,
        "file": "side.png"
      },
      "back": {
        "row": 3,
        "frames": 8,
        "file": "back.png"
      }
    },
    "diagnostics": {
      "renderedHeights": {
        "front": 107,
        "side_l": 107,
        "side": 107,
        "back": 107
      },
      "baselineY": 117,
      "maxHeightVariancePercent": 0.0
    }
  }
};

export const FX_REGISTRY = {
  "aura_shikai": {
    "id": "aura_shikai",
    "name": "Aura Shikai",
    "category": "fx",
    "type": "aura",
    "source": "arts/64_fx_aura.png",
    "targetSize": 128,
    "frameCount": 4,
    "fps": 10,
    "blendMode": "additive",
    "worldScale": [
      2.6,
      2.6
    ]
  },
  "hit_byakurai": {
    "id": "hit_byakurai",
    "name": "Hit Byakurai",
    "category": "fx",
    "type": "combat",
    "source": "arts/codex/fx_kido_sheet.png",
    "targetSize": 128,
    "frameCount": 4,
    "fps": 10,
    "blendMode": "additive",
    "worldScale": [
      2.0,
      2.0
    ]
  },
  "hit_shakkaho": {
    "id": "hit_shakkaho",
    "name": "Hit Shakkaho",
    "category": "fx",
    "type": "combat",
    "source": "arts/codex/fx_kido_sheet.png",
    "targetSize": 128,
    "frameCount": 4,
    "fps": 10,
    "blendMode": "additive",
    "worldScale": [
      2.0,
      2.0
    ]
  },
  "skill_byakurai": {
    "id": "skill_byakurai",
    "name": "Skill Byakurai",
    "category": "fx",
    "type": "skill",
    "source": "arts/codex/fx_kido_sheet.png",
    "targetSize": 128,
    "frameCount": 4,
    "fps": 10,
    "blendMode": "additive",
    "worldScale": [
      2.0,
      2.0
    ]
  },
  "skill_getsuga": {
    "id": "skill_getsuga",
    "name": "Skill Getsuga",
    "category": "fx",
    "type": "skill",
    "source": "arts/63_fx_skills.png",
    "targetSize": 128,
    "frameCount": 4,
    "fps": 10,
    "blendMode": "additive",
    "worldScale": [
      2.0,
      2.0
    ]
  },
  "skill_shakkaho": {
    "id": "skill_shakkaho",
    "name": "Skill Shakkaho",
    "category": "fx",
    "type": "skill",
    "source": "arts/codex/fx_kido_sheet.png",
    "targetSize": 128,
    "frameCount": 4,
    "fps": 10,
    "blendMode": "additive",
    "worldScale": [
      2.0,
      2.0
    ]
  },
  "slash_combat": {
    "id": "slash_combat",
    "name": "Slash Combat",
    "category": "fx",
    "type": "combat",
    "source": "arts/62_fx_combat.png",
    "targetSize": 128,
    "frameCount": 4,
    "fps": 10,
    "blendMode": "additive",
    "worldScale": [
      2.0,
      2.0
    ]
  }
};
