# Pendências e Débitos Técnicos Registrados

Este documento mapeia todas as pendências conhecidas, limitações da arquitetura atual e débitos técnicos acumulados no **Bleach Idle**.

---

## 1. Sistema de NPCs e Eventos Narrativos ⚠️ (Prioridade Atual)

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Suporte a Múltiplos NPCs no Mapa** | O mapa Tiled só reconhece o tipo `loja` com sprite único `npc_shop`. | Não é possível posicionar capitães, tenentes ou instrutores com visual e falas próprias no Seireitei ou outras cidades. |
| **Diálogos e Árvores de Conversa** | Ao interagir com a loja, abre diretamente o menu do Kisuke. | Falta um sistema de balões/janela de diálogo com opções de resposta, lore e ativação de eventos. |
| **Eventos Semanais da Lore de Bleach** | Apenas invasões de Hollows (a cada 3h) e Chefe Mundial (a cada 2h) estão programados. | Criar um gerenciador de rotação semanal que exiba eventos históricos (Invasão de Karakura, Traição no Soukyoku, Resgate de Rukia, etc.). |

---

## 2. Combate e Habilidades

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Efeitos de Controle de Grupo (CC)** | Apenas dano direto e dano em área (`area`) estão implementados na `main`. | Congelamento (*Freeze* da Rukia/Hitsugaya), Sangramento (*Bleed*) e Atordoamento (*Stun*) precisam ser integrados ao motor autoritativo. |
| **Visual de Equipamentos Restrito** | Apenas o Haori de Capitão e a Máscara Hollow alteram o sprite do personagem (e apenas em Ichigo, Rukia e Renji). | Novos equipamentos (Elmo de Osso, botas, itens de Quincy e Fullbringer) ainda não têm representação visual nos personagens. |
| **Tempo de Recarga Numérico na UI** | A barra de técnicas mostra indicação de recarga básica. | Adicionar contagem regressiva em segundos sobre o slot da habilidade no HUD para melhor legibilidade. |

---

## 3. Economia e Social

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Troca Direta (Trade 1v1)** | Toda negociação é mediada pelo Mercado do Kisuke (anúncio público, 5% de taxa, 7 dias de validade). | Jogadores lado a lado não conseguem trocar itens ou kan de forma direta e segura. |
| **Abas de Chat no Cliente** | Todas as mensagens (`Geral`, `/pm`, `/p`, `/g`, logs de sistema) aparecem em uma única janela de rolagem. | O chat fica poluído rapidamente em caçadas com party e eventos globais. Necessário criar abas dedicadas. |
| **Banco e Sede de Guilda** | Apenas kan pode ser doado para a guilda. | Permitir cofre de itens compartilhado com controle de acesso por cargo (Líder, Oficial, Membro). |
| **Moderação e Segurança no Chat** | A moderação se resume ao comando `/ignorar Nome`. | Falta filtro automático de spam, mute temporário e comandos de administração para Game Masters (GM). |

---

## 4. Contas e Infraestrutura de Servidor

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Recuperação de Senha por E-mail** | As contas possuem apenas `login` e `senha` criptografada com scrypt. | Se o jogador esquecer a senha, não há como recuperar o acesso sem intervenção manual no banco SQLite. |
| **Rate Limiter em Memória** | O bloqueio por tentativas excessivas de login reside na memória do processo Node.js. | Em caso de reinício do servidor ou clusterização com múltiplos workers, os limites de tentativas são zerados. |
| **Multi-servidores / Sharding** | Um único processo gerencia todo o mundo e todas as conexões. | Para suportar centenas de jogadores simultâneos sem aumento de latência no tick de 100ms, será necessário particionar salas por mapa (`karakura`, `soul`, `hueco`, etc.). |

---

## 5. Automação e Qualidade de Vida (QoL)

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Filtros Customizados de Loot** | O Auto Helper recolhe tudo e converte em kan via Auto Venda apenas o excedente. | Jogadores de nível alto gostariam de ignorar lixo de monstros fracos e pegar apenas itens raros ou consumíveis específicos. |
| **Interiores de Edifícios e Andares** | Os edifícios nos mapas são sólidos sem entrada ou interiores exploráveis. | Quartéis do Seireitei, loja do Kisuke e palácios poderiam ter mapas internos dedicados. |

---

## 6. Testes e Automação de CI

| Item | Situação Atual | Impacto / Necessidade |
| :--- | :--- | :--- |
| **Migração Completa para Vitest** | O projeto possui 76 testes rápidos no Vitest e 31 scripts de integração em `server/scripts/test.ts`. | Consolidar os 31 cenários legados no Vitest para unificar a execução em um único runner padronizado. |
| **Testes de Interface (Playwright)** | O cliente Phaser 3 não possui testes de regressão visual ou de cliques automatizados. | Implementar testes E2E com Playwright para validar a tela de login, menus e HUD. |
