# PRD: Moderação de Chat, Anti-Spam e Comandos de GM (M3-05)

| Metadado | Detalhe |
| :--- | :--- |
| **Feature** | Moderação de Chat (Filtro de Spam, Silenciamento Persistente e Comandos de GM) |
| **Status** | Aceito (31/10/2026 — Waldir) |
| **Alvo** | Milestone 3 (`M3-05` — Portão G2 "Abrir ao público") |

---

## 1. Contexto e Problema

Antes de abrir o servidor ao público (Portão G2), o chat global, privado (`/pm`), de party (`/p`) e de guilda (`/g`) precisa de proteção contra:
1. **Flood e repetição:** envio em rajada de mensagens no chat (abaixo do limite global de 40 pacotes/s de rede, mas alto demais para leitura humana) e repetição contínua do mesmo texto.
2. **Abuso e toxicidade:** necessidade de silenciar (`mute`) personagens infratores com persistência em banco de dados (para que reconectar ou reiniciar o servidor não limpe a punição).
3. **Operação ao vivo (GM):** comandos administrativos seguros restritos a operadores autorizados (`GM_CHARS`) para silenciar, remover silenciamento e emitir avisos globais.

---

## 2. Requisitos Funcionais

- **RF01 (Sanitização):** Remover caracteres de controle ASCII/Unicode (`\u0000-\u001F`, `\u007F-\u009F`) antes de processar ou retransmitir qualquer mensagem de chat.
- **RF02 (Anti-Flood e Anti-Repetição):**
  - Limitar cada personagem a no máximo **5 mensagens de chat a cada 10 segundos**.
  - Bloquear a **3ª mensagem idêntica consecutiva** enviada dentro de 30 segundos.
  - Caso o jogador viole o filtro de spam **3 vezes na mesma janela**, aplicar silenciamento automático de **60 segundos**.
- **RF03 (Silenciamento Persistente):**
  - Personagens silenciados não podem enviar mensagens no chat global, `/pm`, `/p` nem `/g` até o término do prazo (`until`), recebendo aviso no log com o tempo restante e o motivo.
  - Os silenciamentos ativos são persistidos na tabela `meta` do SQLite (`key = "chat_mutes"`) com cache O(1) em memória.
- **RF04 (Comandos de GM):**
  - Apenas personagens listados na variável de ambiente `GM_CHARS` (separados por vírgula, case-insensitive; vazio por padrão) podem executar:
    - `/silenciar <nome> [minutos] [motivo]` (alias `/mute`): aplica silenciamento de 1 a 10.080 minutos (padrão: 15 min) em personagem existente (online ou offline).
    - `/dessilenciar <nome>` (alias `/unmute`): remove o silenciamento do personagem.
    - `/anuncio <texto>`: envia comunicado global do servidor no chat e no banner de eventos.
