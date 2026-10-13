# AUREUM — portal de compraventa de oro

Web de demostración para un establecimiento de compraventa de oro y metales
preciosos, diseñada y desarrollada por **[DigiNet Software](https://diginetsoftware.es/)**,
creadores de ORONET. AUREUM es una marca ficticia: el proyecto sirve como
ejemplo del servicio de diseño web de DigiNet para tiendas del sector.

![Página principal de AUREUM](docs/preview.jpg)

**Demo en vivo:** <https://demo.diginetsoftware.es/>

## Qué incluye

| Bloque | Detalle |
| --- | --- |
| **Cotizaciones en directo** | Ticker de oro, plata, platino y paladio; tabla de compra y venta por quilates; gráfico de 7 días, 1 mes y 1 año con lectura punto a punto. |
| **Tasación online** | Calculadora por ley (24K a 9K) que enseña la fórmula: peso × ley × precio del oro fino. |
| **Catálogo de inversión** | Lingotes y monedas con ilustraciones propias en SVG y precios ligados a la cotización, que se actualizan solos. |
| **Cesta de reserva** | Cantidades, totales en vivo y persistencia entre visitas. |
| **Proceso animado** | La sección «Cómo funciona» se ancla al hacer scroll y avanza paso a paso con una mini interfaz de cada fase. |
| **Reserva de cita** | Días y horas reales según el horario de la tienda, confirmación y archivo `.ics` para cualquier calendario. |
| **Ficha de local** | Estado «Abierto ahora» calculado en hora de Madrid, horario del día resaltado y mapa ilustrado; Google Maps solo se carga si el visitante lo pide. |
| **Cumplimiento** | Aviso legal, privacidad y cookies con banner de consentimiento; textos alineados con la Ley 10/2010 y el Libro Registro policial. |
| **SEO local** | Datos estructurados `JewelryStore` y `FAQPage`, Open Graph con imagen propia, sitemap y manifest. |

## Calidad

- **Rendimiento:** sin frameworks ni dependencias. Imágenes AVIF y WebP con
  respaldo JPEG, fuentes alojadas en el propio sitio y trabajo no urgente
  aplazado tras el primer pintado. Lighthouse en escritorio: 100 de rendimiento.
- **Accesibilidad:** Lighthouse 100. Contraste AA en todos los textos, foco
  visible, enlace de salto, cesta con foco atrapado y cierre con `Escape`, y
  respeto por `prefers-reduced-motion` (el proceso se muestra como lista).
- **Privacidad:** ninguna petición a terceros al cargar la página. Ni fuentes
  de Google, ni mapas, ni analítica sin consentimiento.

## Cómo verla en local

```bash
python -m http.server 4321
```

Y abrir <http://localhost:4321>. Añadiendo `?clean` a la URL se ocultan el
aviso de cookies y la píldora de demo, útil para hacer capturas.

## Estructura

| Fichero | Contenido |
| --- | --- |
| `index.html` | Página principal. |
| `aviso-legal.html`, `privacidad.html`, `cookies.html` | Páginas legales. |
| `404.html` | Página de error para GitHub Pages. |
| `styles.css` | Hoja de estilos única, organizada por secciones y con tokens de diseño. |
| `app.js` | Toda la lógica, organizada por módulos. |
| `assets/` | Imágenes del hero (AVIF, WebP y JPEG), imagen Open Graph, iconos y `fonts/`. |
| `site.webmanifest`, `robots.txt`, `sitemap.xml` | Metadatos del sitio. |
| `aurelian_standard/` y carpetas `*_aureum/` | Diseño original exportado de Stitch. |

## Adaptarla a un cliente real

### 1. Datos de la empresa

Aparecen en las cuatro páginas y en el JSON-LD de `index.html`:

- Denominación social, CIF y datos del Registro Mercantil.
- Dirección, teléfono (`+34 910 000 000`) y correos (`hola@`, `privacidad@`).
- Número de WhatsApp: buscar `wa.me/34910000000`.
- Horarios: en el bloque «Visítenos», en el pie, en `openingHoursSpecification`
  y en la constante `HOURS` de `app.js`, que alimenta el estado «Abierto ahora»
  y los huecos de cita.
- Coordenadas `geo` del JSON-LD y dirección del mapa en `app.js`.

### 2. Contenido de ejemplo

- **Opiniones y valoración (4,8 sobre 312).** Están marcadas con el comentario
  `CONTENIDO DE EJEMPLO`. Hay que sustituirlas por opiniones reales y
  verificables: publicar reseñas inventadas como auténticas es una práctica
  desleal sancionable.
- **Cifras** del bloque de estadísticas (`data-count`).
- **Catálogo:** el array `products` de `app.js` (peso fino, ley y prima).
- **Textos legales:** son una base completa, pero debe revisarlos un asesor
  jurídico y ajustarlos a la operativa real.

### 3. Integraciones

Todos los puntos están marcados en `app.js` con el comentario
`Punto de integración`:

- **Cotizaciones:** hoy son simuladas. Hay que sustituir `tick()` por una fuente
  real; todo lo demás (ticker, tabla, gráfico, catálogo, calculadora y cesta)
  se recalcula solo a partir del objeto `market`.
- **Formularios:** validan en el navegador. Falta el envío al backend, al CRM o
  a un servicio de formularios.
- **Analítica:** cargarla solo cuando el consentimiento sea `accept`.

### 4. Pasar de demo a producción

Esta demo está fuera de los buscadores a propósito, porque publica datos
ficticios. Al desplegar en el dominio del cliente:

- Quitar `<meta name="robots" content="noindex,nofollow" />` de las páginas,
  marcado con el comentario `DEMO:`.
- En `robots.txt`, cambiar `Disallow: /` por `Allow: /`.
- Cambiar la URL `https://demo.diginetsoftware.es/` por
  el dominio real en `canonical`, Open Graph, JSON-LD y `sitemap.xml`.
- Cambiar el fichero `CNAME` por el dominio del cliente y revisar en `404.html`
  que `<base href>` apunte a la raíz del sitio (`/`).
- Sustituir el bloque de demo del pie por un crédito discreto («Diseño web:
  DigiNet Software») y retirar la píldora flotante (`#demoPill`).
- Subir el número de versión `?v=` de `styles.css` y `app.js` en cada despliegue.
