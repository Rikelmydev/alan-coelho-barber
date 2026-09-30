# Alan Coelho Barber

Site da barbearia com agendamento online próprio. Feito com [Astro](https://astro.build), Tailwind CSS v4 e Preact.

- **Página principal**: HTML estático, carrega rápido.
- **Agendamento** (botão "Agende seu horário"): fluxo em 5 passos com horários livres de verdade. Dois clientes nunca conseguem o mesmo horário.
- **Painel do barbeiro** em `/admin`: agenda do dia, cancelamentos e bloqueio de horários (folga, almoço, cliente marcado por fora).

## Rodar no computador

```bash
npm install
npm run dev
```

Abre em http://localhost:4321. O painel fica em http://localhost:4321/admin (a senha está no arquivo `.env`).

No computador, os agendamentos ficam no arquivo `data/agenda.db`. Apague esse arquivo para começar do zero.

## Onde editar

| O quê | Arquivo |
|---|---|
| Serviços, preços, durações | `src/data/booking.ts` (`bookingServices`) |
| Barbeiros da equipe | `src/data/booking.ts` (`professionals`) |
| Horário de funcionamento | `src/data/booking.ts` (`weeklyHours`) |
| Intervalo entre horários, antecedência, dias à frente | `src/data/booking.ts` (`bookingRules`) |
| WhatsApp, Instagram, endereço | `src/data/site.ts` |
| Fotos da página | `src/data/content.ts` |
| Cores e fontes | `src/styles/global.css` (bloco `@theme`) |

A seção "Serviços" e o horário na seção de contato leem de `booking.ts`, então o site e o agendamento nunca ficam diferentes.

## Publicar na Vercel

O agendamento precisa de um banco de dados online. O recomendado é o **Turso** (tem plano gratuito).

Tudo abaixo usa só planos gratuitos (Vercel Hobby e Turso Free).

1. **Ligar ao GitHub**: no projeto da Vercel, **Settings > Git > Connect Git Repository** e escolha este repositório. A partir daí, cada `git push` publica o site sozinho.
2. **Banco de dados**: no projeto, aba **Storage > Create Database > Turso**, plano **Free**, e conecte ao projeto. Ele cria sozinho as variáveis `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`.
3. **Senha do painel**: em **Settings > Environment Variables**, adicione `ADMIN_PASSWORD` com a senha que você quiser.
4. Faça um novo deploy (ou um `git push`). As tabelas do banco são criadas sozinhas no primeiro agendamento.

Os itens que a Vercel sugere depois (domínio próprio, Web Analytics, Speed Insights) são opcionais.

Veja `.env.example` para a lista de variáveis.

## Como o agendamento funciona

1. O cliente escolhe serviço e profissional.
2. O site pede a `/api/slots` os horários livres dos próximos 30 dias: horário de funcionamento, menos agendamentos confirmados, menos bloqueios, respeitando a duração do serviço.
3. Ao confirmar, `/api/bookings` confere o horário de novo dentro de uma transação antes de gravar. Se alguém tiver pego o horário segundos antes, o cliente volta para a escolha de horário com um aviso.
4. O agendamento aparece na hora no painel `/admin`.

### Trocar as fotos pelas do Alan

As fotos atuais são provisórias (Unsplash). Coloque os arquivos em `src/assets/` e importe em `src/data/content.ts`:

```ts
import corte1 from "../assets/corte-1.jpg";

export const gallery = [
  { src: corte1, alt: "Degradê com risca feito na máquina" },
  // ...
];
```

Para a foto de um barbeiro no agendamento, coloque a imagem em `public/equipe/` e use `photo: "/equipe/alan.jpg"` em `professionals`.
