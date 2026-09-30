// Banco de dados (libSQL). Em produção usa o Turso; no computador, o arquivo data/agenda.db.

import { createClient, type Client, type InStatement } from "@libsql/client";
import { TURSO_AUTH_TOKEN, TURSO_DATABASE_URL } from "astro:env/server";
import type { Busy } from "./availability";

let client: Client | undefined;
let ready: Promise<unknown> | undefined;

export async function db(): Promise<Client> {
  if (!client) {
    if (!TURSO_DATABASE_URL && process.env.VERCEL) {
      throw new Error("Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN nas variáveis de ambiente da Vercel.");
    }
    client = createClient({ url: TURSO_DATABASE_URL ?? "file:data/agenda.db", authToken: TURSO_AUTH_TOKEN });
    ready = client.batch(
      [
        `CREATE TABLE IF NOT EXISTS bookings (
          id TEXT PRIMARY KEY,
          professional_id TEXT NOT NULL,
          service_id TEXT NOT NULL,
          service_name TEXT NOT NULL,
          price INTEGER NOT NULL,
          date TEXT NOT NULL,
          start_min INTEGER NOT NULL,
          end_min INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'confirmed',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE INDEX IF NOT EXISTS bookings_by_day ON bookings (professional_id, date, status)`,
        `CREATE TABLE IF NOT EXISTS blocks (
          id TEXT PRIMARY KEY,
          professional_id TEXT,
          date TEXT NOT NULL,
          start_min INTEGER NOT NULL,
          end_min INTEGER NOT NULL,
          reason TEXT
        )`,
      ],
      "write",
    );
  }
  await ready;
  return client;
}

/** Intervalos ocupados por dia (agendamentos confirmados + bloqueios) para um profissional. */
export async function busyByDay(
  exec: { execute(stmt: InStatement): Promise<{ rows: unknown[] }> },
  professionalId: string,
  from: string,
  to: string,
): Promise<Map<string, Busy[]>> {
  const result = await exec.execute({
    sql: `SELECT date, start_min, end_min FROM bookings
            WHERE professional_id = ? AND status = 'confirmed' AND date BETWEEN ? AND ?
          UNION ALL
          SELECT date, start_min, end_min FROM blocks
            WHERE (professional_id IS NULL OR professional_id = ?) AND date BETWEEN ? AND ?`,
    args: [professionalId, from, to, professionalId, from, to],
  });

  const map = new Map<string, Busy[]>();
  for (const row of result.rows as unknown as { date: string; start_min: number; end_min: number }[]) {
    const list = map.get(row.date) ?? [];
    list.push({ start: Number(row.start_min), end: Number(row.end_min) });
    map.set(row.date, list);
  }
  return map;
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
