import { hasUnreadRelease, isReleaseInfo, type ReleaseInfo } from "../../shared/src/releases";
import "./releases.css";

export function initReleases() {
  const dialog = document.querySelector<HTMLDialogElement>("#release-dialog")!;
  const body = document.querySelector<HTMLElement>("#release-body")!;
  const status = document.querySelector<HTMLElement>("#release-status")!;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-releases]")];
  const labels = [...document.querySelectorAll<HTMLElement>("[data-release-version]")];
  let current: ReleaseInfo | null = null;
  let pending: Promise<void> | null = null;
  let seen: string | null = null;
  try { seen = localStorage.getItem("bi.releaseSeen"); } catch {}

  const updateBadge = () => {
    const unread = current ? hasUnreadRelease(current.entries, seen) : false;
    for (const button of buttons) {
      button.textContent = unread ? "Novidades · novas" : "Novidades";
      button.setAttribute("aria-label", unread ? "Novidades não lidas" : "Novidades");
    }
  };
  const markRead = () => {
    if (!current?.entries.length) return;
    seen = current.entries[0].id;
    try { localStorage.setItem("bi.releaseSeen", seen); } catch {}
    updateBadge();
  };
  const render = (release: ReleaseInfo) => {
    body.replaceChildren();
    const date = release.deployedAt ? new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
    }).format(new Date(release.deployedAt)) : null;
    const version = release.revision ? release.revision.slice(0, 7) : "desenvolvimento";
    for (const label of labels) label.textContent = date ? `Atualização: ${date} (Brasília) · ${version}` : `Versão: ${version} · sem data de deploy`;
    status.textContent = date ? `Início da atualização: ${date} (Brasília). Versão ${version}.` : "Ambiente sem metadados de deploy.";
    for (const entry of release.entries) {
      const section = document.createElement("section");
      const title = document.createElement("h3");
      title.textContent = entry.title;
      const time = document.createElement("time");
      time.dateTime = entry.date;
      time.textContent = entry.date.split("-").reverse().join("/");
      const list = document.createElement("ul");
      for (const change of entry.changes) {
        const item = document.createElement("li");
        item.textContent = change;
        list.append(item);
      }
      section.append(title, time, list);
      body.append(section);
    }
    current = release;
    updateBadge();
    if (dialog.open) markRead();
  };
  const refresh = () => {
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await fetch("/release", { cache: "no-store", signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const release: unknown = await response.json();
        if (!isReleaseInfo(release)) throw new Error("Resposta de novidades inválida");
        render(release);
      } catch {
        status.textContent = "Não foi possível consultar as novidades. Feche e abra novamente para tentar de novo.";
        if (!current) for (const label of labels) label.textContent = "Última atualização indisponível";
      } finally {
        pending = null;
      }
    })();
    return pending;
  };
  for (const button of buttons) button.onclick = () => {
    if (!dialog.open) dialog.showModal();
    if (current) markRead();
    void refresh();
  };
  document.querySelector<HTMLButtonElement>("#release-close")!.onclick = () => dialog.close();
  window.addEventListener("keydown", (event) => {
    if (dialog.open) event.stopImmediatePropagation();
  }, { capture: true });
  window.addEventListener("storage", (event) => {
    if (event.key === "bi.releaseSeen" || event.key === null) {
      seen = event.newValue;
      updateBadge();
    }
  });
  void refresh();
}
