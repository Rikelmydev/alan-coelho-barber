// GET /api/slots?service=corte&professional=alan
// Devolve os horários livres de hoje até o limite de dias: { days: { "2026-10-01": ["09:00", ...] } }

import type { APIRoute } from "astro";
import { bookingServices, professionals } from "../../data/booking";
import { freeSlots, lastBookableDate } from "../../lib/availability";
import { busyByDay, db, json } from "../../lib/db";
import { addDays, nowInZone } from "../../lib/time";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const service = bookingServices.find((s) => s.id === url.searchParams.get("service"));
  const professional = professionals.find((p) => p.id === url.searchParams.get("professional"));
  if (!service || !professional) return json({ error: "Serviço ou profissional inválido." }, 400);

  const now = nowInZone();
  const last = lastBookableDate(now);
  const busy = await busyByDay(await db(), professional.id, now.date, last);

  const days: Record<string, string[]> = {};
  for (let date = now.date; date <= last; date = addDays(date, 1)) {
    const slots = freeSlots(date, service.durationMin, busy.get(date) ?? [], now);
    if (slots.length) days[date] = slots;
  }

  return json({ today: now.date, last, days });
};
