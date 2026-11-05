# Preparação das fontes da renovação

Primeira etapa da publicação autorizada por Rafael em 04/11/2026: fontes, prompts, snapshots, ferramentas de montagem e capturas de validação da renovação dos sete mapas. A integração jogável segue no PR #338.

Esta etapa não altera arquivos públicos nem código de runtime do cliente/servidor. Inclui em commit separado a correção da fixture de Auto Venda que o CI revelou: drops não puros são ignorados nesse caso de teste, sem alterar a regra do jogo. As capturas documentam a integração já validada na branch de desenvolvimento, não uma mudança aplicada por este commit isolado. Os scripts de `scenes/` e seus catálogos pressupõem os arquivos de runtime do PR #338; não é necessário executá-los nesta etapa preparatória.

A separação mantém cada revisão dentro do limite de arquivos do CodeRabbit, sem excluir código da revisão ou alterar regras de aprovação. Os PNGs de fonte e os prompts continuam editáveis; o conjunto público de objetos separados será publicado junto com o renderer e os mapas Tiled.

O CI atingiu o limite de cinco minutos durante o fetch do histórico, antes de executar o gitleaks. O limite desse job passa a dez minutos, preservando o histórico completo, o comando e todas as regras da varredura.

Não execute o montador de atlas no diretório servido em produção. As validações antecipadas evitam publicação parcial por insumos inválidos, mas não tornam a escrita do conjunto transacional. Qualquer falha de disco ou interrupção durante a gravação exige uma nova execução completa antes de servir/publicar os arquivos; só use o conjunto depois de o comando terminar com sucesso e suas verificações passarem.
