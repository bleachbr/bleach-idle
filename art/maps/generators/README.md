# Esteira de IA Generativa de Mapas 2.5D (Tarefa JH-04)

Este módulo implementa a esteira automatizada de geração e montagem de mapas 2.5D (estilo *Pokémon Omega Ruby / Alpha Sapphire*) para o Bleach Idle, com suporte a LLM (Gemini) e blueprints canônicos determinísticos.

---

## 1. Arquitetura da Esteira

```
  +-------------------------------------------------------------+
  | 1. IA Arquiteta (ai_blueprint.py)                           |
  |    - Prompt Estruturado para LLM (Gemini REST API)          |
  |    - Fallback Canônico: Karakura Expandida & Junrinan       |
  |    - Modelo Semântico: rios, pontes, relevo, baús, spawns   |
  +------------------------------+------------------------------+
                                 |
                                 v
  +-------------------------------------------------------------+
  | 2. Autotiler & Construção 2.5D (autotiler.py)               |
  |    - Bitmask Autotiling (4-bit & 8-bit Wang tiles)          |
  |    - Margens suaves de água com rios navegáveis             |
  |    - Desníveis de terreno (cliffs com relevo sombreado)     |
  |    - Escadas transitáveis (walkable = 0)                    |
  +------------------------------+------------------------------+
                                 |
                                 v
  +-------------------------------------------------------------+
  | 3. Posicionador de Props com Y-Sorting (autotiler.py)        |
  |    - Construções, postes, cerejeiras (sakura) e árvores     |
  |    - Base sólida com copa transitável                       |
  |    - Y-sorting estrito: sortY == y                          |
  |    - Baús interativos com alcance transitável garantido     |
  +------------------------------+------------------------------+
                                 |
                                 v
  +-------------------------------------------------------------+
  | 4. Compilação e Exportação                                  |
  |    - Mapa Tiled compatível (.tmj)                           |
  |    - Imagem contínua do terreno (ground PNG/WebP)           |
  |    - Metadados de cena para o cliente (worldSceneData.json) |
  +-------------------------------------------------------------+
```

---

## 2. Estrutura de Arquivos

| Arquivo | Descrição |
| :--- | :--- |
| `ai_blueprint.py` | Modelo de dados semântico (`MapBlueprint`, `RiverPath`, `Bridge`, `Chest`, `ElevationCliff`) e gerador com prompt estruturado para o Gemini. |
| `autotiler.py` | Algoritmo de bitmask autotiling de rios, desníveis 2.5D, posicionamento de props, ordenação de profundidade (Y-sorting) e exportação Tiled. |
| `generate_maps.py` | CLI para compilação rápida de mapas em formato Tiled, textura e JSON de cena. |
| `validator.py` | Validador e auditor autônomo de conectividade (BFS/A*), qualidade visual (paleta/magenta/nulos), Y-sorting e emissão de parecer. |
| `test_map_gen.py` | Suite com 15 testes unitários e de integração cobrindo a geração da esteira. |
| `test_validator.py` | Suite com 13 testes unitários e de integração cobrindo todas as regras de auditoria e detecção de anomalias. |
| `reports/audit_report.md` | Relatório consolidado em Markdown com nota de qualidade (0 a 10) e selo de aprovação para deploy. |

---

## 3. Instruções de Uso

### 3.1. Executando os Testes
Para rodar a suite completa de geração e validação:
```bash
python art/maps/generators/test_map_gen.py
python art/maps/generators/test_validator.py
```

### 3.2. Executando a Auditoria Autônoma de Qualidade
Para auditar os mapas gerados e gerar o relatório com selo de deploy:
```bash
python art/maps/generators/validator.py --maps karakura rukongai --report art/maps/generators/reports/audit_report.md
```

### 3.3. Gerando Mapas via CLI
Para gerar os ativos de Karakura Expandida:
```bash
python art/maps/generators/generate_maps.py --biome karakura --out ./generated
```

Para gerar os ativos de Rukongai Distrito 1 (Junrinan):
```bash
python art/maps/generators/generate_maps.py --biome rukongai --out ./generated
```

Para habilitar a geração assistida pelo Gemini (requer variável de ambiente `GEMINI_API_KEY`):
```bash
export GEMINI_API_KEY="sua_chave_aqui"
python art/maps/generators/generate_maps.py --biome karakura --ai --out ./generated
```
*(Caso a chave não seja informada ou ocorra erro de rede, o gerador aciona o fallback canônico determinístico com 100% de integridade).*

---

## 4. Conformidade com as Regras do Bleach Idle

1. **Escala de Células de 32x32 px:** Dimensões baseadas em tiles de 32 px, mantendo a proporção correta com os atores do jogo.
2. **Y-Sorting pela Base:** Cada prop exportado possui `sortY == p.y` e `x` centrado, permitindo ao renderer do Phaser ordenar atores à frente ou atrás de construções e árvores de forma natural.
3. **Travessia de Rios Garantida:** As células de água profunda recebem colisão sólida (`solid = 1`), enquanto as pontes (`Bridge`) têm colisão liberada (`solid = 0`), viabilizando a navegação sem bloqueios.
4. **Baús de Tesouro (`chest`):** Baús possuem `interact_kind = "chest"`, `loot_tier` e pelo menos uma célula vizinha livre e caminhável para garantir interação fluida do jogador.
