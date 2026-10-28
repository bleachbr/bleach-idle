// Base dos rooms: erro num handler não derruba o servidor, e cada cliente tem um limite
// de mensagens por segundo (o excesso é descartado).
import { Room, ServerError, type Client } from "@colyseus/core";
import type { Schema } from "@colyseus/schema";

const MAX_PER_SECOND = 40; // folgado para jogar (andar segurando a tecla manda ~4/s)

export abstract class GameRoom<S extends Schema = any> extends Room<S> {
  private rate = new WeakMap<Client, { n: number; since: number; warned: boolean }>();

  /** Sem isto o Colyseus não envolve os handlers em try/catch: uma exceção derrubaria o processo. */
  onUncaughtException(error: Error & { cause?: unknown }, methodName: string) {
    // ServerError é resposta de propósito (senha errada, ingresso inválido...), não bug
    if (error.cause instanceof ServerError || error instanceof ServerError) return;
    console.error(`[${this.roomName}] erro em ${methodName}:`, error);
  }

  /** Registra um handler de mensagem que passa pelo limite por cliente (use no lugar de onMessage). */
  protected handle<T = any>(type: string, callback: (client: Client, message: T) => void) {
    return this.onMessage<T>(type, (client, message) => {
      if (this.allowed(client)) callback(client, message);
    });
  }

  private allowed(client: Client): boolean {
    const now = Date.now();
    let r = this.rate.get(client);
    if (!r || now - r.since >= 1000) {
      r = { n: 0, since: now, warned: r?.warned ?? false };
      this.rate.set(client, r);
    }
    if (++r.n <= MAX_PER_SECOND) return true;
    if (!r.warned) {
      r.warned = true;
      console.warn(`[${this.roomName}] cliente ${client.sessionId} passou de ${MAX_PER_SECOND} mensagens/s; o excesso é descartado.`);
    }
    return false;
  }
}
