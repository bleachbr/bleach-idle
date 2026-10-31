import { describe, it, expect } from "vitest";
import { clientIp, isPrivateAddress } from "../src/clientIp";

const req = (remote: string | undefined, xff?: string | string[]) =>
  ({ socket: { remoteAddress: remote }, headers: xff === undefined ? {} : { "x-forwarded-for": xff } }) as never;

describe("clientIp: IP do cliente para o limite de login", () => {
  it("sem TRUST_PROXY usa sempre o IP da conexão, mesmo com o cabeçalho", () => {
    expect(clientIp(req("172.18.0.5", "203.0.113.7"), false)).toBe("172.18.0.5");
  });

  it("com TRUST_PROXY e conexão do proxy (rede privada) usa o IP do cabeçalho", () => {
    expect(clientIp(req("172.18.0.5", "203.0.113.7"), true)).toBe("203.0.113.7");
  });

  it("com vários itens usa o último, que foi o proxy quem acrescentou", () => {
    expect(clientIp(req("172.18.0.5", "198.51.100.9, 203.0.113.7"), true)).toBe("203.0.113.7");
  });

  it("não deixa o cliente escolher o próprio IP: item forjado à esquerda é ignorado", () => {
    expect(clientIp(req("172.18.0.5", "1.1.1.1, 203.0.113.7"), true)).toBe("203.0.113.7");
  });

  it("com TRUST_PROXY, mas a conexão vem da internet (porta publicada por engano), ignora o cabeçalho", () => {
    expect(clientIp(req("198.51.100.20", "1.1.1.1"), true)).toBe("198.51.100.20");
  });

  it("valor que não é IP cai no IP da conexão", () => {
    expect(clientIp(req("172.18.0.5", "isso-nao-e-ip"), true)).toBe("172.18.0.5");
    expect(clientIp(req("172.18.0.5", ""), true)).toBe("172.18.0.5");
  });

  it("aceita IPv6 e conexão IPv4 mapeada em IPv6", () => {
    expect(clientIp(req("::ffff:172.18.0.5", "2001:db8::7"), true)).toBe("2001:db8::7");
  });

  it("aceita o cabeçalho como lista", () => {
    expect(clientIp(req("127.0.0.1", ["9.9.9.9", "203.0.113.7"]), true)).toBe("203.0.113.7");
  });

  it("sem requisição devolve um marcador, sem lançar erro", () => {
    expect(clientIp(undefined, true)).toBe("?");
  });
});

describe("isPrivateAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.1.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"])(
    "%s é local ou privado",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );

  it.each(["8.8.8.8", "172.15.0.1", "172.32.0.1", "192.169.0.1", "2001:db8::1", "198.51.100.20", "abc", ""])("%s não é", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );
});
