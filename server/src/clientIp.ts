// IP do cliente para o limite de tentativas de login.
// Atrás de um proxy (o Caddy do docker-compose) a conexão chega sempre do IP do proxy: sem ler o cabeçalho, todos os
// jogadores dividiriam o mesmo balde. TRUST_PROXY lista, em CIDR separados por vírgula, quem é o proxy confiável
// (ex.: 172.28.0.0/24). Só quando a conexão vem de um deles vale o último item de X-Forwarded-For (o que o proxy
// acrescentou). Um cabeçalho que chega de qualquer outro endereço é ignorado, então ninguém escolhe o próprio IP.
// Quem decide quem é o proxy é o operador, não o código: inferir "endereço privado" erra atrás de NAT e em 100.64.0.0/10.
// Só vale um proxy na frente; com CDN e Caddy, o último item seria o da CDN.
import { BlockList, isIP } from "node:net";
import type { IncomingMessage } from "node:http";

const SEM_IP = "?";

/** Monta a lista de proxies confiáveis. CIDR inválido lança erro na partida, para o servidor não subir com a proteção desligada sem aviso. */
export function parseTrustedProxies(valor: string | undefined): BlockList | undefined {
  const itens = (valor ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!itens.length) return undefined;
  const lista = new BlockList();
  for (const item of itens) {
    const [rede, bits] = item.split("/");
    const familia = isIP(rede);
    if (!familia) throw new Error(`TRUST_PROXY: "${item}" não é um IP ou CIDR válido (ex.: 172.28.0.0/24)`);
    const tipo = familia === 4 ? "ipv4" : "ipv6";
    if (bits === undefined) lista.addAddress(rede, tipo);
    else lista.addSubnet(rede, Number(bits), tipo);
  }
  return lista;
}

/** Proxies confiáveis da configuração do servidor (lida uma vez, na partida). */
const TRUSTED = parseTrustedProxies(process.env.TRUST_PROXY);

const familiaDe = (ip: string) => (isIP(ip) === 6 ? "ipv6" : "ipv4");

export function clientIp(
  req: Pick<IncomingMessage, "headers" | "socket"> | undefined,
  proxies: BlockList | undefined = TRUSTED,
): string {
  const direct = req?.socket?.remoteAddress ?? SEM_IP;
  if (!proxies || !isIP(direct) || !proxies.check(direct, familiaDe(direct))) return direct;
  const header = req?.headers?.["x-forwarded-for"];
  const raw = Array.isArray(header) ? header.join(",") : header;
  const last = raw?.split(",").pop()?.trim();
  return last && isIP(last) ? last : direct;
}
