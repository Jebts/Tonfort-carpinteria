# Medios de la página /sede

Fotos reales de la sede. Los originales que subió el usuario
(`16850a94-e132-4c00-83f5-03da21ace4f2.jpg`, en `fotos_proyectos_anttiguos/`) venían **rotados 90° en sentido antihorario**: los derivados
de este directorio ya están corregidos (rotados 90° horario con `sips -r 90` y
recortados al ratio que consume cada pieza).

| Archivo | Dimensiones | Uso |
|---|---|---|
| `hero-sede.png` | 1920 × 1080 (16:9) | Hero a sangre de pantalla completa en /sede |
| `video-poster.png` | 1920 × 1080 (16:9) | Poster del video de presentación |
| `video-taller.mp4` | 1920 × 1080, H.264 | Video del taller (loop, mudo) |
| `sede-mostrador.jpg` | 1600 × 1000 (16:10) | Foto ancha, sangre |
| `sede-sofa.jpg` | 1200 × 1500 (4:5) | Foto vertical, grid de 3 |
| `sede-escritorio.jpg` | 1200 × 1500 (4:5) | Foto vertical, grid de 3 |
| `sede-equipo.jpg` | 1200 × 1500 (4:5) | Foto vertical, grid de 3 |
| `sede-mostrador-espejo.jpg` | 1200 × 1200 (1:1) | Foto cuadrada, grid de 2 |
| `sede-herramientas.jpg` | 1200 × 1200 (1:1) | Foto cuadrada, grid de 2 |

Las 8 fotos del usuario están todas usadas: 1 hero + 1 poster del video + 6 en la
galería. El original `16850a94-e132-4c00-83f5-03da21ace4f2.jpg` (en
`fotos_proyectos_anttiguos/`) es el archivo sin procesar (≈12 MB) y no lo consume la app:
consérvalo fuera de `public/` si quieres reexportar otro recorte.

Para sumar fotos a la galería hacen falta originales nuevos: cada uno de los 8 ya
tiene su recorte, y un segundo recorte del mismo original repite la misma escena
(se probó: las franjas 4:5 alternas salen duplicadas o mal encuadradas). Los
originales cubren, en total, 4 escenas: mostrador con taburete de tronco
(hero + `sede-mostrador`), sofá y contraluz (`video-poster`), escritorio con laptop
y paneles azules (`sede-escritorio`, `sede-mostrador-espejo`), herramientas
(`sede-herramientas`), equipo (`sede-equipo`) y sala de plantas
(`sede-escritorio` usa otra franja del original del escritorio).

Los `alt` viven en `content/sede.ts` (`SEDE_HERO`, `SEDE_FOTOS`): descríbelo también
allí cuando cambies las imágenes.

Para reexportar desde un original:

```bash
sips -r 90 original.png --out tmp.png            # 90° horario: endereza la foto
sips -c 608 1080 --cropOffset 620 0 tmp.png --out hero-sede.png
```

**Atención:** la rotación es 90° **horario** (`-r 90`), no antihorario. Verifícalo con
una foto que tenga una persona de pie antes de reexportar.

El mapa de la sede es el embed de **Google Maps** de la ficha de Google Business
Profile de tonfort (`pb=…` con el Place ID `0x8ef4f561b920be33:0xc65ae35ceb171e9`),
no una vista por coordenadas: así la tarjeta muestra nombre, dirección y rutas.
Se copia tal cual del botón "Insertar mapa" del panel de Google; si la ficha se
mueve o se renombra, hay que volver a copiarlo. El botón "Cómo llegar" usa el
enlace corto de la misma ficha (`https://maps.app.goo.gl/LdPiH9VeyGJf4bieA`).

Las coordenadas (`SEDE_LAT`, `SEDE_LNG`) y la dirección viven en `lib/contact.ts`;
el iframe se pre-conecta y se monta desde `components/tonfort/sede-mapa.tsx`.
Son ya las coordenadas reales de la ficha, no una estimación.