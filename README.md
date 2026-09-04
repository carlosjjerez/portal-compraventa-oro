# AUREUM — portal de compraventa de oro

Maqueta funcional de un portal para un establecimiento de compraventa de oro y
metales preciosos. Es un sitio estático (HTML + CSS + JS, sin dependencias ni
build) pensado para enseñarse como ejemplo y para servir de base a la web real.

![Vista de la página principal](docs/preview.jpg)

**Demo en vivo:** <https://carlosjjerez.github.io/portal-compraventa-oro/>

## Cómo verlo

```bash
python -m http.server 4321
```

Y abrir <http://localhost:4321>. También hay una configuración lista en
`.claude/launch.json`.

## Estructura

| Fichero | Contenido |
| --- | --- |
| `index.html` | Página principal: hero, cotizaciones, calculadora, qué compramos, catálogo, proceso, seguridad, opiniones, FAQ, local y contacto. |
| `aviso-legal.html` | Aviso legal (LSSI-CE). |
| `privacidad.html` | Política de privacidad (RGPD / LOPDGDD). |
| `cookies.html` | Política de cookies con el detalle de cada una. |
| `styles.css` | Hoja de estilos única. |
| `app.js` | Toda la lógica de la página. |
| `assets/` | Imagen del hero, imagen Open Graph e iconos. |
| `site.webmanifest`, `robots.txt`, `sitemap.xml` | Metadatos del sitio. |
| `aurelian_standard/DESIGN.md` | Tokens del sistema de diseño original (Stitch). |

## Antes de publicar

Estos son los puntos que hay que sustituir por datos reales. Todos están
marcados como marcador de posición.

### 1. Datos de la empresa

Aparecen en las cuatro páginas y en el JSON-LD de `index.html`:

- Denominación social, CIF y datos del Registro Mercantil.
- Dirección, teléfono (`+34 910 000 000`) y correos (`hola@`, `privacidad@`).
- Número de WhatsApp: buscar `wa.me/34910000000`.
- Horarios, en el bloque «Visítenos», en el pie y en `openingHoursSpecification`.
- Coordenadas `geo` del JSON-LD y la dirección del mapa en `app.js`.
- **Dominio de despliegue.** Ahora apunta a
  `https://carlosjjerez.github.io/portal-compraventa-oro`, que es donde vive
  esta demo. Hay que sustituirlo por el dominio real en `canonical`, Open Graph,
  el JSON-LD, `robots.txt` y `sitemap.xml`.

### 1 bis. Pasar de demo a producción

Esta demo está deliberadamente **fuera de los buscadores**, porque publica un
CIF, una dirección y unas reseñas ficticias, y no conviene que eso acabe
indexado como si fuera un negocio real. Para levantar el bloqueo:

- Quitar la línea `<meta name="robots" content="noindex,nofollow" />` de las
  cuatro páginas (está marcada con un comentario `DEMO:`).
- En `robots.txt`, cambiar `Disallow: /` por `Allow: /`.

### 2. Contenido de ejemplo que hay que sustituir

- **Testimonios y valoración (4,8 sobre 312 reseñas).** Están marcados con un
  comentario `CONTENIDO DE EJEMPLO` en `index.html`. Deben reemplazarse por
  reseñas reales y verificables antes de publicar; publicar reseñas inventadas
  como si fueran auténticas es una práctica desleal sancionable.
- **Cifras del bloque de estadísticas** (`data-count`): años de actividad,
  operaciones formalizadas y plazo de respuesta.
- **Catálogo de productos**: el array `products` de `app.js`.
- **Textos legales**: son una base sólida y completa, pero deben revisarse por
  un asesor jurídico y ajustarse a la operativa real del establecimiento.

### 3. Integraciones pendientes

Los tres puntos están señalados en `app.js` con el comentario
`Punto de integración`:

- **Formulario de contacto** — hoy valida en cliente y muestra un aviso. Falta
  el `POST` al backend, CRM o servicio de formularios.
- **Consentimiento de cookies** — la decisión se guarda en `localStorage`
  (`aureum:cookies`). Falta cargar la analítica solo cuando la elección sea
  `accept`.
- **Cotizaciones** — hoy son un paseo aleatorio simulado a partir de 71,20 €/g.
  Falta conectar una fuente real de precio del oro y sustituir `updatePrices()`.
  El gráfico de 30 días se alimenta del mismo array `priceHistory`.

### 4. Caché de assets

`styles.css` y `app.js` se enlazan con `?v=N`. Hay que subir ese número en las
cuatro páginas cada vez que se despliegue un cambio, o los navegadores servirán
la versión antigua.

## Decisiones que conviene conocer

- **El mapa de Google no se carga solo.** Se muestra un marcador y solo se
  inserta el iframe si la persona pulsa «Cargar mapa», para no instalar cookies
  de terceros sin consentimiento.
- **Los precios son orientativos** y así se declara en el aviso legal: la web no
  presta asesoramiento financiero ni emite ofertas vinculantes.
- **Cumplimiento del sector**: los textos mencionan la Ley 10/2010 de prevención
  del blanqueo, el libro-registro y la identificación del vendedor, que son las
  obligaciones que más preguntan los clientes de este negocio.
- **Accesibilidad**: enlace de salto al contenido, foco visible, cajón de la
  cesta con foco atrapado y cierre con `Escape`, `inert` en lo que está oculto y
  respeto por `prefers-reduced-motion`.
- **Sin JavaScript** la página sigue siendo legible: las animaciones de entrada
  solo se activan si el propio JS marca `html.reveal-ready`.
