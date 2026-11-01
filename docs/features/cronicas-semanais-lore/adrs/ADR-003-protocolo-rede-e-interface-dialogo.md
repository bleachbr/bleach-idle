# ADR 003: Protocolo de Rede Colyseus e Interface de Diálogo no Cliente

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Falta a aprovação das duas pessoas para "Aceito" (pontos do PRD §8 decididos em 31/10/2026) |
| **Data** | 2026-10-31 |
| **Autor** | Time de Engenharia Bleach Idle |
| **Contexto Técnico** | Protocolo cliente-servidor Colyseus e renderização de diálogos |

---

## 1. Contexto e Problema

Para permitir que o jogador converse com os NPCs do Seireitei e participe das Crônicas Semanais, precisamos de uma comunicação cliente-servidor padronizada que:
1. Respeite o modelo **zero-trust** (validação de proximidade, elegibilidade de missão e estado do jogador exclusivamente no servidor).
2. Forneça uma interface de usuário rica (pixel art, retrato do NPC, opções de resposta) sem comprometer o loop de renderização a 60 FPS do Phaser 3.
3. Seja responsiva e intuitiva tanto em computadores (teclado/mouse) quanto em dispositivos móveis (telas de toque / PWA).

---

## 2. Decisão Arquitetural

### 2.1. Protocolo de Mensagens de Rede (Colyseus)

Definiremos 3 mensagens principais:

1. **`interact` (Cliente → Servidor):**
   - Payload: `{ kind: "npc", id: string }`
   - O servidor verifica se o jogador está vivo e a uma distância `<= INTERACT_RANGE` (2 tiles); "congelado" só entra com os status de M2. Valida o `id` com `Object.hasOwn` no catálogo. Se estiver mais longe, calcula o caminho (busca em largura) até o NPC e abre o diálogo na chegada.

2. **`npc_dialog` (Servidor → Cliente):**
   - Payload:
   ```typescript
   export interface NpcDialogPayload {
     npcId: string;
     npcName: string;
     npcTitle: string;
     sprite: string;
     badge?: string; // ex: "[CRÔNICA SEMANAL: A INVASÃO DOS RYOKA]"
     text: string;
     options: {
       label: string;
       // só para exibição (ícone e estilo do botão): o cliente devolve apenas o índice da opção
       action: "next" | "quest_accept" | "quest_claim" | "close";
     }[];
   }
   ```

3. **`npc_action` (Cliente → Servidor):**
   - Payload: `{ npcId: string, option: number }`, onde `option` é o **índice** da opção do nó atual.
   - O servidor guarda o nó atual de cada jogador, aceita só índices inteiros dentro do nó e deriva a ação (`next`, `quest_accept`, `quest_claim`, `close`) do catálogo. O cliente nunca escolhe o próximo nó nem a ação, para não pular etapas (por exemplo, ir direto a `quest_claim`).

---

### 2.2. Renderização no Cliente (DOM Overlay vs Canvas)

Seguindo o padrão de design adotado no projeto (`client/src/inventory.ts`, `theme.css` e `style.css`), **reaproveitaremos a camada de DOM `#modal`** existente:
- **Performance:** Renderizar caixas de texto com quebra de linha dinâmica, scroll e fontes personalizadas (`Pixelify Sans`) via HTML/CSS nativo evita sobrecarregar o renderer do Phaser 3.
- **Identidade Visual:** Aplicação direta do tema pixel art (`#modal`, molduras com `border-image: url(/assets/ui/panel.png)` e botões `.primary` vermelhos e pretos).
- **Acessibilidade & Mobile:** Suporte nativo a toque, scroll suave e atalhos de teclado (tecla `ESC` fecha a janela; tecla `Espaço` ou `Enter` avança o diálogo).

---

## 3. Consequências

### Positivas:
- **Consistência Total com a UI do Jogo:** O jogador já está familiarizado com o estilo do `#modal` (usado na Loja do Kisuke, Depot e Viagens).
- **Sem Sobrecarga no Canvas:** O canvas WebGL do Phaser continua focado exclusivamente na renderização do mapa, animações de combate e efeitos visuais.
- **Validação Segura no Servidor:** Tentativas de aceitar ou resgatar missões sem os pré-requisitos são barradas no `WorldRoom`, retornando feedback em log (`this.log(p, "...")`).

### Negativas / Mitigações:
- *Troca de foco no input:* Mitigado pelo controle já existente no cliente que desativa os atalhos de movimento e combate (WASD e teclas 1-6) enquanto um modal estiver aberto.
