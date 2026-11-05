// Tipos de correio interno compartilhados entre cliente e servidor (W-07)
import type { Slot } from "./items";

export interface MailItem {
  id: number;
  to: string;
  from: string;
  subject: string;
  body: string;
  gold: number;
  items: Slot[];
  createdAt: number;
  read: boolean;
}

export interface MailMsg {
  inbox: MailItem[];
}
