// IP do cliente para o limite de tentativas de login.
// Atrás de um proxy (o Caddy do docker-compose), a conexão chega sempre do IP do proxy: sem ler o cabeçalho,
// todos os jogadores dividiriam o mesmo balde. Por isso, com TRUST_PROXY=1 vale o último item de
// X-Forwarded-For (o que o proxy acrescentou), mas só se a conexão vier de um endereço local ou privado.
// Um cabeçalho que chega direto da internet nunca é confiado, para ninguém escolher o próprio IP.
// Com mais de um proxy na frente (CDN e Caddy), o último item seria o do primeiro proxy: ajuste antes.
import { isIP } from "node:net";
import type { IncomingMessage } from "node:http";

const SEM_IP = "?";

/** Endereço de loopback, rede privada ou link-local (IPv4 e IPv6, inclusive IPv4 mapeado em IPv6). */
export function isPrivateAddress(addr: string): boolean {
  const ip = addr.toLowerCase().startsWith("::ffff:") ? addr.slice(7) : addr;
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  if (isIP(ip) === 6) {
    const low = ip.toLowerCase();
    return low === "::1" || low.startsWith("fc") || low.startsWith("fd") || /^fe[89ab]/.test(low);
  }
  return false;
}

export function clientIp(
  req: Pick<IncomingMessage, "headers" | "socket"> | undefined,
  trustProxy: boolean = process.env.TRUST_PROXY === "1",
): string {
  const direct = req?.socket?.remoteAddress ?? SEM_IP;
  if (!trustProxy || !isPrivateAddress(direct)) return direct;
  const header = req?.headers?.["x-forwarded-for"];
  const raw = Array.isArray(header) ? header.join(",") : header;
  const last = raw?.split(",").pop()?.trim();
  return last && isIP(last) ? last : direct;
}
