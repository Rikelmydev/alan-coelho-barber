// Interações da página. Sem listeners de scroll: tudo via IntersectionObserver.

const header = document.getElementById("site-header");
const hero = document.getElementById("inicio");
const topSentinel = document.getElementById("top-sentinel");
const bookingBar = document.getElementById("booking-bar");
const toggle = document.getElementById("menu-toggle");
const menu = document.getElementById("mobile-menu");
const page = document.querySelectorAll<HTMLElement>("main, footer, #booking-bar");

// ---------- Scroll reveal (fade + slide-up) ----------
const revealEls = document.querySelectorAll<HTMLElement>("[data-reveal]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if ("IntersectionObserver" in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-in"));
}

// ---------- Cabeçalho sólido depois de sair do topo ----------
if (header && topSentinel) {
  new IntersectionObserver(([entry]) => {
    header.dataset.solid = String(!entry.isIntersecting);
  }).observe(topSentinel);
}

// ---------- Barra de agendamento (mobile) ----------
// Aparece depois do hero e some na seção de contato, que já tem o próprio botão.
const contact = document.getElementById("contato");
if (bookingBar && hero && contact) {
  let heroGone = false;
  let contactInView = false;
  const update = () => {
    bookingBar.dataset.visible = String(heroGone && !contactInView);
  };

  new IntersectionObserver(
    ([entry]) => {
      heroGone = entry.intersectionRatio < 0.3;
      update();
    },
    { threshold: [0, 0.3, 1] },
  ).observe(hero);

  new IntersectionObserver(([entry]) => {
    contactInView = entry.isIntersecting;
    update();
  }).observe(contact);
}

// ---------- Menu hambúrguer ----------
if (toggle && menu) {
  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

  const setOpen = (open: boolean) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    menu.dataset.open = String(open);
    document.documentElement.style.overflow = open ? "hidden" : "";
    page.forEach((el) => el.toggleAttribute("inert", open));
    if (open) menu.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  };

  toggle.addEventListener("click", () => setOpen(!isOpen()));

  // Fecha ao escolher um link
  menu.addEventListener("click", (e) => {
    if ((e.target as Element).closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Fecha se a tela crescer para o layout desktop
  window.matchMedia("(min-width: 768px)").addEventListener("change", (e) => {
    if (e.matches && isOpen()) setOpen(false);
  });
}
