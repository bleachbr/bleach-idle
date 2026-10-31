# ADR 001: Arquitetura do Sistema de NPCs Interativos

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto |
| **Data** | 2026-10-31 |
| **Autor** | Time de Engenharia Bleach Idle |
| **Contexto Técnico** | Expansão de NPCs no Seireitei e futuros mapas |

---

## 1. Contexto e Problema

Atualmente, o motor de jogo do Bleach Idle possui suporte a apenas um tipo de entidade não jogável interativa no mapa: o objeto de tipo `loja` (`shared/src/map.ts`), que carrega hardcoded o sprite `npc_shop` e abre diretamente o menu de compras e mercado do Kisuke Urahara (`onClick` em `client/src/GameScene.ts`, que envia `interact` com `kind: "shop"`).

Para viabilizar a presença de **capitães, tenentes, guardas e cronistas no Seireitei**, precisamos de uma arquitetura flexível que permita:
1. Declarar múltiplos NPCs por mapa com identidade visual própria (nomes, títulos e spritesheets diferentes).
2. Definir falas estáticas e dinâmicas (diálogos que reagem a eventos da semana ou nível do jogador).
3. Manter a integridade da matriz de colisão (`solid: Uint8Array`) para que jogadores não fiquem presos dentro dos NPCs.
4. Preservar compatibilidade total com os mapas exportados pelo Tiled (`.tmj`).

---

## 2. Decisão Arquitetural

Adotaremos um modelo **híbrido declarativo e orientado a dados** em `shared/`:

### 2.1. Estrutura de Dados (`shared/src/npcs.ts`)
Criaremos o catálogo canônico de NPCs:
```typescript
export interface NpcDialogOption {
  label: string;
  action: "next" | "quest_accept" | "quest_claim" | "close";
  nextDialogId?: string;
}

export interface NpcDialogNode {
  id: string;
  text: string;
  options: NpcDialogOption[];
}

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  sprite: string;
  solid?: boolean;
  defaultDialog: NpcDialogNode;
  /** Diálogo especial da crônica semanal quando aplicável */
  chronicleDialog?: (chronicleId: string, playerProgress: unknown) => NpcDialogNode;
}
```

### 2.2. Integração com Mapas (`shared/src/map.ts`)
- **A posição de cada NPC vem do `.tmj`** (objeto `npc` na camada `logica`, com a propriedade `id`), a mesma fonte única dos demais objetos do mapa (AGENTS.md §1.3). O catálogo `NpcDef` guarda só identidade e diálogo.
- O tipo `GameMap` receberá um campo opcional `npcs: { id: string; x: number; y: number }[]`.
- Em tempo de carregamento (`parseMap`), o servidor e o cliente juntam cada posição ao `NpcDef` de mesmo `id`; um `id` sem catálogo é erro de carga.
- Tiles ocupados por NPCs com `solid: true` marcarão o bit de colisão na matriz `solid[y * w + x] = 1`.

### 2.3. Desacoplamento da Lógica de Negócio
- O cliente (`GameScene.ts`) não armazena regras de diálogo; apenas desenha a janela com os dados recebidos do servidor.
- O servidor (`WorldRoom.ts`) avalia as condições do jogador (nível, progresso da missão semanal, distância física) e devolve o nó de diálogo apropriado.

---

## 3. Consequências

### Positivas:
- **Reusabilidade Extrema:** A mesma infraestrutura suportará os NPCs do Seireitei, futuros NPCs do Hueco Mundo (ex.: Neliel, Arrancars neutros) e instrutores de Karakura.
- **Segurança Total (Zero-Trust):** Nenhuma decisão sobre aceitar ou entregar missões depende de validações no navegador.
- **Facilidade de Teste:** Toda a árvore de diálogo e lógica de entrega de missões pode ser testada isoladamente em testes unitários rápidos do Vitest sem depender de canvas ou WebGL.

### Negativas / Mitigações:
- *Carga de rede adicional:* Mitigado pelo envio apenas do nó de diálogo ativo (`NpcDialogNode`), e não de toda a árvore de uma vez.
