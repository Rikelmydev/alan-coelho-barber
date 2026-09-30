// Cálculo dos horários livres. Função pura: recebe o que está ocupado e devolve o que sobra.

import { bookingRules, weeklyHours } from "../data/booking";
import { addDays, toHHMM, toMin, weekday } from "./time";

/** Intervalo ocupado no dia, em minutos (agendamento ou bloqueio). */
export type Busy = { start: number; end: number };

export type Now = { date: string; minutes: number };

export const lastBookableDate = (now: Now) => addDays(now.date, bookingRules.maxDaysAhead);

/** Horários de início ("HH:MM") em que cabe um serviço de `durationMin` minutos nesse dia. */
export function freeSlots(date: string, durationMin: number, busy: Busy[], now: Now): string[] {
  if (date < now.date || date > lastBookableDate(now)) return [];

  const earliest = date === now.date ? now.minutes + bookingRules.minLeadMin : 0;
  const slots: string[] = [];

  for (const [open, close] of weeklyHours[weekday(date)] ?? []) {
    const closeMin = toMin(close);
    for (let start = toMin(open); start + durationMin <= closeMin; start += bookingRules.slotStepMin) {
      if (start < earliest) continue;
      const end = start + durationMin;
      if (busy.some((b) => start < b.end && end > b.start)) continue;
      slots.push(toHHMM(start));
    }
  }
  return slots;
}
