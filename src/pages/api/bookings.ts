// POST /api/bookings  { serviceId, professionalId, date, time, name, phone }
// Confere o horário de novo dentro de uma transação antes de gravar, para nunca haver dois clientes no mesmo horário.

import type { APIRoute } from "astro";
import { bookingServices, professionals } from "../../data/booking";
import { freeSlots } from "../../lib/availability";
import { busyByDay, db, json } from "../../lib/db";
import { isHHMM, isIsoDate, nowInZone, toMin } from "../../lib/time";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }

  // Campo invisível: só robôs preenchem
  if (body.website) return json({ error: "Requisição inválida." }, 400);

  const service = bookingServices.find((s) => s.id === body.serviceId);
  const professional = professionals.find((p) => p.id === body.professionalId);
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  const { date, time } = body;

  if (!service || !professional) return json({ error: "Serviço ou profissional inválido." }, 400);
  if (!isIsoDate(date) || !isHHMM(time)) return json({ error: "Data ou horário inválido." }, 400);
  if (name.length < 3 || name.length > 80) return json({ error: "Informe seu nome." }, 400);
  if (phone.length < 10 || phone.length > 11) return json({ error: "Informe um WhatsApp válido com DDD." }, 400);

  const client = await db();

  // Se outra reserva estiver gravando no mesmo instante, o banco pede para esperar (SQLITE_BUSY): tenta de novo.
  for (let attempt = 0; ; attempt++) {
    let tx: Awaited<ReturnType<typeof client.transaction>> | undefined;
    try {
      tx = await client.transaction("write");
      const now = nowInZone();
      const busy = await busyByDay(tx, professional.id, date, date);
      if (!freeSlots(date, service.durationMin, busy.get(date) ?? [], now).includes(time)) {
        await tx.rollback();
        // Horário que existe na grade mas foi ocupado agora há pouco, ou horário fora da grade (passado, fechado)
        const inGrid = freeSlots(date, service.durationMin, [], now).includes(time);
        return inGrid
          ? json({ error: "Esse horário acabou de ser reservado. Escolha outro, por favor.", code: "SLOT_TAKEN" }, 409)
          : json({ error: "Esse horário não está disponível.", code: "SLOT_INVALID" }, 400);
      }

      const id = crypto.randomUUID();
      const start = toMin(time);
      await tx.execute({
        sql: `INSERT INTO bookings (id, professional_id, service_id, service_name, price, date, start_min, end_min, customer_name, customer_phone)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, professional.id, service.id, service.name, service.price, date, start, start + service.durationMin, name, phone],
      });
      await tx.commit();
      return json({ id }, 201);
    } catch (err) {
      await tx?.rollback().catch(() => {});
      const busyDb = (err as { code?: string }).code?.startsWith("SQLITE_BUSY");
      if (busyDb && attempt < 8) {
        await new Promise((r) => setTimeout(r, 40 + Math.random() * 120 * (attempt + 1)));
        continue;
      }
      console.error("Erro ao criar agendamento", err);
      return json({ error: "Não foi possível concluir agora. Tente de novo em instantes." }, 500);
    } finally {
      tx?.close();
    }
  }
};
