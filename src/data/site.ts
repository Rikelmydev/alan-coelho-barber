// Todas as informações da barbearia ficam aqui.

export const site = {
  name: "Alan Coelho Barber",
  description:
    "Barbearia premium na Vila Progresso, Zona Leste de São Paulo. Cortes, barbas e acabamentos feitos com técnica e sem pressa. Agende seu horário online.",

  instagramUrl: "https://www.instagram.com/alancoelhobarber/",

  // TODO: número provisório para testes; trocar pelo WhatsApp da barbearia.
  // DDI + DDD + número, só dígitos.
  whatsappNumber: "5511978891704",
  whatsappDisplay: "(11) 97889-1704",

  address: {
    street: "Rua Criúva, 579",
    district: "Vila Progresso",
    city: "São Paulo",
    state: "SP",
    postalCode: "08245-300",
  },

  // Texto usado para posicionar o mapa
  mapQuery: "Rua Criúva, 579 - Vila Progresso, São Paulo - SP, 08245-300",

  // O horário de funcionamento fica em booking.ts (weeklyHours), junto com a agenda.
} as const;

export const whatsappUrl = `https://wa.me/${site.whatsappNumber}`;

export const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&output=embed`;

export const mapDirectionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery)}`;
