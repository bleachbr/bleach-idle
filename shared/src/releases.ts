export interface ReleaseEntry {
  id: string;
  date: string;
  title: string;
  changes: string[];
}

export interface ReleaseInfo {
  revision: string | null;
  deployedAt: string | null;
  entries: ReleaseEntry[];
}

export const RELEASES: ReleaseEntry[] = [
  {
    id: "2026-11-01-novidades",
    date: "2026-11-01",
    title: "Novidades do Bleach Idle",
    changes: [
      "Consulte o histórico de novidades pelo login, pela seleção de personagens ou pelo menu do jogo.",
      "Veja a versão publicada e o horário de início da última atualização do servidor.",
      "O indicador de novidades avisa quando há notas que você ainda não leu neste navegador.",
    ],
  },
];

export function releaseInfo(revision?: string, deployedAt?: string): ReleaseInfo {
  const validRevision = /^[a-f0-9]{40}$/.test(revision ?? "") ? revision! : null;
  const timestamp = deployedAt ? Date.parse(deployedAt) : NaN;
  return {
    revision: validRevision,
    deployedAt: validRevision && Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
    entries: RELEASES,
  };
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function isReleaseInfo(value: unknown): value is ReleaseInfo {
  if (!record(value)) return false;
  return (value.revision === null || (typeof value.revision === "string" && /^[a-f0-9]{40}$/.test(value.revision)))
    && (value.deployedAt === null || (typeof value.deployedAt === "string" && Number.isFinite(Date.parse(value.deployedAt))))
    && Array.isArray(value.entries) && value.entries.every((entry: unknown) => record(entry)
      && text(entry.id) && text(entry.title)
      && typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && Number.isFinite(Date.parse(entry.date))
      && Array.isArray(entry.changes) && entry.changes.length > 0 && entry.changes.every(text));
}

export function hasUnreadRelease(entries: ReleaseEntry[], seen: string | null): boolean {
  return entries.length > 0 && entries[0].id !== seen;
}
