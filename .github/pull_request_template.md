## O que muda e por quê

<!-- Uma ou duas frases. -->

**ID do roadmap:** <!-- ex.: F-04, M1-02 (veja docs/roadmap.md) -->

## Como verificar

<!-- Comandos que você rodou e o resultado. Não escreva "os testes passam" sem ter rodado. -->

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] Cenários afetados (`cd server && npx tsx scripts/test.ts <cenário>`) ou a bateria completa (`npm run test:scripts`)
- [ ] `gitleaks git --redact -c .gitleaks.toml .`

## Revisão adversarial

- [ ] Feita por quem não escreveu o código (pessoa, ou sessão nova de agente com a skill `revisar-pr`)

**Veredito e achados tratados:**

## Checklist

- [ ] Toda entrada vinda do cliente é validada no servidor (skill `seguranca-servidor`)
- [ ] Save antigo continua carregando (`fromSave`)
- [ ] `docs/roadmap.md` atualizado (status do item); `aprendizados.md` e `pendencias.md` quando couber
- [ ] Sem segredos, sem `.sqlite`, sem arquivos gerados
- [ ] Mapas editados no Tiled não foram regenerados por `build_maps.py`

## Riscos e o que ficou de fora
