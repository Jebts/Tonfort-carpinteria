# Medios de la página /sede

Estos archivos son **placeholders** derivados de imágenes del proyecto. Cámbialos
por material real del taller.

| Archivo | Dimensiones objetivo | Uso |
|---|---|---|
| `hero.png` | 2400 × 1350 | Hero a sangre de la portada |
| `poster-taller.mp4` → `poster-taller.png` | 2400 × 1350 | Poster del video de presentación |
| `video-taller.mp4` | 1920 × 1080, H.264 | Video del taller (loop, mudo) |
| `foto-1.jpg` | 1600 × 2000 | Foto ancha, sangre |
| `foto-2.jpg` | 1600 × 2000 | Foto cuadrada, grid |
| `foto-3.jpg` | 1600 × 2000 | Foto cuadrada, grid |

Los `alt` viven en `content/sede.ts` (`SEDE_FOTOS`): descríbelo también allí cuando
cambies las imágenes.

Los datos de contacto reales (dirección, teléfono, coordenadas, `pb=` del embed de
Maps) van en `SEDE` dentro de `lib/contact.ts`. Ese archivo tiene marcadores `<...>`
que bloquean el cierre de la fase.