// Datas como texto "AAAA-MM-DD" e horários em minutos desde 00:00, sempre no fuso da barbearia.
// Evita os erros clássicos de fuso: o servidor da Vercel roda em UTC, o cliente no Brasil.

import { bookingRules } from "../data/booking";

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const isIsoDate = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));

export const isHHMM = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Data e minuto atuais no fuso da barbearia. */
export function nowInZone(timeZone = bookingRules.timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// Meio-dia UTC como âncora: somar dias nunca pula ou repete uma data por causa de horário de verão.
const anchor = (iso: string) => new Date(`${iso}T12:00:00Z`);

export const addDays = (iso: string, n: number) => {
  const d = anchor(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const weekday = (iso: string) => anchor(iso).getUTCDay();

export const formatDateLong = (iso: string) =>
  anchor(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** Para início de frase ou título: "Quarta-feira, 30 de setembro". */
export const formatDateTitle = (iso: string) => {
  const s = formatDateLong(iso);
  return s[0].toUpperCase() + s.slice(1);
};

export const formatDateShort = (iso: string) =>
  anchor(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
