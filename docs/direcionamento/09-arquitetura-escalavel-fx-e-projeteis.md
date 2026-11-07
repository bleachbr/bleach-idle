# 09 - Arquitetura Escalável de FX: Auras Periódicas, Projéteis e Divisão de Responsabilidades

Este documento responde às diretrizes fundamentais levantadas sobre **como estruturar efeitos visuais (FX) de forma escalável para centenas ou milhares de personagens**, definindo a separação de responsabilidades entre os **Geradores** e o **Sistema de Jogo**.

---

## 1. O Problema Identificado no Protótipo

1. **Aura Estática Contínua**: Uma aura ligada 100% do tempo sem intervalos polui a tela e perde o impacto dramático do anime (o *Reiatsu* em Bleach surge em surtos, pulsa com intensidade e se dissipa).
2. **Efeito Preso no Personagem**: Um projétil cortante (como o *Getsuga Tenshō*) não pode ser uma malha fixa colada no corpo do jogador; ele precisa nascer na ponta da lâmina, **viajar velozmente pelo mapa**, expandir de escala, perfurar inimigos em linha e dissipar suavemente na distância máxima.
3. **Escalabilidade de Configurações**: Se cada personagem tiver durações, velocidades e intervalos diferentes, como estruturar isso no `src/` sem duplicar código nem poluir o gerador?

---

## 2. Divisão Clara de Responsabilidades

```
+-------------------------------------------------------------------------------+
|                    GERADOR DE SPRITES (sprite_processor.py)                   |
|  Responsabilidade: Processamento Gráfico Estático                             |
|  - Remoção de fundo magenta (#FF00FF) e Despill nas bordas                    |
|  - Fatiamento em 4 quadros (0 a 3) e montagem de atlas horizontal             |
|  - Normalização da caixa delimitadora do sprite individual                    |
|  - Metadados intrínsecos da imagem: frameCount, fps nativo, blendMode         |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                      SISTEMA DE FX NO JOGO (src/fx/)                          |
|  Responsabilidade: FÍSICA, COMPORTAMENTO E DINÂMICA NO MUNDO 3D               |
|  - Trajetória: Avanço no mapa com velocidade linear (18 m/s)                  |
|  - Ciclo de Vida: Intervalos de pulsação (surge por 1.5s a cada 4.2s)         |
|  - Crescimento Visual: Expansão da onda de choque (2.0x -> 3.8x)              |
|  - Mecânica de Dano: Raio de impacto (2.2m) e perfuração (pierce)             |
|  - Dissipação: Fade out suave antes de atingir a distância limite (32m)       |
+-------------------------------------------------------------------------------+
```

---

## 3. Estrutura de Arquivos Escalável em `src/`

Para suportar milhares de personagens e variações visuais sem retrabalho, desacoplamos em 3 camadas:

```
src/
├── assets/
│   └── fx/
│       ├── aura_shikai/       <-- Texturas brutas da Aura Azul (frame_0..3.png, atlas.png)
│       ├── slash_combat/      <-- Texturas brutas do Corte de Lâmina
│       └── skill_getsuga/     <-- Texturas brutas do Getsuga Tenshō
│
├── fx/
│   ├── fxConfig.js            <-- Presets comportamentais reutilizáveis
│   └── fxManager.js           <-- Gerenciador de física, pooling e renderização WebGL
│
└── characters.js              <-- Vínculo declarativo: cada personagem escolhe seus presets
```

### Exemplo de Preset Comportamental ([src/fx/fxConfig.js](file:///Users/wjunior/projetos/outros/cursos-online-treinamento/v4/bleachbr/src/fx/fxConfig.js))
```javascript
export const FX_BEHAVIORS = {
  // Preset de Aura em Surtos Periódicos
  aura_shikai: {
    type: 'attached_burst',
    pulseInterval: 4.2,   // Surge a cada 4.2 segundos
    burstDuration: 1.5,   // Permanece visível por 1.5 segundos
    fadeInDuration: 0.25, // Entrada suave de 250ms
    fadeOutDuration: 0.50,// Dissipação suave de 500ms
    minScale: 2.3,
    maxScale: 2.9,
    maxOpacity: 0.85
  },

  // Preset de Projétil que Percorre o Mapa
  skill_getsuga: {
    type: 'traveling_projectile',
    speed: 18.5,          // Velocidade no mapa (18.5 unidades/s)
    maxDistance: 32.0,    // Distância percorrida até a dissipação
    hitRadius: 2.2,       // Raio de colisão com monstros
    pierce: true,         // Atravessa múltiplos Hollows em linha reta
    startScale: 2.0,      // Começa compacto na saída da lâmina
    endScale: 3.8,        // Cresce conforme rasga o ar
    fadeOutDist: 6.0      // Atenuação nos últimos 6 metros
  }
};
```

### Vínculo no Personagem ([src/characters.js](file:///Users/wjunior/projetos/outros/cursos-online-treinamento/v4/bleachbr/src/characters.js))
Se você criar um personagem novo (ex: *Byakuya*, *Renji*, *Rukia*), basta apontar quais presets comportamentais ele utiliza e customizar os parâmetros desejados:
```javascript
"ichigo_shikai": {
  "id": "ichigo_shikai",
  "name": "Ichigo Shikai",
  "fx": {
    "aura": "aura_shikai",
    "attack": "slash_combat",
    "skill": "skill_getsuga"
  }
}
```

---

## 4. O Funcionamento do Getsuga Tenshō no Mapa

O `FXManager` gerencia o projétil no ciclo de atualização da cena (`updateProjectiles`):

1. **Spawn**: No instante em que a arma dispara, uma instância de projétil é criada em `player.x, player.z` orientada pelo vetor `player.dirX, player.dirZ`.
2. **Deslocamento Contínuo**: A cada quadro $dt$:
   $$x \mathrel{+}= \text{dirX} \times (\text{speed} \times dt)$$
   $$z \mathrel{+}= \text{dirZ} \times (\text{speed} \times dt)$$
3. **Crescimento Dinâmico**: A escala cresce proporcionalmente à distância percorrida:
   $$\text{scale} = \text{startScale} + \left(\frac{\text{dist}}{\text{maxDistance}}\right) \times (\text{endScale} - \text{startScale})$$
4. **Dano em Área e Perfuração**: Qualquer Hollow que encostar no raio de $2.2\text{m}$ recebe dano imediato, sendo registrado em um `Set` para não receber dano duplo no mesmo disparo.
5. **Dissipação e Despawn**: Nos últimos $6\text{m}$ do trajeto ou ao atingir a barreira de Karakura ($74\text{m}$), a opacidade decai suavemente até 0 e a malha é liberada da memória.

---

## 5. Roteiro de Refatoração para a Versão Final

1. **Object Pool Pré-Alocado**: Criar um pool fixo de 64 malhas de projéteis para evitar *garbage collection* durante combates intensos com centenas de disparos.
2. **Trilhas no Solo (Decals / Terrain Scorching)**: O Getsuga Tenshō pode deixar uma marca de corte escura/rachada no chão da arena durante sua passagem.
3. **Áudio Espacial Posicional**: Efeito sonoro do vento cortante se propagando da origem até o ponto de impacto.
