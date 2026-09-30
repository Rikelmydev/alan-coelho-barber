import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import preact from "@astrojs/preact";
import vercel from "@astrojs/vercel";

export default defineConfig({
  // Páginas são estáticas por padrão; só a API de agendamento e o /admin rodam no servidor.
  adapter: vercel(),
  integrations: [icon(), preact()],
  image: {
    // Fotos provisórias vêm do Unsplash; o Astro baixa e otimiza no build.
    domains: ["images.unsplash.com"],
  },
  env: {
    schema: {
      // Banco de dados (Turso/libSQL). Sem essas variáveis, usa o arquivo local data/agenda.db.
      TURSO_DATABASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      TURSO_AUTH_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      // Senha do painel /admin e chave usada para assinar o cookie de login.
      ADMIN_PASSWORD: envField.string({ context: "server", access: "secret", optional: true }),
      ADMIN_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
