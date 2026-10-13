/* AUREUM — portal de compraventa de oro
   Proyecto de demostración diseñado y desarrollado por DigiNet Software.

   Las cotizaciones son simuladas y los formularios no envían datos a ningún
   servidor. Los puntos donde conectar sistemas reales están marcados con el
   comentario «Punto de integración». */

/* ── Utilidades ─────────────────────────────────────────────────────────── */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);
const CLEAN = params.has('clean'); // ?clean oculta avisos de demo y cookies (útil para capturas)
const NBSP = ' ';

/* Trabajo no urgente: se ejecuta cuando el navegador queda libre, después
   del primer pintado, para no retrasar la carga de la primera pantalla. */
const idle = (task) => (window.requestIdleCallback || ((cb) => setTimeout(cb, 1)))(task, { timeout: 700 });

const storage = (area) => ({
  get(key, fallback) {
    try {
      const raw = window[area].getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window[area].setItem(key, JSON.stringify(value));
    } catch {
      /* modo privado o almacenamiento bloqueado */
    }
  },
});
const local = storage('localStorage');
const session = storage('sessionStorage');

/* Formato español con separador de miles siempre (Intl omite el punto en
   cifras de cuatro dígitos, y en un listado de precios queda inconsistente). */
function formatNumber(value, decimals = 2) {
  const [int, dec] = Math.abs(value).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '−' : ''}${grouped}${decimals ? `,${dec}` : ''}`;
}
const eur = (value, decimals = 2) => `${formatNumber(value, decimals)}${NBSP}€`;
const signedPct = (value) => `${value > 0.004 ? '+' : value < -0.004 ? '−' : ''}${formatNumber(Math.abs(value), 2)}${NBSP}%`;

/* Fechas y horas siempre en horario de Madrid, esté donde esté el visitante. */
const TZ = 'Europe/Madrid';
const timeFormat = new Intl.DateTimeFormat('es-ES', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function madridNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    y: Number(get('year')), m: Number(get('month')), d: Number(get('day')),
    h: Number(get('hour')) % 24, min: Number(get('minute')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
  };
}

/* Fecha civil (sin hora) para recorrer días: mediodía UTC evita saltos de horario. */
const civil = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12));
const addDays = (date, days) => new Date(date.getTime() + days * 86400000);
const civilParts = (date) => ({ y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate(), weekday: date.getUTCDay() });
const dayLabel = (date, options) => new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', ...options }).format(date);

/* Horario de apertura en minutos desde medianoche (0 = domingo). */
const HOURS = {
  0: [],
  1: [[600, 840], [1020, 1200]],
  2: [[600, 840], [1020, 1200]],
  3: [[600, 840], [1020, 1200]],
  4: [[600, 840], [1020, 1200]],
  5: [[600, 840], [1020, 1200]],
  6: [[600, 840]],
};
const hhmm = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

function showToast(message, tone = 'ok') {
  const toast = $('#toast');
  $('#toastMessage').textContent = message;
  toast.classList.toggle('toast--error', tone === 'error');
  $('use', toast).setAttribute('href', tone === 'error' ? '#i-info' : '#i-check');
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 4200);
}

function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
}

/* Anima una cifra desde su valor actual hasta el nuevo. */
function tween(element, from, to, format, duration = 520) {
  if (!element) return;
  cancelAnimationFrame(element.tweenFrame);
  if (reduceMotion.matches || document.hidden || Math.abs(to - from) < 0.005) {
    element.textContent = format(to);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    element.textContent = format(from + (to - from) * eased);
    if (t < 1) element.tweenFrame = requestAnimationFrame(step);
  };
  element.tweenFrame = requestAnimationFrame(step);
}

/* Actualiza un texto y lo destaca brevemente si el precio ha cambiado. */
function setPrice(element, text, direction) {
  if (!element || element.textContent === text) return;
  element.textContent = text;
  if (!direction || reduceMotion.matches) return;
  element.classList.remove('flash-up', 'flash-down');
  void element.offsetWidth; // reinicia la animación
  element.classList.add(direction > 0 ? 'flash-up' : 'flash-down');
}

function setTrend(element, pct, numberElement = element.querySelector('.num')) {
  if (!element) return;
  const dir = Math.abs(pct) < 0.005 ? 'flat' : pct > 0 ? 'up' : 'down';
  element.classList.remove('up', 'down', 'flat');
  element.classList.add(dir);
  element.querySelector('use')?.setAttribute('href', `#i-trend-${dir}`);
  if (numberElement) numberElement.textContent = signedPct(pct);
}

/* ── Mercado (simulado) ─────────────────────────────────────────────────────
   Punto de integración: sustituir tick() por la lectura de una fuente real
   de cotizaciones. Todo lo demás se actualiza a partir de `market`. */

const BUY_FACTOR = 0.9614; // precio de compra sobre el de venta
const OZ = 31.1035;
const market = {
  spot: 71.2, open: 70.9,           // oro 24K, € por gramo
  silver: 0.95, silverOpen: 0.951,
  platinum: 29.84, platinumOpen: 29.7,
  palladium: 31.2, palladiumOpen: 31.52,
  direction: 0,
  updatedAt: new Date(),
};
const fineBuy = () => market.spot * BUY_FACTOR;
const goldChange = () => ((market.spot - market.open) / market.open) * 100;
const marketListeners = [];
const onMarket = (listener) => marketListeners.push(listener);

function tick() {
  if (document.hidden) return;
  const previous = market.spot;
  market.spot = clamp(market.spot + (Math.random() - 0.47) * 0.14, 70.6, 71.95);
  market.silver = clamp(market.silver + (Math.random() - 0.5) * 0.006, 0.92, 0.985);
  market.platinum = clamp(market.platinum + (Math.random() - 0.5) * 0.09, 29.2, 30.4);
  market.palladium = clamp(market.palladium + (Math.random() - 0.5) * 0.11, 30.6, 31.95);
  market.direction = Math.sign(market.spot - previous);
  market.updatedAt = new Date();
  marketListeners.forEach((listener) => listener());
}

/* ── Ticker de metales ──────────────────────────────────────────────────── */

const TICKER = [
  { key: 'g24', label: 'Oro 24K', value: () => market.spot, open: () => market.open, unit: '/g' },
  { key: 'oz', label: 'Oro · onza', value: () => market.spot * OZ, open: () => market.open * OZ, unit: '' },
  { key: 'g18', label: 'Oro 18K · compra', value: () => fineBuy() * 0.75, open: () => market.open * BUY_FACTOR * 0.75, unit: '/g' },
  { key: 'ag', label: 'Plata', value: () => market.silver, open: () => market.silverOpen, unit: '/g' },
  { key: 'pt', label: 'Platino', value: () => market.platinum, open: () => market.platinumOpen, unit: '/g' },
  { key: 'pd', label: 'Paladio', value: () => market.palladium, open: () => market.palladiumOpen, unit: '/g' },
];

function renderTicker() {
  const items = TICKER.map((item) => `
    <span class="ticker__item"><b>${item.label}</b><strong class="num" data-ticker="${item.key}"></strong><span class="trend" data-ticker-trend="${item.key}"><svg class="icon"><use href="#i-trend-up"/></svg><span class="num"></span></span></span>`).join('');
  $('#tickerTrack').innerHTML = items + items; // duplicado para el desplazamiento continuo
}

function updateTicker() {
  TICKER.forEach((item) => {
    const value = item.value();
    const pct = ((value - item.open()) / item.open()) * 100;
    $$(`[data-ticker="${item.key}"]`).forEach((el) => { el.textContent = `${eur(value)}${item.unit}`; });
    $$(`[data-ticker-trend="${item.key}"]`).forEach((el) => setTrend(el, pct));
  });
}

renderTicker();
updateTicker();
onMarket(updateTicker);

/* ── Precio en el hero y tabla de cotizaciones ─────────────────────────── */

const BOARD = [
  { row: '24', fineness: 1 },
  { row: '22', fineness: 0.9167 },
  { row: '18', fineness: 0.75 },
  { row: '14', fineness: 0.585 },
];

function updatePrices() {
  const dir = market.direction;
  const now = timeFormat.format(market.updatedAt);
  setPrice($('#heroPrice'), eur(market.spot), dir);
  setTrend($('#heroChangeWrap'), goldChange(), $('#heroChange'));
  $('#lastUpdated').textContent = now;
  $('#tableUpdated').textContent = now;

  BOARD.forEach(({ row, fineness }) => {
    setPrice($(`[data-price="buy${row}"]`), eur(fineBuy() * fineness), dir);
    setPrice($(`[data-price="sell${row}"]`), eur(market.spot * fineness), dir);
    setTrend($(`[data-trend="${row}"]`), goldChange());
  });
  setPrice($('[data-price="buyAg"]'), eur(market.silver * 0.895), 0);
  setPrice($('[data-price="sellAg"]'), eur(market.silver), 0);
  setTrend($('[data-trend="ag"]'), ((market.silver - market.silverOpen) / market.silverOpen) * 100);

  $$('[data-live="buyFine"]').forEach((el) => { el.textContent = `${eur(fineBuy())}/g`; });
  $$('[data-live="offer"]').forEach((el) => { el.textContent = eur(25 * 0.75 * fineBuy()); });
}

updatePrices();
onMarket(updatePrices);

const todayLabel = new Intl.DateTimeFormat('es-ES', { timeZone: TZ, day: 'numeric', month: 'long' }).format(new Date());
$('#todayLabel').textContent = `Precio del oro hoy · ${todayLabel}`;

/* ── Gráfico de evolución ───────────────────────────────────────────────── */

const chart = { el: $('#priceChart'), range: 30, history: [], hovering: false, points: [], scaleY: null };

/* Generador pseudoaleatorio con semilla (mulberry32). */
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

(function seedHistory() {
  // Año simulado con semilla fija (+12 % anual, +2 % mensual), desplazado
  // para cerrar en el precio vigente. Punto de integración: histórico real.
  const random = seeded(304);
  const days = 365;
  const walk = [];
  let value = 62;
  for (let i = 0; i < days; i += 1) {
    value += (random() - 0.455) * 0.5 + Math.sin(i / 21) * 0.03;
    walk.push(value);
  }
  const shift = market.spot - walk[walk.length - 1];
  const today = madridNow();
  const end = civil(today.y, today.m, today.d);
  walk.forEach((raw, i) => chart.history.push({ date: addDays(end, i - (days - 1)), value: raw + shift }));
})();

function chartReadout(point, isLast) {
  $('#chartValue').textContent = eur(point.value);
  $('#chartDate').textContent = isLast ? 'hoy' : dayLabel(point.date, { day: 'numeric', month: 'short', year: chart.range > 60 ? 'numeric' : undefined });
}

function renderChart() {
  const points = chart.history.slice(-(chart.range + 1));
  chart.points = points;
  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  const pad = (max - min) * 0.14 || 1;
  min -= pad;
  max += pad;
  const W = 1000;
  const H = 400;
  const x = (i) => (i / (points.length - 1)) * W;
  const y = (v) => H - ((v - min) / (max - min)) * H;
  chart.scaleY = (v) => (y(v) / H) * 100;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const guides = [0.15, 0.5, 0.85];
  const last = points[points.length - 1];

  chart.el.innerHTML = `
    <div class="chart__plot">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4af37" stop-opacity=".3"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></linearGradient></defs>
        ${guides.map((t) => `<line x1="0" x2="${W}" y1="${H * t}" y2="${H * t}" stroke="#ece6dc" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('')}
        <path d="${line}L${W},${H}L0,${H}Z" fill="url(#chartFill)"/>
        <path d="${line}" fill="none" stroke="#a5811a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      </svg>
      <span class="chart__cursor"></span>
      <span class="chart__dot chart__dot--hover"></span>
      <span class="chart__dot chart__dot--live" style="left:100%;top:${chart.scaleY(last.value).toFixed(2)}%"></span>
    </div>
    ${guides.map((t) => `<span class="chart__grid-label num" style="top:calc(8px + (100% - 16px) * ${t})">${formatNumber(max - (max - min) * t)}</span>`).join('')}`;

  const change = ((last.value - points[0].value) / points[0].value) * 100;
  const delta = $('#chartDelta');
  const period = { 7: 'en 7 días', 30: 'en el último mes', 365: 'en el último año' }[chart.range];
  delta.innerHTML = `<svg class="icon"><use href="#i-trend-${change >= 0 ? 'up' : 'down'}"/></svg>${signedPct(change)} ${period}`;
  delta.className = `chart__delta trend ${change >= 0 ? 'up' : 'down'}`;

  const mid = points[Math.floor((points.length - 1) / 2)];
  const axisFormat = chart.range > 60 ? { month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' };
  $('#chartStart').textContent = dayLabel(points[0].date, axisFormat);
  $('#chartMid').textContent = dayLabel(mid.date, axisFormat);
  if (!chart.hovering) chartReadout(last, true);
}

chart.el.addEventListener('pointermove', (event) => {
  const box = $('.chart__plot', chart.el).getBoundingClientRect();
  const ratio = clamp((event.clientX - box.left) / box.width, 0, 1);
  const index = Math.round(ratio * (chart.points.length - 1));
  const point = chart.points[index];
  const left = `${(index / (chart.points.length - 1)) * 100}%`;
  $('.chart__cursor', chart.el).style.left = left;
  const dot = $('.chart__dot--hover', chart.el);
  dot.style.left = left;
  dot.style.top = `${chart.scaleY(point.value)}%`;
  chart.el.classList.add('is-hover');
  chart.hovering = true;
  chartReadout(point, index === chart.points.length - 1);
});

chart.el.addEventListener('pointerleave', () => {
  chart.el.classList.remove('is-hover');
  chart.hovering = false;
  chartReadout(chart.points[chart.points.length - 1], true);
});

$$('.chart__tabs [data-range]').forEach((tab) => tab.addEventListener('click', () => {
  chart.range = Number(tab.dataset.range);
  $$('.chart__tabs [data-range]').forEach((other) => other.setAttribute('aria-selected', String(other === tab)));
  renderChart();
}));

idle(renderChart);
onMarket(() => {
  chart.history[chart.history.length - 1].value = market.spot;
  if (!chart.hovering) renderChart();
});

/* ── Calculadora de tasación ───────────────────────────────────────────── */

const purity = $('#purity');
const weightInput = $('#weight');
const estimateEl = $('#estimateValue');
let shownEstimate = 0;

function readWeight() {
  return clamp(parseFloat(String(weightInput.value).replace(',', '.')) || 0, 0, 5000);
}

function calculateEstimate() {
  const fineness = Number(purity.value);
  const grams = readWeight();
  const value = grams * fineness * fineBuy();
  tween(estimateEl, shownEstimate, value, (v) => eur(v));
  shownEstimate = value;
  const gramsText = formatNumber(grams, Number.isInteger(grams) ? 0 : 1);
  $('#estimateFormula').textContent = `${gramsText} g × ${formatNumber(fineness, 3)} de ley × ${eur(fineBuy())}/g de oro fino`;
}

purity.addEventListener('change', calculateEstimate);
weightInput.addEventListener('input', calculateEstimate);
$$('[data-adjust]').forEach((button) => button.addEventListener('click', () => {
  weightInput.value = clamp(Math.round(readWeight() + Number(button.dataset.adjust)), 1, 5000);
  calculateEstimate();
}));

$('#calculatorForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const label = purity.options[purity.selectedIndex].text.replace(/ \(.*\)/, '');
  $('#contactReason').value = 'tasacion';
  $('#contactReason').dispatchEvent(new Event('change'));
  $('#contactMessage').value = `Estimación web: ${formatNumber(readWeight(), Number.isInteger(readWeight()) ? 0 : 1)} g de ${label} → ${estimateEl.textContent}.`;
  goTo('contacto');
  setTimeout(() => $('#contactName').focus({ preventScroll: true }), reduceMotion.matches ? 0 : 750);
  showToast('Estimación guardada. Elija día y hora para su tasación.');
});

calculateEstimate();
onMarket(calculateEstimate);

/* ── Ilustraciones de producto (SVG) ───────────────────────────────────── */

const fx = (n) => n.toFixed(2);
const pt = (p) => `${fx(p[0])},${fx(p[1])}`;
const MAPLE = 'M0-17 2.7-11.6 5.8-12.9 4.8-5.4 9.9-9.2 8.8-6.1 14.3-7.1 12.6-2.7 15.3-1.4 7.8 4.1 9.2 6.8 1.7 5.8 1 12.9.6 17.5h-1.2L-1 12.9-1.7 5.8-9.2 6.8-7.8 4.1-15.3-1.4-12.6-2.7-14.3-7.1-8.8-6.1-9.9-9.2-4.8-5.4-5.8-12.9-2.7-11.6z';
const CROWN = 'M-15 6-17-9l8.5 6.5L0-12l8.5 9.5L17-9l-2 15z';

/* Lingote acuñado: placa vertical pulida con marco en relieve. */
function mintedArt({ scale = 1, weight, serial }) {
  const u = scale;
  const w = 62 * u;
  const h = 100 * u;
  const x = 100 - w / 2;
  const y = 70 - h / 2;
  const inset = 5 * u;
  return `<svg viewBox="0 0 200 150" class="art" aria-hidden="true">
    <ellipse cx="104" cy="${fx(y + h + 5)}" rx="${fx(w * 0.9)}" ry="${fx(8 * u)}" fill="url(#g-shadow)"/>
    <g transform="rotate(-9 100 70)">
      <rect x="${fx(x + 2.6 * u)}" y="${fx(y + 3.2 * u)}" width="${fx(w)}" height="${fx(h)}" rx="${fx(5 * u)}" fill="#8f6a12"/>
      <rect x="${fx(x)}" y="${fx(y)}" width="${fx(w)}" height="${fx(h)}" rx="${fx(5 * u)}" fill="url(#g-bar-top)"/>
      <rect x="${fx(x + inset)}" y="${fx(y + inset)}" width="${fx(w - inset * 2)}" height="${fx(h - inset * 2)}" rx="${fx(3 * u)}" fill="none" stroke="#8a6612" stroke-opacity=".55" stroke-width="${fx(0.9 * u)}"/>
      <rect x="${fx(x + inset + 0.8 * u)}" y="${fx(y + inset + 0.8 * u)}" width="${fx(w - inset * 2)}" height="${fx(h - inset * 2)}" rx="${fx(3 * u)}" fill="none" stroke="#fff6d2" stroke-opacity=".7" stroke-width="${fx(0.7 * u)}"/>
      <g text-anchor="middle" font-family="Hanken Grotesk, sans-serif" fill="#735508">
        <text x="100" y="${fx(y + 19 * u)}" font-size="${fx(6.4 * u)}" font-weight="700" letter-spacing=".22em">AUREUM</text>
        <path d="m100 ${fx(y + 25 * u)} ${fx(2.6 * u)} ${fx(3.6 * u)}-${fx(2.6 * u)} ${fx(3.6 * u)}-${fx(2.6 * u)}-${fx(3.6 * u)}z"/>
        <text x="100" y="${fx(y + 52 * u)}" font-size="${fx(17 * u)}" font-family="EB Garamond, serif" font-weight="600">${weight}</text>
        <text x="100" y="${fx(y + 64 * u)}" font-size="${fx(5.4 * u)}" font-weight="700" letter-spacing=".2em">FINE GOLD</text>
        <text x="100" y="${fx(y + 72 * u)}" font-size="${fx(6.2 * u)}" font-weight="700" letter-spacing=".12em">999.9</text>
        <text x="100" y="${fx(y + 88 * u)}" font-size="${fx(4.6 * u)}" font-weight="600" letter-spacing=".14em" fill-opacity=".8">${serial}</text>
      </g>
      <path d="M${fx(x + 6 * u)} ${fx(y + 1.2 * u)}h${fx(w * 0.55)}" stroke="#fffbe6" stroke-opacity=".85" stroke-width="${fx(1.1 * u)}" stroke-linecap="round"/>
      <rect x="${fx(x)}" y="${fx(y)}" width="${fx(w)}" height="${fx(h)}" rx="${fx(5 * u)}" fill="url(#g-sheen)" opacity=".55"/>
    </g></svg>`;
}

/* Lingote fundido: bloque trapezoidal en perspectiva, grabado en la cara superior. */
function castArt({ scale = 1, lines }) {
  const L = 120 * scale;
  const D = 58 * scale;
  const dx = D * 0.6;
  const dy = -D * 0.74;
  const T = 19 * scale;
  const slope = 9 * scale;
  const depth = -dy;
  const yTop = 70 - (depth + T) / 2 + depth;
  const yBot = yTop + T;
  const x0 = 100 - (L + dx) / 2;
  const fl = [x0, yTop];
  const fr = [x0 + L, yTop];
  const bl = [x0 + dx, yTop + dy];
  const br = [x0 + L + dx, yTop + dy];
  const top = `M${pt(fl)}L${pt(fr)}L${pt(br)}L${pt(bl)}Z`;
  const front = `M${pt(fl)}L${pt(fr)}L${pt([fr[0] + slope, yBot])}L${pt([fl[0] - slope, yBot])}Z`;
  const side = `M${pt(fr)}L${pt(br)}L${pt([br[0] + slope, yBot + dy])}L${pt([fr[0] + slope, yBot])}Z`;
  const shear = -dx / depth;
  const matrix = `matrix(1 0 ${shear.toFixed(4)} 1 ${fx(bl[0])} ${fx(bl[1])})`;
  const sizes = lines.map((_, i) => (i === 1 ? 1.75 : i === 0 ? 1.05 : 0.8));
  const total = sizes.reduce((a, b) => a + b, 0);
  const unit = Math.min(depth / (total * 1.25 + 0.6), 8.5 * scale);
  let ty = (depth - total * unit * 1.25) / 2;
  const text = lines.map((t, i) => {
    const fs = sizes[i] * unit;
    ty += fs * 1.25;
    const font = i === 1 ? 'font-family="EB Garamond, serif" font-weight="600"' : 'font-weight="700" letter-spacing=".16em"';
    return `<text x="${fx(L / 2)}" y="${fx(ty - fs * 0.22)}" font-size="${fx(fs)}" ${font}>${t}</text>`;
  }).join('');
  return `<svg viewBox="0 0 200 150" class="art" aria-hidden="true">
    <ellipse cx="${fx(100 + slope / 2)}" cy="${fx(yBot + 4)}" rx="${fx(L * 0.66)}" ry="${fx(D * 0.32 + 5)}" fill="url(#g-shadow)"/>
    <path d="${side}" fill="url(#g-bar-side)"/>
    <path d="${front}" fill="url(#g-bar-front)"/>
    <path d="${top}" fill="url(#g-bar-top)"/>
    <path d="${top}" fill="none" stroke="#fff4c7" stroke-opacity=".75" stroke-width=".7"/>
    <path d="M${pt(fl)}L${pt(fr)}" stroke="#fff6d6" stroke-opacity=".9" stroke-width=".8"/>
    <g transform="${matrix}" text-anchor="middle" font-family="Hanken Grotesk, sans-serif">
      <g fill="#fff6cf" fill-opacity=".7" transform="translate(.45 .5)">${text}</g>
      <g fill="#765708">${text}</g>
    </g></svg>`;
}

/* Moneda de frente con canto, cordoncillo y leyenda circular. */
function coinArt({ tone = 'gold', small = false, legend, motif }) {
  const r = small ? 36 : 46;
  const red = tone === 'red';
  const ink = red ? '#6e3f0c' : '#6f520a';
  let center = '';
  if (motif === 'maple') {
    const s = small ? 0.9 : 1.15;
    center = `<path d="${MAPLE}" transform="translate(100 99) scale(${s})" fill="${ink}" fill-opacity=".85"/><path d="${MAPLE}" transform="translate(99.4 98.3) scale(${s})" fill="#fff2bd" fill-opacity=".32"/>`;
  } else if (motif === 'crown') {
    const s = small ? 0.95 : 1.2;
    center = `<path d="${CROWN}" transform="translate(100 101) scale(${s})" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="100" cy="${small ? 88.5 : 86}" r="1.6" fill="${ink}"/><path d="M${small ? 86 : 82} ${small ? 110 : 112}h${small ? 28 : 36}" stroke="${ink}" stroke-width="1.4"/>`;
  } else if (motif === 'organ') {
    center = [14, 20, 26, 31, 26, 20, 14].map((h, i) => `<rect x="${fx(88.2 + i * 3.5)}" y="${108 - h}" width="2.6" height="${h}" rx="1.3" fill="${ink}" fill-opacity=".82"/>`).join('') + `<path d="M86 110h28" stroke="${ink}" stroke-width="1.4"/>`;
  } else {
    center = `<text x="100" y="104" text-anchor="middle" font-family="EB Garamond, serif" font-weight="600" font-size="21" fill="${ink}">1 OZ</text><text x="100" y="114" text-anchor="middle" font-family="Hanken Grotesk, sans-serif" font-weight="700" font-size="5.2" letter-spacing=".22em" fill="${ink}">FYNGOUD</text>`;
  }
  return `<svg viewBox="0 0 200 150" class="art" aria-hidden="true">
    <ellipse cx="104" cy="${fx(74 + r * 0.92)}" rx="${fx(r * 0.95)}" ry="${fx(r * 0.22)}" fill="url(#g-shadow)"/>
    <g transform="translate(0 -30)">
      <circle cx="102.5" cy="103.5" r="${r}" fill="${red ? '#7a4610' : '#8a640e'}"/>
      <circle cx="100" cy="100" r="${r}" fill="url(#${red ? 'g-coin-red' : 'g-coin'})"/>
      <circle cx="100" cy="100" r="${r - 2.4}" fill="none" stroke="${ink}" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray=".1 3.1" stroke-linecap="round"/>
      <circle cx="100" cy="100" r="${r - 6}" fill="url(#${red ? 'g-coin-field-red' : 'g-coin-field'})" stroke="${ink}" stroke-opacity=".35" stroke-width=".8"/>
      <text font-family="Hanken Grotesk, sans-serif" font-weight="700" font-size="${small ? 6.2 : 7.4}" letter-spacing=".18em" fill="${ink}" fill-opacity=".9"><textPath href="#${small ? 'p-legend-s' : 'p-legend-l'}" startOffset="25%" text-anchor="middle">${legend}</textPath></text>
      ${center}
      <ellipse cx="88" cy="80" rx="${fx(r * 0.42)}" ry="${fx(r * 0.2)}" transform="rotate(-32 88 80)" fill="#fff" fill-opacity=".18"/>
    </g></svg>`;
}

/* ── Catálogo ───────────────────────────────────────────────────────────── */

const products = [
  { id: 'bar-10g', type: 'bar', name: 'Lingote 10 g', maker: 'Acuñado · refinería LBMA', fine: 9.999, purity: '999,9', premium: 0.075, stock: 'En stock', art: () => mintedArt({ scale: 0.95, weight: '10 g', serial: 'Nº 004821' }) },
  { id: 'bar-1oz', type: 'bar', name: 'Lingote 1 oz', maker: 'Acuñado · refinería LBMA', fine: 31.1004, purity: '999,9', premium: 0.048, stock: 'En stock', art: () => mintedArt({ scale: 1.18, weight: '1 oz', serial: 'Nº 018337' }) },
  { id: 'bar-100g', type: 'bar', name: 'Lingote 100 g', maker: 'Fundido · refinería LBMA', fine: 99.99, purity: '999,9', premium: 0.032, stock: 'En stock', art: () => castArt({ scale: 0.95, lines: ['AUREUM', '100 g', '999.9'] }) },
  { id: 'bar-250g', type: 'bar', name: 'Lingote 250 g', maker: 'Fundido · refinería LBMA', fine: 249.975, purity: '999,9', premium: 0.026, stock: 'Últimas 2 uds.', low: true, art: () => castArt({ scale: 1.05, lines: ['AUREUM', '250 g', '999.9'] }) },
  { id: 'coin-krugerrand', type: 'coin', name: 'Krugerrand 1 oz', maker: 'South African Mint', fine: 31.1035, purity: '916,7', premium: 0.045, stock: 'En stock', art: () => coinArt({ tone: 'red', legend: 'SOUTH AFRICA · 1 OZ', motif: 'oz' }) },
  { id: 'coin-maple', type: 'coin', name: 'Maple Leaf 1 oz', maker: 'Royal Canadian Mint', fine: 31.1035, purity: '999,9', premium: 0.05, stock: 'En stock', art: () => coinArt({ legend: 'CANADA · FINE GOLD', motif: 'maple' }) },
  { id: 'coin-philharmonic', type: 'coin', name: 'Filarmónica 1 oz', maker: 'Münze Österreich', fine: 31.1035, purity: '999,9', premium: 0.048, stock: 'En stock', art: () => coinArt({ legend: 'REPUBLIK ÖSTERREICH', motif: 'organ' }) },
  { id: 'coin-sovereign', type: 'coin', name: 'Soberano', maker: 'The Royal Mint', fine: 7.3224, purity: '916,7', premium: 0.07, stock: 'Últimas 5 uds.', low: true, art: () => coinArt({ tone: 'red', small: true, legend: 'SOVEREIGN · 22 CT', motif: 'crown' }) },
];
const byId = Object.fromEntries(products.map((p) => [p.id, p]));
const artCache = {};
const artFor = (product) => (artCache[product.id] ??= product.art());
const priceOf = (product) => product.fine * market.spot * (1 + product.premium);
const productGrid = $('#productGrid');

function renderProducts(filter = 'all') {
  productGrid.innerHTML = products
    .filter((p) => filter === 'all' || p.type === filter)
    .map((p, i) => `
      <article class="product" style="animation-delay:${i * 0.05}s">
        <div class="product__media">${artFor(p)}<span class="product__stock${p.low ? ' is-low' : ''}">${p.stock}</span></div>
        <div class="product__body">
          <p class="product__maker">${p.maker}</p>
          <h3 class="product__name">${p.name}</h3>
          <dl class="product__specs">
            <div><dt>Oro fino</dt><dd class="num">${formatNumber(p.fine, 2)} g</dd></div>
            <div><dt>Ley</dt><dd class="num">${p.purity} ‰</dd></div>
          </dl>
          <div class="product__foot">
            <div><span class="product__price num" data-price-for="${p.id}">${eur(priceOf(p))}</span><span class="product__note">IVA exento · oro de inversión</span></div>
            <button class="add-button" type="button" data-add="${p.id}" aria-label="Añadir ${p.name} a la cesta"><svg class="icon"><use href="#i-plus"/></svg></button>
          </div>
        </div>
      </article>`).join('');
}

idle(() => renderProducts());
onMarket(() => {
  $$('[data-price-for]').forEach((el) => setPrice(el, eur(priceOf(byId[el.dataset.priceFor])), market.direction));
});

$('#filterPills').addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  $$('#filterPills button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  renderProducts(button.dataset.filter);
});

/* ── Cesta de solicitud ─────────────────────────────────────────────────── */

const CART_KEY = 'aureum:cart:v2';
const cartDrawer = $('#cartDrawer');
const backdrop = $('#backdrop');
const openCartButton = $('#openCart');
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
let lastFocused = null;

let cart = (() => {
  const legacy = local.get('aureum:cart', null); // versión anterior: lista de ids
  const saved = local.get(CART_KEY, Array.isArray(legacy) ? legacy.reduce((acc, id) => ({ ...acc, [id]: (acc[id] || 0) + 1 }), {}) : {});
  return Object.fromEntries(Object.entries(saved).filter(([id, qty]) => byId[id] && qty > 0));
})();

const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
const cartTotal = () => Object.entries(cart).reduce((sum, [id, qty]) => sum + priceOf(byId[id]) * qty, 0);

function renderCart() {
  const entries = Object.entries(cart);
  $('#cartCount').textContent = cartCount();
  $('#cartTotal').textContent = eur(cartTotal());
  $('#cartItems').innerHTML = entries.length
    ? entries.map(([id, qty]) => {
      const p = byId[id];
      return `
        <div class="cart-item" data-id="${id}">
          <div class="cart-item__thumb">${artFor(p)}</div>
          <div>
            <div class="cart-item__top"><b>${p.name}</b><button type="button" data-remove="${id}" aria-label="Quitar ${p.name} de la cesta"><svg class="icon"><use href="#i-close"/></svg></button></div>
            <p class="cart-item__unit num">${eur(priceOf(p))} / ud.</p>
            <div class="cart-item__bottom">
              <div class="qty" role="group" aria-label="Cantidad de ${p.name}">
                <button type="button" data-qty="-1" data-id="${id}" aria-label="Quitar una unidad"><svg class="icon"><use href="#i-minus"/></svg></button>
                <output class="num" aria-live="polite">${qty}</output>
                <button type="button" data-qty="1" data-id="${id}" aria-label="Añadir una unidad"><svg class="icon"><use href="#i-plus"/></svg></button>
              </div>
              <strong class="cart-item__line num">${eur(priceOf(p) * qty)}</strong>
            </div>
          </div>
        </div>`;
    }).join('')
    : `<div class="drawer__empty"><span class="icon-tile"><svg class="icon"><use href="#i-bag"/></svg></span><b>Su cesta está vacía</b><p>Añada lingotes o monedas para solicitar una reserva sin compromiso.</p></div>`;
  local.set(CART_KEY, cart);
}

function openCart() {
  lastFocused = document.activeElement;
  cartDrawer.classList.add('open');
  cartDrawer.removeAttribute('inert');
  cartDrawer.setAttribute('aria-hidden', 'false');
  openCartButton.setAttribute('aria-expanded', 'true');
  backdrop.classList.add('show');
  document.body.classList.add('cart-open');
  setTimeout(() => $('#closeCart').focus(), 60);
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('inert', '');
  cartDrawer.setAttribute('aria-hidden', 'true');
  openCartButton.setAttribute('aria-expanded', 'false');
  backdrop.classList.remove('show');
  document.body.classList.remove('cart-open');
  lastFocused?.focus?.();
}

cartDrawer.setAttribute('inert', '');
openCartButton.addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
backdrop.addEventListener('click', closeCart);

cartDrawer.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const focusable = $$(FOCUSABLE, cartDrawer);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

productGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const product = byId[button.dataset.add];
  cart[product.id] = (cart[product.id] || 0) + 1;
  renderCart();
  openCartButton.classList.remove('bump');
  void openCartButton.offsetWidth;
  openCartButton.classList.add('bump');
  openCart(); // la propia cesta confirma el añadido
});

$('#cartItems').addEventListener('click', (event) => {
  const qtyButton = event.target.closest('[data-qty]');
  const removeButton = event.target.closest('[data-remove]');
  if (qtyButton) {
    const id = qtyButton.dataset.id;
    cart[id] = (cart[id] || 0) + Number(qtyButton.dataset.qty);
    if (cart[id] <= 0) delete cart[id];
    renderCart();
    ($(`[data-id="${id}"][data-qty="${qtyButton.dataset.qty}"]`, cartDrawer) || $('#closeCart')).focus();
  }
  if (removeButton) {
    delete cart[removeButton.dataset.remove];
    renderCart();
    ($('[data-remove]', cartDrawer) || $('#closeCart')).focus();
  }
});

$('#checkoutButton').addEventListener('click', () => {
  if (!cartCount()) {
    showToast('Añada al menos una pieza para continuar.', 'error');
    return;
  }
  const lines = Object.entries(cart).map(([id, qty]) => `${qty} × ${byId[id].name}`).join(', ');
  closeCart();
  $('#contactReason').value = 'compra';
  $('#contactReason').dispatchEvent(new Event('change'));
  $('#contactMessage').value = `Reserva: ${lines} (total orientativo ${eur(cartTotal())}).`;
  goTo('contacto');
  showToast('Indíquenos sus datos para preparar la reserva.');
});

idle(renderCart);
onMarket(() => {
  if (!cartCount()) return;
  $('#cartTotal').textContent = eur(cartTotal());
  $$('.cart-item', cartDrawer).forEach((row) => {
    const p = byId[row.dataset.id];
    $('.cart-item__unit', row).textContent = `${eur(priceOf(p))} / ud.`;
    $('.cart-item__line', row).textContent = eur(priceOf(p) * cart[p.id]);
  });
});

/* ── Cabecera, menú y navegación ───────────────────────────────────────── */

const header = $('.site-header');
const hero = $('.hero');
const menuButton = $('#menuButton');
const mobileMenu = $('#mobileMenu');

function placeMenu() {
  mobileMenu.style.setProperty('--menu-top', `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
}

function openMenu() {
  placeMenu();
  mobileMenu.classList.add('open');
  mobileMenu.removeAttribute('inert');
  mobileMenu.setAttribute('aria-hidden', 'false');
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', 'Cerrar menú');
  document.body.classList.add('menu-open');
}

function closeMenu() {
  mobileMenu.classList.remove('open');
  mobileMenu.setAttribute('inert', '');
  mobileMenu.setAttribute('aria-hidden', 'true');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menú');
  document.body.classList.remove('menu-open');
}

mobileMenu.setAttribute('inert', '');
menuButton.addEventListener('click', () => (mobileMenu.classList.contains('open') ? closeMenu() : openMenu()));
$$('a', mobileMenu).forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (mobileMenu.classList.contains('open')) placeMenu(); });

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (cartDrawer.classList.contains('open')) closeCart();
  else if (mobileMenu.classList.contains('open')) {
    closeMenu();
    menuButton.focus();
  }
});

/* Enlace activo según la sección visible */
const navLinks = new Map($$('.nav [data-nav]').map((link) => [link.dataset.nav, link]));
const spied = [...navLinks.keys()].map((id) => document.getElementById(id)).filter(Boolean);
if ('IntersectionObserver' in window) {
  const visible = new Set();
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id)));
    const current = spied.map((section) => section.id).find((id) => visible.has(id));
    navLinks.forEach((link, id) => link.classList.toggle('active', id === current));
  }, { rootMargin: '-45% 0px -50% 0px' });
  spied.forEach((section) => spy.observe(section));
}

/* ── Proceso anclado al scroll ─────────────────────────────────────────────
   La sección se fija mientras el visitante sigue desplazándose y cada tramo
   de scroll activa un paso. No intercepta la rueda: funciona igual con
   trackpad, teclado o pantalla táctil y nunca deja al usuario atrapado. */

const proc = {
  section: $('#proceso'),
  track: $('.process__track'),
  pin: $('.process__pin'),
  steps: $$('.step'),
  nav: $$('.process__nav li'),
  active: -1,
  pinned: false,
};
const tallEnough = window.matchMedia('(min-height: 540px)');

function setStep(index) {
  if (index === proc.active) return;
  proc.active = index;
  proc.steps.forEach((step, i) => {
    step.classList.toggle('is-active', i === index);
    step.classList.toggle('is-past', i < index);
  });
  proc.nav.forEach((item, i) => {
    item.classList.toggle('is-active', i === index);
    item.classList.toggle('is-done', i < index);
    const button = $('button', item);
    if (i === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  if (index === 1) weighPiece();
}

function processGeometry() {
  const total = proc.track.offsetHeight - proc.pin.offsetHeight;
  const top = proc.track.getBoundingClientRect().top + window.scrollY - header.offsetHeight;
  return { total, top };
}

function updateProcess() {
  if (!proc.pinned) return;
  const { total, top } = processGeometry();
  const progress = clamp((window.scrollY - top) / total, 0, 1);
  proc.section.style.setProperty('--p', progress.toFixed(4));
  proc.section.classList.toggle('is-started', progress > 0.02);
  setStep(Math.min(proc.steps.length - 1, Math.floor(progress * proc.steps.length)));
}

function evaluatePin() {
  const shouldPin = !reduceMotion.matches && tallEnough.matches;
  if (shouldPin === proc.pinned) return;
  proc.pinned = shouldPin;
  proc.section.classList.toggle('is-pinned', shouldPin);
  proc.active = -1;
  if (shouldPin) updateProcess();
}

proc.nav.forEach((item, i) => $('button', item).addEventListener('click', () => {
  if (!proc.pinned) return;
  const { total, top } = processGeometry();
  window.scrollTo({ top: top + total * ((i + 0.5) / proc.steps.length), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}));

/* Báscula del paso 2: la cifra «se asienta» como en una pesada real. */
function weighPiece() {
  const el = $('#scaleWeight');
  if (reduceMotion.matches) {
    el.textContent = '25,00';
    return;
  }
  const start = performance.now();
  cancelAnimationFrame(el.frame);
  const step = (now) => {
    const t = Math.min(1, (now - start) / 1400);
    const value = 25 * (1 - Math.pow(1 - t, 3)) + Math.sin(t * 14) * (1 - t) * 0.9;
    el.textContent = formatNumber(Math.max(0, value), 2);
    if (t < 1) el.frame = requestAnimationFrame(step);
    else el.textContent = '25,00';
  };
  el.frame = requestAnimationFrame(step);
}

/* Calendario del paso 1: dos semanas reales con la próxima cita disponible. */
idle(function renderMiniCalendar() {
  const now = madridNow();
  const today = civil(now.y, now.m, now.d);
  const monday = addDays(today, -((now.weekday + 6) % 7));
  let selected = addDays(today, 1);
  while (!HOURS[civilParts(selected).weekday].length) selected = addDays(selected, 1);
  const dows = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => `<span class="dow">${d}</span>`).join('');
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(monday, i);
    const { d, weekday } = civilParts(date);
    const off = date < today || !HOURS[weekday].length;
    const sel = date.getTime() === selected.getTime();
    return `<span class="${sel ? 'is-sel' : off ? 'off' : ''}">${d}</span>`;
  }).join('');
  $('#calGrid').innerHTML = dows + days;
  const month = dayLabel(selected, { month: 'long', year: 'numeric' });
  $('#calMonth').textContent = month.charAt(0).toUpperCase() + month.slice(1);
  $('#calOk').textContent = `Cita confirmada · ${dayLabel(selected, { weekday: 'short', day: 'numeric' })}, 11:00`;
});

/* ── Bucle de scroll (cabecera, progreso, botones flotantes, proceso) ── */

const whatsappFab = $('.whatsapp-fab');
const actionBar = $('#actionBar');
let scrollQueued = false;

function onScroll() {
  scrollQueued = false;
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  header.style.setProperty('--scroll', max > 0 ? (y / max).toFixed(4) : '0');
  header.classList.toggle('is-scrolled', y > 8);
  const heroBottom = hero.getBoundingClientRect().bottom;
  header.classList.toggle('is-dark', heroBottom > header.offsetHeight + 4);
  const pastHero = heroBottom < 0;
  whatsappFab.classList.toggle('show', pastHero);
  actionBar.classList.toggle('show', pastHero);
  updateProcess();
}

window.addEventListener('scroll', () => {
  if (!scrollQueued) {
    scrollQueued = true;
    requestAnimationFrame(onScroll);
  }
}, { passive: true });
window.addEventListener('resize', () => {
  evaluatePin();
  onScroll();
});
reduceMotion.addEventListener?.('change', evaluatePin);
tallEnough.addEventListener?.('change', evaluatePin);

requestAnimationFrame(() => {
  evaluatePin();
  onScroll();
});

/* ── Horario: abierto ahora ─────────────────────────────────────────────── */

function updateStoreStatus() {
  const now = madridNow();
  const minutes = now.h * 60 + now.min;
  const today = HOURS[now.weekday];
  const status = $('#storeStatus');
  const open = today.find(([from, to]) => minutes >= from && minutes < to);
  let text;
  if (open) {
    text = `Abierto ahora · cierra a las ${hhmm(open[1])}`;
  } else {
    const later = today.find(([from]) => minutes < from);
    if (later) {
      text = `Cerrado ahora · abre hoy a las ${hhmm(later[0])}`;
    } else {
      let offset = 1;
      while (!HOURS[(now.weekday + offset) % 7].length) offset += 1;
      const next = HOURS[(now.weekday + offset) % 7][0][0];
      const when = offset === 1 ? 'mañana' : dayLabel(addDays(civil(now.y, now.m, now.d), offset), { weekday: 'long' });
      text = `Cerrado ahora · abre ${when} a las ${hhmm(next)}`;
    }
  }
  status.classList.toggle('is-open', Boolean(open));
  $('#storeStatusText').textContent = text;
  $$('.hours tr[data-days]').forEach((row) => row.classList.toggle('is-today', row.dataset.days.split(',').map(Number).includes(now.weekday)));
}

idle(updateStoreStatus);
setInterval(updateStoreStatus, 60000);

/* ── Mapa (solo se carga Google Maps si el visitante lo pide) ──────────── */

$('#loadMap').addEventListener('click', () => {
  const iframe = document.createElement('iframe');
  iframe.src = 'https://maps.google.com/maps?q=Calle%20de%20Serrano%2048%2C%20Madrid&t=&z=16&ie=UTF8&output=embed';
  iframe.title = 'Mapa de la oficina de AUREUM en la Calle de Serrano, 48, Madrid';
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.allowFullscreen = true;
  $('#mapFrame').replaceChildren(iframe);
});

/* ── Formulario de contacto y reserva de cita ───────────────────────────── */

const contactForm = $('#contactForm');
const reason = $('#contactReason');
const slotPicker = $('#slotPicker');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[+]?[\d\s().-]{9,20}$/;
let appointment = null;

/* Próximos días con hueco: hoy (si queda horario) y los seis siguientes abiertos. */
function availableDays() {
  const now = madridNow();
  const today = civil(now.y, now.m, now.d);
  const days = [];
  for (let offset = 0; days.length < 6 && offset < 14; offset += 1) {
    const date = addDays(today, offset);
    const slots = slotsFor(date, offset === 0 ? now.h * 60 + now.min + 60 : 0);
    if (slots.length) days.push({ date, slots, isToday: offset === 0 });
  }
  return days;
}

function slotsFor(date, notBefore) {
  return HOURS[civilParts(date).weekday].flatMap(([from, to]) => {
    const list = [];
    for (let m = from; m <= to - 30; m += 30) if (m >= notBefore) list.push(m);
    return list;
  });
}

function renderSlotDays() {
  const days = availableDays();
  $('#slotDays').innerHTML = days.map(({ date, isToday }) => {
    const { y, m, d } = civilParts(date);
    const value = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const top = isToday ? 'Hoy' : dayLabel(date, { weekday: 'short' }).replace('.', '');
    return `<label class="chip"><input type="radio" name="day" value="${value}" /><span><small>${top}</small><b>${d}</b></span></label>`;
  }).join('');
  $('#slotTimes').innerHTML = '<p class="slots__empty">Elija un día para ver las horas disponibles.</p>';
  slotPicker.days = days;
}

function renderSlotTimes(value) {
  const day = slotPicker.days.find(({ date }) => {
    const { y, m, d } = civilParts(date);
    return value === `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  });
  $('#slotTimes').innerHTML = day.slots.map((minutes) => `<label class="chip"><input type="radio" name="time" value="${minutes}" /><span>${hhmm(minutes)}</span></label>`).join('');
}

slotPicker.addEventListener('change', (event) => {
  if (event.target.name === 'day') renderSlotTimes(event.target.value);
  if (event.target.name === 'time' || event.target.name === 'day') setError(slotPicker, '');
});

function updateSlotVisibility() {
  const show = reason.value === 'tasacion' || reason.value === 'cita';
  slotPicker.hidden = !show;
  $('legend span', slotPicker).textContent = reason.value === 'cita' ? '(obligatorio)' : '(opcional)';
}

reason.addEventListener('change', updateSlotVisibility);
idle(() => {
  renderSlotDays();
  updateSlotVisibility();
});

function setError(field, message) {
  const container = field.closest('.field') || field;
  const slot = $(`[data-error-for="${field.id}"]`, contactForm);
  container.classList.toggle('invalid', Boolean(message));
  if (field.matches('input, textarea')) field.setAttribute('aria-invalid', String(Boolean(message)));
  if (slot) slot.textContent = message || '';
  return !message;
}

function validateField(field) {
  const value = field.value?.trim?.() ?? '';
  switch (field.id) {
    case 'contactName': return setError(field, value.length < 2 ? 'Indíquenos su nombre.' : '');
    case 'contactPhone': return setError(field, PHONE_RE.test(value) ? '' : 'Introduzca un teléfono válido.');
    case 'contactEmail': return setError(field, EMAIL_RE.test(value) ? '' : 'Introduzca un email válido.');
    case 'contactConsent': return setError(field, field.checked ? '' : 'Debe aceptar la política de privacidad.');
    case 'slotPicker': {
      const day = $('input[name="day"]:checked', slotPicker);
      const time = $('input[name="time"]:checked', slotPicker);
      if (slotPicker.hidden) return true;
      if (reason.value === 'cita' && !(day && time)) return setError(field, 'Elija día y hora para su cita.');
      if (day && !time) return setError(field, 'Elija también una hora.');
      return setError(field, '');
    }
    default: return true;
  }
}

['contactName', 'contactPhone', 'contactEmail'].forEach((id) => {
  const input = $(`#${id}`);
  input.addEventListener('blur', () => validateField(input));
  input.addEventListener('input', () => { if (input.closest('.field').classList.contains('invalid')) validateField(input); });
});
$('#contactConsent').addEventListener('change', (event) => validateField(event.target));

contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = ['contactName', 'contactPhone', 'contactEmail', 'slotPicker', 'contactConsent'].map((id) => $(`#${id}`));
  const invalid = fields.filter((field) => !validateField(field));
  if (invalid.length) {
    (invalid[0].matches('fieldset') ? $('input', invalid[0]) : invalid[0])?.focus();
    showToast('Revise los campos marcados para continuar.', 'error');
    return;
  }
  const day = $('input[name="day"]:checked', slotPicker);
  const time = $('input[name="time"]:checked', slotPicker);
  appointment = !slotPicker.hidden && day && time ? { date: day.value, minutes: Number(time.value) } : null;
  const submit = $('.submit', contactForm);
  submit.classList.add('is-loading');
  // Punto de integración: aquí iría el envío al backend, CRM o servicio de formularios.
  setTimeout(() => {
    submit.classList.remove('is-loading');
    showSuccess($('#contactName').value.trim().split(/\s+/)[0]);
  }, reduceMotion.matches ? 0 : 900);
});

function showSuccess(name) {
  $('#successTitle').textContent = `Gracias, ${name}.`;
  const appt = $('#successAppt');
  if (appointment) {
    const [y, m, d] = appointment.date.split('-').map(Number);
    const label = dayLabel(civil(y, m, d), { weekday: 'long', day: 'numeric', month: 'long' });
    $('#apptDate').textContent = `${label.charAt(0).toUpperCase() + label.slice(1)}, a las ${hhmm(appointment.minutes)}`;
    $('#successText').textContent = 'Su cita queda reservada. Le enviaremos la confirmación por email y le llamaremos si hubiera cualquier cambio.';
  } else {
    $('#successText').textContent = 'Hemos recibido su solicitud. Le llamaremos en menos de 24 horas laborables.';
  }
  appt.hidden = !appointment;
  $('#icsButton').hidden = !appointment;
  contactForm.hidden = true;
  const panel = $('#formSuccess');
  panel.hidden = false;
  panel.focus({ preventScroll: true });
}

$('#newRequest').addEventListener('click', () => {
  contactForm.reset();
  $$('.field', contactForm).forEach((field) => field.classList.remove('invalid'));
  $$('.error', contactForm).forEach((slot) => { slot.textContent = ''; });
  renderSlotDays();
  updateSlotVisibility();
  $('#formSuccess').hidden = true;
  contactForm.hidden = false;
  $('#contactName').focus();
});

/* Cita descargable para cualquier calendario (.ics). */
function madridToUTC(y, m, d, minutes) {
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const shown = madridNow(new Date(guess));
  const offset = Date.UTC(shown.y, shown.m - 1, shown.d, shown.h, shown.min) - guess;
  return new Date(guess - offset);
}

$('#icsButton').addEventListener('click', () => {
  if (!appointment) return;
  const [y, m, d] = appointment.date.split('-').map(Number);
  const start = madridToUTC(y, m, d, appointment.minutes);
  const end = new Date(start.getTime() + 30 * 60000);
  const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AUREUM//Cita de tasacion//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@aureum.es`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    'SUMMARY:Cita de tasación · AUREUM',
    'LOCATION:Calle de Serrano\\, 48\\, 28001 Madrid',
    'DESCRIPTION:Traiga sus piezas y un documento de identidad en vigor (DNI\\, NIE o pasaporte).',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  link.download = 'cita-aureum.ics';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

/* ── Animaciones de entrada y contadores ───────────────────────────────── */

function animateCounters(row) {
  $$('[data-count]', row).forEach((node) => {
    const target = Number(node.dataset.count);
    const suffix = node.dataset.suffix || '';
    const final = formatNumber(target, 0) + suffix;
    if (document.hidden) {
      node.textContent = final;
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 1200);
      node.textContent = t < 1 ? formatNumber(Math.round(target * (1 - Math.pow(1 - t, 3))), 0) + suffix : final;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

if ('IntersectionObserver' in window && !reduceMotion.matches) {
  document.documentElement.classList.add('reveal-ready');
  const revealer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      if (entry.target.classList.contains('stats')) animateCounters(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  $$('.reveal').forEach((element) => revealer.observe(element));
}

/* ── Aviso de demo y consentimiento de cookies ─────────────────────────── */

const demoPill = $('#demoPill');
function showDemoPill() {
  if (CLEAN || session.get('aureum:demo-pill-hidden', false)) return;
  demoPill.hidden = false;
}
$('#demoPillClose').addEventListener('click', () => {
  demoPill.hidden = true;
  session.set('aureum:demo-pill-hidden', true);
});

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
  setTimeout(() => { cookieBanner.hidden = true; }, 400);
}

cookieBanner.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-cookie]')?.dataset.cookie;
  if (!choice) return;
  local.set(COOKIE_KEY, { choice, date: new Date().toISOString() });
  closeCookieBanner();
  showToast(choice === 'accept' ? 'Preferencias guardadas. Gracias.' : 'Solo usaremos las cookies necesarias.');
  setTimeout(showDemoPill, 900);
  // Punto de integración: cargar la analítica únicamente si choice === 'accept'.
});

$$('[data-open-cookies]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  openCookieBanner();
}));

if (location.hash === '#cookies') {
  history.replaceState(null, '', location.pathname + location.search);
  openCookieBanner();
} else if (!CLEAN && !local.get(COOKIE_KEY, null)) {
  setTimeout(openCookieBanner, 1200);
} else {
  setTimeout(showDemoPill, 1800);
}

/* ── Arranque del mercado ──────────────────────────────────────────────── */

setInterval(tick, 5000);
