# Diretriz 10: Mira Inteligente Auto-Battler e Balanceamento do Getsuga Tenshō

## 1. Contexto e Filosofia de Design (Estilo PokéBonk / Survivor)
Nos jogos de sobrevivência em ondas no estilo auto-battler (*PokéBonk*, *Vampire Survivors*, *Brotato*):
- O jogador foca **100% de sua atenção na esquiva, no posicionamento tático e na coleta de orbes de Reishi (XP)**.
- Os ataques e habilidades **disparam automaticamente**, mas **não podem ser aleatórios**. Um ataque lançado no vazio desengaja o jogador e torna o combate frustrante.
- Habilidades icônicas e devastadoras como o **Getsuga Tenshō** precisam transmitir sensação de poder avassalador (*one-shot* em monstros comuns e rasgo de horda).

---

## 2. A Inteligência de Mira (Smart Auto-Aiming)

### 2.1 Algoritmo de Projeção Linear para Habilidades Perfurantes (`findSmartTargetDirection`)
Diferente de projéteis teleguiados (*homing*), o Getsuga Tenshō é uma lâmina espiritual de linha reta que viaja até 32 metros e perfura múltiplos alvos.

Para maximizar o impacto a cada disparo:
1. **Identificação de Candidatos**:
   Todos os Hollows vivos em um raio de até 32 metros ao redor do Shinigami são filtrados.
2. **Prioridade 1 - Boss Menos Grande**:
   Se o Menos Grande (Gillian) estiver ativo no campo de visão, ele assume **prioridade máxima absoluta**, direcionando a rajada de energia diretamente contra o Titã.
3. **Prioridade 2 - Densidade Máxima de Perfuração (Line Pierce Density)**:
   Para cada Hollow candidato, é traçado um vetor hipotético de disparo $\vec{D} = (d_x, d_z)$.
   Testa-se quantos outros Hollows $\vec{P} = (p_x, p_z)$ caem dentro do feixe desse vetor:
   $$\text{dot} = p_x d_x + p_z d_z \quad (0 < \text{dot} \le 32)$$
   $$\text{dist}_{\perp} = |p_x (-d_z) + p_z d_x| \le \text{beamRadius} \; (2.4\text{m})$$
   A pontuação de cada ângulo é calculada por:
   $$\text{Score} = (\text{Hollows Alinhados} \times 150) - \text{Distância}$$
   O vetor com o maior score é selecionado como o ângulo de disparo do Getsuga.
4. **Fallback Suave**:
   Se não houver inimigos por perto, a habilidade é disparada na direção do movimento do jogador.

### 2.2 Auto-Mira em Combate Corpo a Corpo (`executeAsauchiSlash`)
O corte de espada curta (*Asauchi*) avalia um cone de 4.8 metros e **gira dinamicamente a lâmina para o monstro mais próximo**, garantindo que nenhum golpe do auto-ataque seja desferido no ar enquanto houver ameaças adjacentes.

---

## 3. Balanceamento de Dano: Getsuga Tenshō Destrutivo

| Entidade | Vida (HP) | Dano Antigo Getsuga (75) | Novo Dano Getsuga (180) | Resultado do Golpe |
| :--- | :--- | :--- | :--- | :--- |
| **Shrieker** | 30 HP | 1 hit (Matava) | **180** | **OHKO Instantâneo (Explosão)** |
| **Fishbone D** | 40 HP | 1 hit (Matava) | **180** | **OHKO Instantâneo (Explosão)** |
| **Acidwire** | 70 HP | 1 hit (Sobrevivia se com buff) | **180** | **OHKO Instantâneo (Sobrecarga de Reiatsu)** |
| **Menos Grande** | 2000 HP | 75 (arranhão ~3.7%) | **180** | **9.0% do HP do Boss arrancado de uma vez** |

---

## 4. Validação Automatizada (Playwright E2E)
O script de validação (`scratch/test_smart_targeting.py`) executou com sucesso os seguintes cenários no navegador WebGL:
1. **Cluster ao Oeste**: Com o jogador virado para o Leste (`dirX = 1`), 3 Hollows alinhados a Oeste foram detectados pelo algoritmo. O Getsuga foi disparado a `dirX = -0.999` (Oeste), eliminando instantaneamente os 3 Hollows e acumulando +540 de dano.
2. **Prioridade de Chefe**: Com múltiplos Hollows fracos ao Norte e o Menos Grande a Sudeste (`x = 14, z = 14`), o Getsuga mirou a `(dirX = 0.707, dirZ = 0.707)` diretamente no Menos Grande, reduzindo seu HP de 2000 para 1820.
