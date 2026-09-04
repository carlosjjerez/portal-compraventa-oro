/* AUREUM — portal de compraventa de oro
   Demo de front-end: los datos de mercado son simulados y los formularios no
   envían a ningún servidor. Ver README.md para los puntos de integración. */

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const formatEUR = value => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
const formatGram = value => `${value.toFixed(2).replace('.', ',')} €`;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo privado */ } },
};

/* ── Toast ──────────────────────────────────────────────────────────── */
function showToast(message) {
  const toast = $('#toast');
  $('#toastMessage').textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 4200);
}

/* ── Catálogo ───────────────────────────────────────────────────────── */
const products = [
  { id: 'bar-1', type: 'bar', name: 'Lingote 1 oz', detail: 'Refinería LBMA aprobada', purity: '999,9', price: 2345.5, visual: 'bar' },
  { id: 'bar-2', type: 'bar', name: 'Lingote 100 g', detail: 'Valcambi · PAMP Suisse', purity: '999,9', price: 7540.2, visual: 'bar' },
  { id: 'coin-1', type: 'coin', name: 'Krugerrand 1 oz', detail: 'South African Mint', purity: '22K', price: 2380, visual: 'coin', symbol: 'K' },
  { id: 'coin-2', type: 'coin', name: 'Maple Leaf 1 oz', detail: 'Royal Canadian Mint', purity: '999,9', price: 2395, visual: 'coin', symbol: '🍁' },
];

const productGrid = $('#productGrid');

function renderProducts(filter = 'all') {
  const visible = products.filter(product => filter === 'all' || product.type === filter);
  productGrid.innerHTML = visible.map(product => `
    <article class="product">
      <div class="product-image">${product.visual === 'bar' ? '<div class="gold-bar">AUREUM<small>FINE GOLD · 999.9</small></div>' : `<div class="coin">${product.symbol}</div>`}</div>
      <div class="product-meta"><h3>${product.name}</h3><span class="product-badge">${product.purity}</span></div>
      <p>${product.detail}</p>
      <div class="product-bottom"><strong class="product-price">${formatEUR(product.price)}</strong><button class="add-button" data-add="${product.id}" aria-label="Añadir ${product.name} a la cesta">+</button></div>
    </article>`).join('');
}
renderProducts();

$('#filterPills').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  $$('#filterPills button').forEach(item => {
    const selected = item === button;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  renderProducts(button.dataset.filter);
});

/* ── Cesta ──────────────────────────────────────────────────────────── */
const CART_KEY = 'aureum:cart';
const cartDrawer = $('#cartDrawer');
const backdrop = $('#backdrop');
const openCartButton = $('#openCart');
let cart = store.get(CART_KEY, []).filter(id => products.some(product => product.id === id));
let lastFocused = null;

function cartProducts() { return cart.map(id => products.find(product => product.id === id)); }

function renderCart() {
  const items = $('#cartItems');
  const list = cartProducts();
  $('#cartCount').textContent = list.length;
  $('#cartTotal').textContent = formatEUR(list.reduce((sum, product) => sum + product.price, 0));
  items.innerHTML = list.length
    ? list.map((product, index) => `<div class="cart-item"><div><b>${product.name}</b><span>${product.detail} · ${formatEUR(product.price)}</span></div><button data-remove="${index}" aria-label="Quitar ${product.name} de la cesta">×</button></div>`).join('')
    : '<p class="empty-cart">Su cesta está vacía.<br />Añada piezas para solicitar información.</p>';
  store.set(CART_KEY, cart);
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

function openCart() {
  lastFocused = document.activeElement;
  cartDrawer.classList.add('open');
  cartDrawer.removeAttribute('inert');
  cartDrawer.setAttribute('aria-hidden', 'false');
  openCartButton.setAttribute('aria-expanded', 'true');
  backdrop.classList.add('show');
  document.body.classList.add('cart-open');
  cartDrawer.querySelector(FOCUSABLE)?.focus();
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('inert', '');
  cartDrawer.setAttribute('aria-hidden', 'true');
  openCartButton.setAttribute('aria-expanded', 'false');
  backdrop.classList.remove('show');
  document.body.classList.remove('cart-open');
  lastFocused?.focus();
}

cartDrawer.setAttribute('inert', '');
openCartButton.addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
backdrop.addEventListener('click', closeCart);

cartDrawer.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = Array.from(cartDrawer.querySelectorAll(FOCUSABLE));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (cartDrawer.classList.contains('open')) closeCart();
  else if (mobileMenu.classList.contains('open')) closeMenu();
});

productGrid.addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const product = products.find(item => item.id === button.dataset.add);
  cart.push(product.id);
  renderCart();
  openCart();
  showToast(`${product.name} se ha añadido a la cesta.`);
});

$('#cartItems').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  cart.splice(Number(button.dataset.remove), 1);
  renderCart();
  (cartDrawer.querySelector('[data-remove]') || $('#closeCart')).focus();
});

$('#checkoutButton').addEventListener('click', () => {
  if (!cart.length) return showToast('Añada al menos una pieza para continuar.');
  closeCart();
  goTo('contacto');
  $('#contactReason').value = 'compra';
  showToast('Cuéntenos cómo prefiere que le contactemos para preparar su solicitud.');
});

renderCart();

/* ── Navegación ─────────────────────────────────────────────────────── */
const header = $('.site-header');
const menuButton = $('#menuButton');
const mobileMenu = $('#mobileMenu');

function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

$$('[data-scroll-to]').forEach(button => button.addEventListener('click', () => goTo(button.dataset.scrollTo)));

function openMenu() {
  mobileMenu.style.top = `${Math.max(0, header.getBoundingClientRect().bottom)}px`;
  mobileMenu.classList.add('open');
  mobileMenu.removeAttribute('inert');
  mobileMenu.setAttribute('aria-hidden', 'false');
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', 'Cerrar menú');
}

function closeMenu() {
  mobileMenu.classList.remove('open');
  mobileMenu.setAttribute('inert', '');
  mobileMenu.setAttribute('aria-hidden', 'true');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menú');
}

mobileMenu.setAttribute('inert', '');
menuButton.addEventListener('click', () => (mobileMenu.classList.contains('open') ? closeMenu() : openMenu()));
mobileMenu.querySelectorAll('a,button').forEach(item => item.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (mobileMenu.classList.contains('open')) mobileMenu.style.top = `${Math.max(0, header.getBoundingClientRect().bottom)}px`; });

/* Menú activo según la sección visible */
const navLinks = new Map($$('.desktop-nav [data-nav]').map(link => [link.dataset.nav, link]));
const spied = Array.from(navLinks.keys()).map(id => document.getElementById(id)).filter(Boolean);
if ('IntersectionObserver' in window && spied.length) {
  const visible = new Set();
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => (entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id)));
    const current = spied.map(section => section.id).find(id => visible.has(id));
    navLinks.forEach((link, id) => link.classList.toggle('active', id === current));
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  spied.forEach(section => spy.observe(section));
}

/* ── Calculadora ────────────────────────────────────────────────────── */
const purity = $('#purity');
const weightInput = $('#weight');

function calculateEstimate() {
  const pricePerGram = Number(purity.value);
  const weight = Math.max(0, Number(String(weightInput.value).replace(',', '.')) || 0);
  $('#estimateValue').textContent = formatEUR(pricePerGram * weight);
}

purity.addEventListener('change', calculateEstimate);
weightInput.addEventListener('input', calculateEstimate);
$$('[data-adjust]').forEach(button => button.addEventListener('click', () => {
  const current = Number(String(weightInput.value).replace(',', '.')) || 0;
  weightInput.value = Math.min(10000, Math.max(1, current + Number(button.dataset.adjust)));
  calculateEstimate();
}));

$('#calculatorForm').addEventListener('submit', event => {
  event.preventDefault();
  goTo('contacto');
  $('#contactReason').value = 'tasacion';
  $('#contactMessage').value = `Estimación desde la web: ${purity.options[purity.selectedIndex].text}, ${weightInput.value} g → ${$('#estimateValue').textContent}.`;
  setTimeout(() => $('#contactName').focus({ preventScroll: true }), reduceMotion ? 0 : 700);
  showToast('Su estimación está lista. Déjenos sus datos y le contactaremos.');
});

/* ── Formulario de contacto ─────────────────────────────────────────── */
const contactForm = $('#contactForm');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[+]?[\d\s().-]{9,20}$/;

function setError(input, message) {
  const field = input.closest('.field');
  const slot = contactForm.querySelector(`[data-error-for="${input.id}"]`);
  field?.classList.toggle('invalid', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
  if (slot) slot.textContent = message || '';
  return !message;
}

function validateField(input) {
  const value = input.value.trim();
  if (input.id === 'contactName') return setError(input, value.length < 2 ? 'Indíquenos su nombre.' : '');
  if (input.id === 'contactPhone') return setError(input, PHONE_RE.test(value) ? '' : 'Introduzca un teléfono válido.');
  if (input.id === 'contactEmail') return setError(input, EMAIL_RE.test(value) ? '' : 'Introduzca un email válido.');
  if (input.id === 'contactConsent') return setError(input, input.checked ? '' : 'Debe aceptar la política de privacidad.');
  return true;
}

['contactName', 'contactPhone', 'contactEmail'].forEach(id => {
  const input = $(`#${id}`);
  input.addEventListener('blur', () => validateField(input));
  input.addEventListener('input', () => { if (input.closest('.field').classList.contains('invalid')) validateField(input); });
});
$('#contactConsent').addEventListener('change', event => validateField(event.target));

contactForm.addEventListener('submit', event => {
  event.preventDefault();
  const fields = ['contactName', 'contactPhone', 'contactEmail', 'contactConsent'].map(id => $(`#${id}`));
  const invalid = fields.filter(input => !validateField(input));
  if (invalid.length) {
    invalid[0].focus();
    return showToast('Revise los campos marcados para continuar.');
  }
  // Punto de integración: aquí iría el POST al backend / CRM.
  const name = $('#contactName').value.trim().split(' ')[0];
  contactForm.reset();
  $$('.field').forEach(field => field.classList.remove('invalid'));
  $$('.error').forEach(slot => (slot.textContent = ''));
  showToast(`Gracias, ${name}. Le contactaremos en menos de 24 horas laborables.`);
});

/* ── Gráfico de cotización ──────────────────────────────────────────── */
const CHART = { w: 320, h: 132, pad: 6 };
const chartCanvas = $('#priceChart');
let chartHovering = false;
const priceHistory = [];

(function seedHistory() {
  // Paseo aleatorio de 30 dias, desplazado para que cierre en el precio spot
  // vigente: asi el ultimo punto enlaza con la cotizacion en directo sin saltos.
  const walk = [];
  let value = 69.4;
  for (let i = 0; i < 30; i += 1) {
    value += (Math.random() - 0.42) * 0.55;
    walk.push(value);
  }
  const shift = 71.2 - walk[walk.length - 1];
  walk.forEach((raw, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    priceHistory.push({ date, value: Math.max(67.5, Math.min(73, raw + shift)) });
  });
})();

const dayLabel = date => date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

function renderChart() {
  const values = priceHistory.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = i => CHART.pad + (i / (priceHistory.length - 1)) * (CHART.w - CHART.pad * 2);
  const y = v => CHART.pad + (1 - (v - min) / span) * (CHART.h - CHART.pad * 2 - 10);

  const line = priceHistory.map((point, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(point.value).toFixed(2)}`).join(' ');
  const area = `${line} L${x(priceHistory.length - 1).toFixed(2)},${CHART.h} L${x(0).toFixed(2)},${CHART.h} Z`;
  const last = priceHistory[priceHistory.length - 1];

  chartCanvas.innerHTML = `
    <svg viewBox="0 0 ${CHART.w} ${CHART.h}" preserveAspectRatio="none" focusable="false">
      <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4af37" stop-opacity=".34" /><stop offset="1" stop-color="#d4af37" stop-opacity="0" /></linearGradient></defs>
      <path d="${area}" fill="url(#chartFill)" />
      <path d="${line}" fill="none" stroke="#a5811a" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      <circle cx="${x(priceHistory.length - 1).toFixed(2)}" cy="${y(last.value).toFixed(2)}" r="3" fill="#735c00" />
      <g class="chart-cursor"><line x1="0" y1="${CHART.pad}" x2="0" y2="${CHART.h}" stroke="#8d8878" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" /><circle cx="0" cy="0" r="3.5" fill="#fff" stroke="#735c00" stroke-width="2" vector-effect="non-scaling-stroke" /></g>
      <rect class="chart-hit" x="0" y="0" width="${CHART.w}" height="${CHART.h}" />
    </svg>`;

  const change = ((last.value - priceHistory[0].value) / priceHistory[0].value) * 100;
  const delta = $('#chartDelta');
  delta.textContent = `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(2).replace('.', ',')}% en el periodo`;
  delta.className = `chart-delta ${change >= 0 ? 'up' : 'down'}`;
  $('#chartStart').textContent = dayLabel(priceHistory[0].date);
  $('#chartEnd').textContent = 'Hoy';
  showPoint(priceHistory.length - 1, false);

  const svg = chartCanvas.querySelector('svg');
  const cursor = chartCanvas.querySelector('.chart-cursor');
  const hit = chartCanvas.querySelector('.chart-hit');

  function pick(event) {
    const box = svg.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const index = Math.round(ratio * (priceHistory.length - 1));
    cursor.querySelector('line').setAttribute('x1', x(index));
    cursor.querySelector('line').setAttribute('x2', x(index));
    cursor.querySelector('circle').setAttribute('cx', x(index));
    cursor.querySelector('circle').setAttribute('cy', y(priceHistory[index].value));
    chartCanvas.classList.add('active');
    chartHovering = true;
    showPoint(index, true);
  }

  hit.addEventListener('pointermove', pick);
  hit.addEventListener('pointerleave', () => { chartCanvas.classList.remove('active'); chartHovering = false; showPoint(priceHistory.length - 1, false); });
}

function showPoint(index, hovering) {
  const point = priceHistory[index];
  $('#chartValue').textContent = formatGram(point.value);
  $('#chartDate').textContent = hovering && index !== priceHistory.length - 1 ? dayLabel(point.date) : 'hoy';
}

/* ── Cotizaciones en directo ────────────────────────────────────────── */
const RATIOS = { buy24: null, sell22: 0.9143, buy22: 0.8806, sell18: 0.75, buy18: 0.7205 };
const PURITY_RATIOS = [null, 0.8806, 0.7205, 0.5787]; // 24K (spot − margen), 22K, 18K, 14K
const openPrice = 70.9;
let livePrice = 71.2;

function updatePrices() {
  livePrice = Math.max(70.7, Math.min(71.8, livePrice + (Math.random() - 0.47) * 0.16));
  const change = ((livePrice - openPrice) / openPrice) * 100;
  const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  $('#tickerPrice').textContent = formatGram(livePrice);
  $('#heroPrice').textContent = formatGram(livePrice);
  $('#heroChange').textContent = `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(2).replace('.', ',')}%`;

  $('[data-price="sell24"]').textContent = formatGram(livePrice);
  $('[data-price="buy24"]').textContent = formatGram(livePrice - 2.75);
  Object.entries(RATIOS).forEach(([key, ratio]) => { if (ratio) $(`[data-price="${key}"]`).textContent = formatGram(livePrice * ratio); });

  [['24', change], ['22', change * 0.92], ['18', change * 0.71]].forEach(([karat, value]) => {
    const cell = $(`[data-trend="${karat}"]`);
    const up = value >= 0.005;
    const flat = Math.abs(value) < 0.005;
    cell.className = `trend ${flat ? 'neutral' : up ? 'up' : 'down'}`;
    cell.textContent = `${flat ? '→' : up ? '↗' : '↘'} ${flat ? '0,00' : `${up ? '+' : '−'}${Math.abs(value).toFixed(2).replace('.', ',')}`}%`;
  });

  $('#lastUpdated').textContent = now;
  $('#tableUpdated').textContent = now;

  // La calculadora usa siempre el precio de compra vigente.
  Array.from(purity.options).forEach((option, index) => {
    option.value = (PURITY_RATIOS[index] ? livePrice * PURITY_RATIOS[index] : livePrice - 2.75).toFixed(2);
  });
  calculateEstimate();

  priceHistory[priceHistory.length - 1].value = livePrice;
  renderChart();
}

updatePrices();
setInterval(updatePrices, 6200);

/* ── Animaciones de entrada y contadores ────────────────────────────── */
if ('IntersectionObserver' in window && !reduceMotion) {
  document.documentElement.classList.add('reveal-ready');
  const revealer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      if (entry.target.classList.contains('stat-row')) animateCounters(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  $$('.reveal').forEach(element => revealer.observe(element));
}

function animateCounters(row) {
  row.querySelectorAll('[data-count]').forEach(node => {
    const target = Number(node.dataset.count);
    const suffix = node.dataset.suffix || '';
    const final = new Intl.NumberFormat('es-ES').format(target) + suffix;
    // Con la pestana en segundo plano requestAnimationFrame se congela: mostramos el valor final.
    if (document.hidden) { node.textContent = final; return; }
    const start = performance.now();
    const duration = 1100;
    const tick = now => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = progress < 1 ? new Intl.NumberFormat('es-ES').format(Math.round(target * eased)) + suffix : final;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/* ── Botón flotante de WhatsApp ─────────────────────────────────────── */
const fab = $('.whatsapp-fab');
const toggleFab = () => fab.classList.toggle('show', window.scrollY > 520);
toggleFab();
window.addEventListener('scroll', toggleFab, { passive: true });

/* ── Consentimiento de cookies ──────────────────────────────────────── */
const COOKIE_KEY = 'aureum:cookies';
const cookieBanner = $('#cookieBanner');

function openCookieBanner() {
  cookieBanner.hidden = false;
  document.body.classList.add('banner-open');
  requestAnimationFrame(() => cookieBanner.classList.add('show'));
}

function closeCookieBanner() {
  cookieBanner.classList.remove('show');
  document.body.classList.remove('banner-open');
  setTimeout(() => { cookieBanner.hidden = true; }, 350);
}

cookieBanner.addEventListener('click', event => {
  const choice = event.target.closest('[data-cookie]')?.dataset.cookie;
  if (!choice) return;
  store.set(COOKIE_KEY, { choice, date: new Date().toISOString() });
  closeCookieBanner();
  showToast(choice === 'accept' ? 'Preferencias guardadas. Gracias.' : 'Solo usaremos las cookies necesarias.');
  // Punto de integración: cargar analítica únicamente si choice === 'accept'.
});

$$('[data-open-cookies]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); openCookieBanner(); }));
if (location.hash === '#cookies') { history.replaceState(null, '', location.pathname); openCookieBanner(); }
else if (!store.get(COOKIE_KEY, null)) setTimeout(openCookieBanner, 1200);

/* ── Mapa bajo consentimiento ───────────────────────────────────────── */
$('#loadMap')?.addEventListener('click', () => {
  const iframe = document.createElement('iframe');
  iframe.src = 'https://maps.google.com/maps?q=Calle%20de%20Serrano%2048%2C%20Madrid&t=&z=16&ie=UTF8&output=embed';
  iframe.title = 'Mapa de la oficina de Aureum en la Calle de Serrano 48, Madrid';
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.allowFullscreen = true;
  $('#mapFrame').replaceChildren(iframe);
});
