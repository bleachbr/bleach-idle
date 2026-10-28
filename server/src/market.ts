// Mercado entre jogadores: anúncios ficam no banco com o item guardado (o item sai do
// inventário de quem anuncia). Quem compra paga; quem vende recebe menos a taxa.
import { DatabaseSync } from "node:sqlite";

export interface Listing { id: number; seller: string; sellerName: string; item: string; qty: number; price: number; createdAt: number }

export const MARKET_FEE = 0.05; // sai do jogo: segura a inflação de kan
export const MAX_LISTINGS = 10; // por personagem
export const MAX_PRICE = 1_000_000; // por unidade

const db = new DatabaseSync(process.env.DB_FILE ?? "bleach-idle.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS market (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    item TEXT NOT NULL,
    qty INTEGER NOT NULL,
    price INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS market_seller ON market(seller);
`);

const row = (r: any): Listing => ({ id: r.id, seller: r.seller, sellerName: r.seller_name, item: r.item, qty: r.qty, price: r.price, createdAt: r.created_at });

export function list(): Listing[] {
  return (db.prepare("SELECT * FROM market ORDER BY item, price, created_at LIMIT 200").all() as any[]).map(row);
}

export function get(id: number): Listing | undefined {
  const r = db.prepare("SELECT * FROM market WHERE id = ?").get(id);
  return r ? row(r) : undefined;
}

export function countBy(seller: string): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM market WHERE seller = ?").get(seller) as { n: number }).n;
}

export function add(seller: string, sellerName: string, item: string, qty: number, price: number): number {
  return Number(db.prepare("INSERT INTO market (seller, seller_name, item, qty, price, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(seller, sellerName, item, qty, price, Date.now()).lastInsertRowid);
}

/** Remove o anúncio; devolve true só para quem conseguiu (evita vender o mesmo item duas vezes). */
export function remove(id: number): boolean {
  return db.prepare("DELETE FROM market WHERE id = ?").run(id).changes > 0;
}
