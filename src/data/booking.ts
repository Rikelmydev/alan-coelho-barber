// Configuração do agendamento: serviços, profissionais e horário de funcionamento.
// É a fonte única desses dados; a seção "Serviços" da página também lê daqui.

export type BookingService = {
  id: string;
  name: string;
  durationMin: number;
  price: number; // em reais
  category: "combo" | "avulso";
};

export type Professional = {
  id: string;
  name: string;
  role: string;
  photo?: string; // caminho em /public (ex.: "/equipe/alan.jpg"). Sem foto, mostra as iniciais.
  serviceIds?: string[]; // se vazio, atende todos os serviços
};

// A ordem aqui é a ordem em que aparecem no agendamento.
export const bookingServices: BookingService[] = [
  { id: "corte", name: "Corte", durationMin: 30, price: 40, category: "combo" },
  { id: "corte-sobrancelha", name: "Corte e sobrancelha", durationMin: 35, price: 50, category: "combo" },
  { id: "corte-barba", name: "Corte e barba", durationMin: 60, price: 65, category: "combo" },
  { id: "corte-hidratacao", name: "Corte e hidratação", durationMin: 50, price: 50, category: "combo" },
  { id: "corte-penteado", name: "Corte e penteado", durationMin: 45, price: 60, category: "combo" },
  { id: "corte-relaxamento", name: "Corte e relaxamento", durationMin: 60, price: 65, category: "combo" },
  { id: "corte-progressiva", name: "Corte e progressiva", durationMin: 60, price: 100, category: "combo" },
  { id: "corte-botox", name: "Corte e botox", durationMin: 60, price: 100, category: "combo" },
  { id: "corte-luzes", name: "Corte e luzes", durationMin: 120, price: 130, category: "combo" },
  { id: "barba", name: "Barba", durationMin: 30, price: 30, category: "avulso" },
  { id: "penteado", name: "Penteado", durationMin: 20, price: 20, category: "avulso" },
];

// Serviço em destaque (card com foto) na seção "Serviços" da página.
export const featuredServiceId = "corte-barba";

export const professionals: Professional[] = [
  { id: "alan", name: "Alan Coelho", role: "Barbeiro" },
  { id: "gabriel", name: "Gabriel Almeida", role: "Barbeiro" },
];

// Horário de funcionamento por dia da semana (0 = domingo ... 6 = sábado).
// Cada dia pode ter mais de um período, ex.: [["09:00", "12:00"], ["12:30", "20:00"]] para pausa de almoço.
// Terça a sábado, 09:00 às 20:00 (último horário de 30 min às 19:30).
export const weeklyHours: Record<number, [string, string][]> = {
  0: [],
  1: [],
  2: [["09:00", "20:00"]],
  3: [["09:00", "20:00"]],
  4: [["09:00", "20:00"]],
  5: [["09:00", "20:00"]],
  6: [["09:00", "20:00"]],
};

export const bookingRules = {
  timeZone: "America/Sao_Paulo",
  slotStepMin: 30, // intervalo entre horários oferecidos (09:00, 09:30, ...)
  maxDaysAhead: 30, // até quantos dias à frente dá para agendar
  minLeadMin: 60, // antecedência mínima, em minutos
};

export const formatPrice = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

export const formatDuration = (min: number) =>
  min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;

const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);
const hourLabel = (hhmm: string) => (hhmm.endsWith(":00") ? `${hhmm.slice(0, 2)}h` : hhmm.replace(":", "h"));

/** Resumo do horário para a seção de contato, ex.: "Terça a sexta: 09h às 20h". */
export function hoursSummary() {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: { days: string; time: string }[] = [];
  const closed: string[] = [];
  let group: number[] = [];

  const flush = () => {
    if (!group.length) return;
    const periods = weeklyHours[group[0]];
    const days =
      group.length === 1
        ? DAY_NAMES[group[0]]
        : `${DAY_NAMES[group[0]]} ${group.length === 2 ? "e" : "a"} ${DAY_NAMES[group[group.length - 1]]}`;
    // Pausas curtas (almoço) não aparecem no resumo: mostra da abertura ao fechamento
    rows.push({ days: capitalize(days), time: `${hourLabel(periods[0][0])} às ${hourLabel(periods[periods.length - 1][1])}` });
    group = [];
  };

  for (const day of order) {
    const periods = weeklyHours[day] ?? [];
    if (!periods.length) {
      flush();
      closed.push(DAY_NAMES[day]);
      continue;
    }
    const same = group.length && JSON.stringify(weeklyHours[group[0]]) === JSON.stringify(periods);
    if (!same) flush();
    group.push(day);
  }
  flush();

  if (closed.length) {
    const list = new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(closed);
    rows.push({ days: capitalize(list), time: "Fechado" });
  }
  return rows;
}
