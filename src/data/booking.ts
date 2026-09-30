// Configuração do agendamento: serviços, profissionais e horário de funcionamento.
// É a fonte única desses dados; a seção "Serviços" da página também lê daqui.
// Preços e durações são EXEMPLOS: ajuste para os valores reais.

export type BookingService = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number; // em reais
};

export type Professional = {
  id: string;
  name: string;
  role: string;
  photo?: string; // URL ou caminho em /public. Sem foto, mostra as iniciais.
  serviceIds?: string[]; // se vazio, atende todos os serviços
};

export const bookingServices: BookingService[] = [
  {
    id: "corte-barba",
    name: "Corte + Barba",
    description: "Corte na tesoura ou máquina, barba com toalha quente e acabamento na navalha.",
    durationMin: 75,
    price: 80,
  },
  {
    id: "corte",
    name: "Corte",
    description: "Tesoura ou máquina, do clássico ao degradê, com lavagem e finalização.",
    durationMin: 45,
    price: 50,
  },
  {
    id: "barba",
    name: "Barba",
    description: "Toalha quente, desenho na navalha e hidratação dos fios.",
    durationMin: 30,
    price: 40,
  },
  {
    id: "sobrancelha",
    name: "Sobrancelha",
    description: "Alinhamento discreto na navalha, mantendo o formato natural.",
    durationMin: 15,
    price: 20,
  },
  {
    id: "pigmentacao",
    name: "Pigmentação",
    description: "Preenchimento de falhas na barba ou no cabelo para um visual uniforme.",
    durationMin: 30,
    price: 35,
  },
];

// TODO: adicione os outros barbeiros da equipe, se houver.
export const professionals: Professional[] = [
  { id: "alan", name: "Alan Coelho", role: "Barbeiro e fundador" },
];

// Horário de funcionamento por dia da semana (0 = domingo ... 6 = sábado).
// Cada dia pode ter mais de um período, ex.: [["09:00", "12:00"], ["13:00", "20:00"]] para pausa de almoço.
// TODO: ajuste para o horário real.
export const weeklyHours: Record<number, [string, string][]> = {
  0: [],
  1: [],
  2: [["09:00", "12:00"], ["13:00", "20:00"]],
  3: [["09:00", "12:00"], ["13:00", "20:00"]],
  4: [["09:00", "12:00"], ["13:00", "20:00"]],
  5: [["09:00", "12:00"], ["13:00", "20:00"]],
  6: [["08:00", "18:00"]],
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
