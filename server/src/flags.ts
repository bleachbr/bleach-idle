// Chaves de ambiente que ligam recursos perigosos. Nascem desligadas: só o valor exato "1" liga.
// O contrário (ligar quando algo NÃO está definido, como "fora de produção") deixou o modo Dev
// aberto a qualquer jogador em quem iniciava o servidor sem NODE_ENV.

export const flagOn = (name: string, env: NodeJS.ProcessEnv = process.env): boolean => env[name] === "1";
