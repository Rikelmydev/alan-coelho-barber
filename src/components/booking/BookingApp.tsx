/** @jsxImportSource preact */
// Fluxo de agendamento em 5 passos (serviço, profissional, data/horário, dados, confirmação).
// Abre com qualquer elemento que tenha o atributo data-booking-open.

import type { ComponentChildren } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  bookingServices,
  formatDuration,
  formatPrice,
  professionals,
  type BookingService,
  type Professional,
} from "../../data/booking";
import { site } from "../../data/site";
import { formatDateLong, formatDateTitle, toHHMM, toMin } from "../../lib/time";
import { icons, type IconName } from "./icons";

const STEPS = ["Serviço", "Profissional", "Data e horário", "Seus dados", "Confirmação"] as const;
const SUCCESS = STEPS.length;
const STORAGE_KEY = "acb-cliente";

type Slots =
  | { status: "idle" | "loading" | "error" }
  | { status: "ready"; today: string; last: string; days: Record<string, string[]> };

type Submit = { status: "idle" | "sending" } | { status: "error"; message: string };

declare global {
  interface Window {
    __bookingReady?: boolean;
    __bookingQueued?: boolean;
  }
}

function Icon({ name, class: cls = "size-5" }: { name: IconName; class?: string }) {
  return <svg viewBox="0 0 256 256" aria-hidden="true" class={cls} dangerouslySetInnerHTML={{ __html: icons[name] }} />;
}

const maskPhone = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

// ---------- Calendário ----------
const monthLabel = (ym: string) => {
  const s = new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return s[0].toUpperCase() + s.slice(1);
};
const addMonths = (ym: string, n: number) => {
  const d = new Date(`${ym}-15T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const daysInMonth = (ym: string) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
const firstWeekday = (ym: string) => new Date(`${ym}-01T12:00:00Z`).getUTCDay();

export default function BookingApp() {
  const [rendered, setRendered] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");

  const [serviceId, setServiceId] = useState<string>();
  const [proId, setProId] = useState<string>();
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<string>();
  const [month, setMonth] = useState<string>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [touched, setTouched] = useState(false);

  const [slots, setSlots] = useState<Slots>({ status: "idle" });
  const [submit, setSubmit] = useState<Submit>({ status: "idle" });
  const [notice, setNotice] = useState<string>();

  const titleRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);

  const service = bookingServices.find((s) => s.id === serviceId);
  const pro = professionals.find((p) => p.id === proId);
  const availablePros = useMemo(
    () => professionals.filter((p) => !p.serviceIds?.length || (serviceId && p.serviceIds.includes(serviceId))),
    [serviceId],
  );

  const nameOk = name.trim().length >= 3;
  const phoneOk = [10, 11].includes(phone.replace(/\D/g, "").length);

  // ---------- Abrir e fechar ----------
  const openModal = (trigger?: HTMLElement | null) => {
    if (openRef.current) return;
    triggerRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved?.name) setName(saved.name);
      if (saved?.phone) setPhone(maskPhone(saved.phone));
    } catch {}
    setStep(0);
    setDir("fwd");
    setServiceId(undefined);
    setProId(undefined);
    setDate(undefined);
    setTime(undefined);
    setTouched(false);
    setSubmit({ status: "idle" });
    setNotice(undefined);
    setSlots({ status: "idle" });
    openRef.current = true;
    setRendered(true);
    history.pushState({ booking: true }, "");
    requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
  };

  const finishClose = () => {
    openRef.current = false;
    setOpen(false);
    setTimeout(() => setRendered(false), 450);
    triggerRef.current?.focus({ preventScroll: true });
  };

  // Fechar pelo X ou pelo fundo volta o histórico; o popstate faz o resto (e o botão voltar do Android também fecha).
  const closeModal = () => (history.state?.booking ? history.back() : finishClose());

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const trigger = (e.target as Element | null)?.closest?.("[data-booking-open]") as HTMLElement | null;
      if (!trigger) return;
      e.preventDefault();
      openModal(trigger);
    };
    const onPop = () => openRef.current && finishClose();
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPop);
    window.__bookingReady = true;
    if (window.__bookingQueued) {
      window.__bookingQueued = false;
      openModal();
    }
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Trava a rolagem e o foco na página de trás enquanto o modal está aberto
  useEffect(() => {
    if (!rendered) return;
    const behind = document.querySelectorAll<HTMLElement>("#site-header, #mobile-menu, main, footer, #booking-bar");
    document.documentElement.style.overflow = "hidden";
    behind.forEach((el) => el.setAttribute("inert", ""));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      behind.forEach((el) => el.removeAttribute("inert"));
      document.removeEventListener("keydown", onKey);
    };
  }, [rendered]);

  // Foco no título a cada passo (leitores de tela anunciam a mudança)
  useEffect(() => {
    if (open) titleRef.current?.focus({ preventScroll: true });
  }, [open, step]);

  // ---------- Navegação entre passos ----------
  const goTo = (target: number) => {
    setDir(target > step ? "fwd" : "back");
    setStep(target);
  };

  const loadSlots = async (svc: string, professional: string, keepDate?: string) => {
    setSlots({ status: "loading" });
    try {
      const res = await fetch(`/api/slots?service=${svc}&professional=${professional}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setSlots({ status: "ready", ...data });
      // Mantém o dia escolhido se ainda tiver horário; senão já seleciona o primeiro dia livre
      const firstFree: string | undefined = Object.keys(data.days)[0];
      const nextDate = keepDate && data.days[keepDate] ? keepDate : firstFree;
      if (nextDate !== keepDate) setTime(undefined);
      setDate(nextDate);
      setMonth((nextDate ?? data.today).slice(0, 7));
    } catch {
      setSlots({ status: "error" });
    }
  };

  const chooseService = (s: BookingService) => {
    if (s.id !== serviceId) {
      setDate(undefined);
      setTime(undefined);
    }
    setServiceId(s.id);
    const pros = professionals.filter((p) => !p.serviceIds?.length || p.serviceIds.includes(s.id));
    if (proId && !pros.some((p) => p.id === proId)) setProId(undefined);
    setTimeout(() => goTo(1), 180);
  };

  const choosePro = (p: Professional) => {
    setProId(p.id);
    if (serviceId) loadSlots(serviceId, p.id, date);
    setTimeout(() => goTo(2), 180);
  };

  const chooseTime = (t: string) => {
    setTime(t);
    setNotice(undefined);
    setTimeout(() => goTo(3), 220);
  };

  const confirm = async () => {
    if (!service || !pro || !date || !time) return;
    setSubmit({ status: "sending" });
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          professionalId: pro.id,
          date,
          time,
          name,
          phone,
          website: honeypot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setNotice(data.error);
        setTime(undefined);
        setSubmit({ status: "idle" });
        loadSlots(service.id, pro.id, date);
        goTo(2);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim(), phone: phone.replace(/\D/g, "") }));
      } catch {}
      setSubmit({ status: "idle" });
      goTo(SUCCESS);
    } catch (err) {
      setSubmit({
        status: "error",
        message: (err as Error).message || "Não foi possível confirmar agora. Verifique sua conexão e tente de novo.",
      });
    }
  };

  if (!rendered) return null;

  const endTime = time && service ? toHHMM(toMin(time) + service.durationMin) : "";
  const title = step === SUCCESS ? "Tudo certo" : STEPS[step];

  return (
    <div class="booking-root fixed inset-0 z-50" data-open={open} role="dialog" aria-modal="true" aria-labelledby="booking-title">
      <div class="booking-backdrop absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={closeModal} />

      <div class="booking-panel absolute inset-0 flex flex-col bg-ink-950 md:inset-y-0 md:right-0 md:left-auto md:w-[30rem] md:border-l md:border-ink-700">
        {/* Cabeçalho */}
        <header class="shrink-0 border-b border-ink-700 px-2 pt-[env(safe-area-inset-top)]">
          <div class="flex h-16 items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              class={`grid size-12 place-items-center text-bone transition-opacity hover:text-gold-300 ${step > 0 && step < SUCCESS ? "" : "invisible"}`}
              aria-label="Voltar"
            >
              <Icon name="arrow-left" class="size-6" />
            </button>
            <div class="min-w-0 flex-1 text-center">
              <h2 id="booking-title" ref={titleRef} tabIndex={-1} class="truncate font-display text-lg text-bone outline-none">
                {title}
              </h2>
              {step < SUCCESS && <p class="text-xs text-mist">Passo {step + 1} de {STEPS.length}</p>}
            </div>
            <button
              type="button"
              onClick={closeModal}
              class="grid size-12 place-items-center text-bone hover:text-gold-300"
              aria-label="Fechar agendamento"
            >
              <Icon name="x" class="size-6" />
            </button>
          </div>
          {step < SUCCESS && (
            <div class="flex gap-1.5 px-3 pb-3" aria-hidden="true">
              {STEPS.map((_, i) => (
                <span class="h-0.5 flex-1 overflow-hidden bg-ink-700">
                  <span class="booking-progress block h-full" style={{ transform: `scaleX(${i <= step ? 1 : 0})` }} />
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Conteúdo do passo */}
        <div class="relative flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          <div key={step} class={`booking-step booking-step-${dir} px-5 pt-6 pb-8`}>
            {step === 0 && (
              <>
                <p class="font-display text-3xl leading-tight text-bone">O que vamos fazer hoje?</p>
                <ul class="mt-6 flex flex-col gap-3">
                  {bookingServices.map((s) => (
                    <li>
                      <button
                        type="button"
                        onClick={() => chooseService(s)}
                        aria-pressed={serviceId === s.id}
                        class="booking-option flex w-full items-center gap-4 p-4 text-left"
                      >
                        <span class="min-w-0 flex-1">
                          <span class="block text-base font-semibold text-bone">{s.name}</span>
                          <span class="mt-1 flex items-center gap-1.5 text-sm text-mist">
                            <Icon name="clock" class="size-4 text-gold-500" />
                            {formatDuration(s.durationMin)}
                          </span>
                        </span>
                        <span class="font-display text-xl whitespace-nowrap text-gold-300">{formatPrice(s.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {step === 1 && (
              <>
                <p class="font-display text-3xl leading-tight text-bone">Com quem você quer agendar?</p>
                <ul class="mt-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  {availablePros.map((p) => (
                    <li>
                      <button
                        type="button"
                        onClick={() => choosePro(p)}
                        aria-pressed={proId === p.id}
                        class="booking-option flex w-full flex-col items-center gap-3 px-4 py-6 text-center"
                      >
                        <span class="grid size-20 place-items-center overflow-hidden rounded-full border border-gold-500/60 bg-ink-800 font-display text-2xl text-gold-300 italic">
                          {p.photo ? <img src={p.photo} alt="" class="size-full object-cover" /> : initials(p.name)}
                        </span>
                        <span>
                          <span class="block text-base font-semibold text-bone">{p.name}</span>
                          <span class="mt-0.5 block text-sm text-mist">{p.role}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {step === 2 && (
              <DateTimeStep
                slots={slots}
                month={month}
                setMonth={setMonth}
                date={date}
                setDate={(d) => {
                  setDate(d);
                  setTime(undefined);
                }}
                time={time}
                chooseTime={chooseTime}
                notice={notice}
                retry={() => serviceId && proId && loadSlots(serviceId, proId, date)}
              />
            )}

            {step === 3 && (
              <form
                id="booking-form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  setTouched(true);
                  if (nameOk && phoneOk) goTo(4);
                }}
              >
                <p class="font-display text-3xl leading-tight text-bone">Para quem é o horário?</p>
                <div class="mt-8 flex flex-col gap-6">
                  <div class="flex flex-col gap-2">
                    <label for="bk-name" class="text-sm font-medium text-bone">
                      Nome e sobrenome
                    </label>
                    <input
                      id="bk-name"
                      class="booking-input"
                      autoComplete="name"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      value={name}
                      onInput={(e) => setName(e.currentTarget.value)}
                      aria-invalid={touched && !nameOk}
                      aria-describedby="bk-name-error"
                    />
                    <p id="bk-name-error" class="min-h-5 text-sm text-red-300">
                      {touched && !nameOk ? "Digite seu nome completo." : ""}
                    </p>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label for="bk-phone" class="text-sm font-medium text-bone">
                      WhatsApp
                    </label>
                    <input
                      id="bk-phone"
                      class="booking-input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      enterKeyHint="done"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onInput={(e) => setPhone(maskPhone(e.currentTarget.value))}
                      aria-invalid={touched && !phoneOk}
                      aria-describedby="bk-phone-error bk-phone-help"
                    />
                    <p id="bk-phone-help" class="text-sm text-mist">
                      Com DDD. Usamos só para falar sobre este horário.
                    </p>
                    <p id="bk-phone-error" class="min-h-5 text-sm text-red-300">
                      {touched && !phoneOk ? "Confira o número com DDD." : ""}
                    </p>
                  </div>
                  {/* Campo invisível contra robôs */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    class="absolute -left-[9999px] h-0 w-0 opacity-0"
                    value={honeypot}
                    onInput={(e) => setHoneypot(e.currentTarget.value)}
                  />
                </div>
              </form>
            )}

            {step === 4 && service && pro && date && time && (
              <>
                <p class="font-display text-3xl leading-tight text-bone">Confira seu agendamento</p>
                <dl class="mt-6 border border-ink-700 bg-ink-850">
                  <SummaryRow label="Serviço" onEdit={() => goTo(0)}>
                    {service.name}
                    <span class="block text-sm text-mist">{formatDuration(service.durationMin)}</span>
                  </SummaryRow>
                  <SummaryRow label="Profissional" onEdit={() => goTo(1)}>
                    {pro.name}
                  </SummaryRow>
                  <SummaryRow label="Data e horário" onEdit={() => goTo(2)}>
                    {formatDateTitle(date)}
                    <span class="block text-sm text-mist">
                      {time} às {endTime}
                    </span>
                  </SummaryRow>
                  <SummaryRow label="Cliente" onEdit={() => goTo(3)}>
                    {name.trim()}
                    <span class="block text-sm text-mist">{phone}</span>
                  </SummaryRow>
                  <div class="flex items-baseline justify-between gap-4 border-t border-gold-500/30 px-5 py-4">
                    <dt class="text-sm text-mist">Total</dt>
                    <dd class="font-display text-2xl text-gold-300">{formatPrice(service.price)}</dd>
                  </div>
                </dl>
                {submit.status === "error" && (
                  <p role="alert" class="mt-5 flex items-start gap-2 border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-200">
                    <Icon name="warning-circle" class="mt-0.5 size-5 shrink-0" />
                    {submit.message}
                  </p>
                )}
              </>
            )}

            {step === SUCCESS && service && pro && date && time && (
              <SuccessStep service={service} pro={pro} date={date} time={time} endTime={endTime} name={name.trim()} onClose={closeModal} />
            )}
          </div>
        </div>

        {/* Rodapé com ação principal */}
        {(step === 3 || step === 4) && (
          <footer class="shrink-0 border-t border-ink-700 bg-ink-950 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {step === 3 ? (
              <button type="submit" form="booking-form" class="btn-gold min-h-14 w-full text-base">
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={confirm}
                disabled={submit.status === "sending"}
                class="btn-gold min-h-14 w-full text-base disabled:cursor-wait disabled:opacity-70"
              >
                {submit.status === "sending" ? "Confirmando..." : "Confirmar agendamento"}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: ComponentChildren }) {
  return (
    <div class="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4 last-of-type:border-b-0">
      <div class="min-w-0">
        <dt class="text-xs font-medium tracking-wide text-mist uppercase">{label}</dt>
        <dd class="mt-1 text-base text-bone">{children}</dd>
      </div>
      <button type="button" onClick={onEdit} class="-mr-2 min-h-11 shrink-0 px-2 text-sm font-medium text-gold-300 hover:underline">
        Alterar
      </button>
    </div>
  );
}

function DateTimeStep(props: {
  slots: Slots;
  month?: string;
  setMonth: (m: string) => void;
  date?: string;
  setDate: (d: string) => void;
  time?: string;
  chooseTime: (t: string) => void;
  notice?: string;
  retry: () => void;
}) {
  const { slots, month, setMonth, date, setDate, time, chooseTime, notice, retry } = props;

  if (slots.status === "error") {
    return (
      <div class="flex flex-col items-start gap-4 pt-4">
        <p class="font-display text-2xl text-bone">Não conseguimos carregar a agenda.</p>
        <p class="text-mist">Verifique sua conexão e tente de novo.</p>
        <button type="button" onClick={retry} class="btn-ghost">
          Tentar de novo
        </button>
      </div>
    );
  }

  if (slots.status !== "ready" || !month) {
    return (
      <div aria-busy="true" aria-label="Carregando horários">
        <div class="booking-skeleton h-9 w-56" />
        <div class="mt-6 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }, () => (
            <div class="booking-skeleton aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  const available = Object.keys(slots.days);
  if (available.length === 0) {
    return (
      <div class="pt-4">
        <p class="font-display text-2xl text-bone">Agenda cheia por enquanto.</p>
        <p class="mt-3 text-mist">
          Não há horários livres nos próximos dias. Fale com a gente no{" "}
          <a class="text-gold-300 underline" href={`https://wa.me/${site.whatsappNumber}`} target="_blank" rel="noopener">
            WhatsApp
          </a>
          .
        </p>
      </div>
    );
  }

  const minMonth = slots.today.slice(0, 7);
  const maxMonth = slots.last.slice(0, 7);
  const blanks = firstWeekday(month);
  const total = daysInMonth(month);
  const times = date ? slots.days[date] ?? [] : [];
  const periods = [
    { label: "Manhã", list: times.filter((t) => toMin(t) < 12 * 60) },
    { label: "Tarde", list: times.filter((t) => toMin(t) >= 12 * 60 && toMin(t) < 18 * 60) },
    { label: "Noite", list: times.filter((t) => toMin(t) >= 18 * 60) },
  ].filter((p) => p.list.length);

  return (
    <>
      <p class="font-display text-3xl leading-tight text-bone">Escolha o dia</p>

      {notice && (
        <p role="alert" class="mt-4 flex items-start gap-2 border border-gold-500/50 bg-gold-400/10 p-4 text-sm text-gold-200">
          <Icon name="warning-circle" class="mt-0.5 size-5 shrink-0" />
          {notice}
        </p>
      )}

      <div class="mt-6 flex items-center justify-between">
        <p class="text-base font-semibold text-bone">{monthLabel(month)}</p>
        <div class="flex">
          <button
            type="button"
            class="grid size-11 place-items-center text-bone hover:text-gold-300 disabled:opacity-25"
            disabled={month <= minMonth}
            onClick={() => setMonth(addMonths(month, -1))}
            aria-label="Mês anterior"
          >
            <Icon name="caret-left" />
          </button>
          <button
            type="button"
            class="grid size-11 place-items-center text-bone hover:text-gold-300 disabled:opacity-25"
            disabled={month >= maxMonth}
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="Próximo mês"
          >
            <Icon name="caret-right" />
          </button>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-7 text-center text-xs font-medium text-mist" aria-hidden="true">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d) => (
          <span class="py-2">{d}</span>
        ))}
      </div>
      <div class="grid grid-cols-7 gap-1">
        {Array.from({ length: blanks }, () => (
          <span />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
          const isAvailable = Boolean(slots.days[iso]);
          const selected = iso === date;
          return (
            <button
              type="button"
              disabled={!isAvailable}
              aria-pressed={selected}
              aria-label={`${formatDateLong(iso)}${isAvailable ? "" : ", sem horários"}`}
              onClick={() => setDate(iso)}
              class={`booking-day relative grid aspect-square place-items-center text-sm ${iso === slots.today ? "font-bold" : ""}`}
            >
              {i + 1}
              {isAvailable && !selected && <span class="absolute bottom-1.5 size-1 rounded-full bg-gold-400" />}
            </button>
          );
        })}
      </div>

      {date && (
        <div key={date} class="booking-step booking-step-up mt-8">
          <p class="text-base text-bone">
            Horários para <span class="text-gold-300">{formatDateLong(date)}</span>
          </p>
          {periods.map((p) => (
            <div class="mt-5">
              <p class="mb-2 text-xs font-medium tracking-wide text-mist uppercase">{p.label}</p>
              <div class="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4">
                {p.list.map((t) => (
                  <button type="button" onClick={() => chooseTime(t)} aria-pressed={t === time} class="booking-time min-h-12 text-sm font-semibold">
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function SuccessStep(props: {
  service: BookingService;
  pro: Professional;
  date: string;
  time: string;
  endTime: string;
  name: string;
  onClose: () => void;
}) {
  const { service, pro, date, time, endTime, name, onClose } = props;
  const stamp = (d: string, t: string) => `${d.replaceAll("-", "")}T${t.replace(":", "")}00`;
  const address = `${site.address.street} - ${site.address.district}, ${site.address.city} - ${site.address.state}, ${site.address.postalCode}`;

  const calendarUrl =
    "https://calendar.google.com/calendar/render?" +
    new URLSearchParams({
      action: "TEMPLATE",
      text: `${service.name} | ${site.name}`,
      dates: `${stamp(date, time)}/${stamp(date, endTime)}`,
      ctz: "America/Sao_Paulo",
      details: `Com ${pro.name}.`,
      location: address,
    }).toString();

  const message = `Olá! Acabei de agendar pelo site:\n${service.name} com ${pro.name}\n${formatDateLong(date)}, às ${time}\nNome: ${name}`;
  const whatsappUrl = `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div class="flex flex-col items-center pt-6 text-center">
      <span class="booking-check grid size-20 place-items-center rounded-full border border-gold-400/70 text-gold-300">
        <Icon name="check" class="size-10" />
      </span>
      <p class="mt-6 font-display text-3xl text-bone">Horário confirmado!</p>
      <p class="mt-3 max-w-xs text-mist">
        Te esperamos <span class="text-bone">{formatDateLong(date)}</span>, às <span class="text-bone">{time}</span>.
      </p>

      <div class="mt-8 w-full border border-ink-700 bg-ink-850 p-5 text-left">
        <p class="text-base font-semibold text-bone">{service.name}</p>
        <p class="mt-1 text-sm text-mist">
          Com {pro.name} · {formatPrice(service.price)}
        </p>
        <p class="mt-3 text-sm text-mist">{address}</p>
      </div>

      <div class="mt-6 flex w-full flex-col gap-3">
        <a href={calendarUrl} target="_blank" rel="noopener" class="btn-ghost w-full">
          <Icon name="calendar-plus" />
          Salvar na agenda
        </a>
        <a href={whatsappUrl} target="_blank" rel="noopener" class="btn-ghost w-full">
          <Icon name="whatsapp-logo" />
          Enviar no WhatsApp
        </a>
        <button type="button" onClick={onClose} class="btn-gold mt-2 min-h-14 w-full text-base">
          Concluir
        </button>
      </div>
      <p class="mt-6 text-sm text-mist">Precisa remarcar ou cancelar? Chame a gente no WhatsApp.</p>
    </div>
  );
}
