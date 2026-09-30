// Textos e fotos da página. Serviços, preços e durações ficam em booking.ts.
// Fotos são provisórias (Unsplash): substitua por fotos reais do trabalho do Alan.

import { bookingServices, featuredServiceId, formatDuration, formatPrice } from "./booking";

const unsplash = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=85&fm=jpg`;

export type Service = {
  id: string;
  name: string;
  duration: string;
  price: string;
};

const toDisplay = (s: (typeof bookingServices)[number]): Service => ({
  id: s.id,
  name: s.name,
  duration: formatDuration(s.durationMin),
  price: formatPrice(s.price),
});

const featured = bookingServices.find((s) => s.id === featuredServiceId) ?? bookingServices[0];

export const featuredService = {
  ...toDisplay(featured),
  description: "Corte e barba no mesmo atendimento, com acabamento na navalha.",
  image: unsplash("1599011176306-4a96f1516d4d", 1400),
  imageAlt: "Barbeiro aparando a barba de um cliente com tesoura",
};

// Tabela de preços: os demais serviços, agrupados
export const serviceGroups = [
  { title: "Cortes e combos", category: "combo" },
  { title: "Avulsos", category: "avulso" },
].map((g) => ({
  title: g.title,
  items: bookingServices.filter((s) => s.category === g.category && s.id !== featured.id).map(toDisplay),
}));

export const hero = {
  image: unsplash("1599351431202-1e0f0137899a", 1400),
  imageAlt: "Barbeiro fazendo acabamento na navalha em um cliente",
};

export const gallery = [
  { src: unsplash("1647140655214-e4a2d914971f"), alt: "Corte na tesoura em andamento" },
  { src: unsplash("1517832606299-7ae9b720a186", 1000), alt: "Barba sendo aparada com tesoura, em preto e branco" },
  { src: unsplash("1657105052497-f996284ffff8", 1000), alt: "Detalhe de pente e tesoura acertando o cabelo" },
  { src: unsplash("1672642150228-3fcd5826ec26", 1000), alt: "Degradê sendo feito na máquina" },
  { src: unsplash("1640301133857-c4bc5789c1bb", 1000), alt: "Barbeiro finalizando um corte masculino" },
  { src: unsplash("1705976062088-5433328c2dcd", 2000), alt: "Barba sendo aparada na máquina, com a barbearia ao fundo" },
];
