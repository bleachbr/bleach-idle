import { describe, it, expect } from "vitest";
import { clientIp, parseTrustedProxies } from "../src/clientIp";

const req = (remote: string | undefined, xff?: string | string[]) =>
  ({ socket: { remoteAddress: remote }, headers: xff === undefined ? {} : { "x-forwarded-for": xff } }) as never;

const caddy = parseTrustedProxies("172.28.0.0/24");

describe("parseTrustedProxies: a lista vem do operador", () => {
  it("vazio ou ausente desliga a confiança", () => {
    expect(parseTrustedProxies(undefined)).toBeUndefined();
    expect(parseTrustedProxies("")).toBeUndefined();
    expect(parseTrustedProxies(" , ")).toBeUndefined();
  });

  it("CIDR e IP avulso, IPv4 e IPv6, separados por vírgula", () => {
    const lista = parseTrustedProxies("172.28.0.0/24, 100.64.0.0/10, 10.0.0.7, fd00::/8")!;
    expect(lista.check("172.28.0.9", "ipv4")).toBe(true);
    expect(lista.check("100.64.0.9", "ipv4")).toBe(true); // CGNAT, que a heurística antiga recusava
    expect(lista.check("10.0.0.7", "ipv4")).toBe(true);
    expect(lista.check("10.0.0.8", "ipv4")).toBe(false);
    expect(lista.check("fd00::1", "ipv6")).toBe(true);
  });

  it("valor inválido lança erro na partida em vez de desligar a proteção em silêncio", () => {
    expect(() => parseTrustedProxies("1")).toThrow(/TRUST_PROXY/);
    expect(() => parseTrustedProxies("172.28.0.0/24, banana")).toThrow(/banana/);
  });
});

describe("clientIp: IP do cliente para o limite de login", () => {
  it("sem proxies configurados usa sempre o IP da conexão, mesmo com o cabeçalho", () => {
    expect(clientIp(req("172.28.0.5", "203.0.113.7"), undefined)).toBe("172.28.0.5");
  });

  it("conexão vinda do proxy configurado usa o IP do cabeçalho", () => {
    expect(clientIp(req("172.28.0.5", "203.0.113.7"), caddy)).toBe("203.0.113.7");
  });

  it("com vários itens usa o último, que foi o proxy quem acrescentou", () => {
    expect(clientIp(req("172.28.0.5", "198.51.100.9, 203.0.113.7"), caddy)).toBe("203.0.113.7");
  });

  it("não deixa o cliente escolher o próprio IP: item forjado à esquerda é ignorado", () => {
    expect(clientIp(req("172.28.0.5", "1.1.1.1, 203.0.113.7"), caddy)).toBe("203.0.113.7");
  });

  it("conexão de endereço privado que NÃO é o proxy configurado não é confiável (NAT, outro contêiner)", () => {
    expect(clientIp(req("172.17.0.1", "1.1.1.1"), caddy)).toBe("172.17.0.1");
    expect(clientIp(req("10.0.0.5", "1.1.1.1"), caddy)).toBe("10.0.0.5");
  });

  it("conexão vinda da internet com o cabeçalho forjado ignora o cabeçalho", () => {
    expect(clientIp(req("198.51.100.20", "1.1.1.1"), caddy)).toBe("198.51.100.20");
  });

  it("valor que não é IP cai no IP da conexão", () => {
    for (const lixo of ["isso-nao-e-ip", "", "203.0.113.7:51234", "ip:x"]) expect(clientIp(req("172.28.0.5", lixo), caddy)).toBe("172.28.0.5");
  });

  it("aceita IPv6 e a conexão IPv4 mapeada em IPv6", () => {
    expect(clientIp(req("::ffff:172.28.0.5", "2001:db8::7"), caddy)).toBe("2001:db8::7");
  });

  it("aceita o cabeçalho como lista", () => {
    expect(clientIp(req("172.28.0.5", ["9.9.9.9", "203.0.113.7"]), caddy)).toBe("203.0.113.7");
  });

  it("sem requisição ou sem endereço devolve um marcador, sem lançar erro", () => {
    expect(clientIp(undefined, caddy)).toBe("?");
    expect(clientIp(req(undefined, "1.1.1.1"), caddy)).toBe("?");
    expect(clientIp(req("nao-e-ip", "1.1.1.1"), caddy)).toBe("nao-e-ip");
  });
});
