// Cliente mínimo da API Gemini (REST, sem SDK). Chave só por GEMINI_API_KEY (vem do .env da raiz).
const KEY = process.env.GEMINI_API_KEY;
export const MODEL = process.env.IA_MODEL ?? "gemini-3.5-flash-lite";

export function requireKey() {
  if (!KEY) { console.error("GEMINI_API_KEY ausente. Ela deve estar no .env da raiz do repo."); process.exit(1); }
}

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Contabiliza tokens reais retornados pela API Gemini para estimar custo da rodada. */
export const usage = { calls: 0, inputTokens: 0, outputTokens: 0 };

/** Preço estimado por 1M de tokens (Flash-Lite: $0.10 entrada / $0.40 saída). */
export function fmtCost(): string {
  const usd = (usage.inputTokens / 1e6) * 0.10 + (usage.outputTokens / 1e6) * 0.40;
  return `${usage.calls} chamadas · ${(usage.inputTokens / 1e3).toFixed(1)}k tokens in · ${(usage.outputTokens / 1e3).toFixed(1)}k tokens out · ~US$ ${usd.toFixed(4)}`;
}

/** Chama o modelo esperando JSON. Repete em 429/5xx; devolve `{}` se a resposta não for JSON. */
export async function askJson<T = any>(system: string, parts: Part[], temperature = 0.7): Promise<T> {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { responseMimeType: "application/json", temperature },
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY! }, body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 4000 * (attempt + 1))); continue; }
    if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200).replace(KEY!, "***")}`);
    const j: any = await res.json();
    usage.calls++;
    usage.inputTokens += Number(j.usageMetadata?.promptTokenCount ?? 0);
    usage.outputTokens += Number(j.usageMetadata?.candidatesTokenCount ?? 0);
    const raw: string = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
    try { return JSON.parse(raw); } catch { return {} as T; }
  }
  throw new Error("API indisponível após várias tentativas");
}

export const png = (b: Buffer): Part => ({ inlineData: { mimeType: "image/png", data: b.toString("base64") } });
