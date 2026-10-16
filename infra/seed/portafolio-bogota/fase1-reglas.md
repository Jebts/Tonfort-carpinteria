# Fase 1 — Reglas de clasificación visual (para el agente)

Vas a clasificar imágenes del archivo histórico de la carpintería Tonfort para
construir su portafolio. Trabajas sobre **copia**, nunca muevas ni borres nada.

## Herramienta

Genera hojas de contacto (una imagen con varias fotos etiquetadas con un número):

```bash
# Escaneo compacto de una carpeta (hasta 24 fotos por hoja)
node infra/scripts/portafolio-contactos.mjs --scope "CLOSET/CLOSETS/JUAN QUIJANO" --prefijo TUGRUPO --batch 24 --cell 140 --cols 6

# Detalle de candidatas concretas (rutas separadas por |)
node infra/scripts/portafolio-contactos.mjs --solo "RUTA1|RUTA2|RUTA3" --prefijo TUGRUPO --batch 9 --cell 260 --cols 3
```

Cada hoja se guarda en `Carpinteria Antigua/organizado/lotes/TUGRUPO-NNN.png` y
junto a ella `TUGRUPO-NNN.txt` con el mapa `etiqueta -> ruta (tipo, fecha, WxH)`.
**Usa siempre `--prefijo TUGRUPO`** para no colisionar con otros agentes.

Lee la hoja con la herramienta de lectura de imágenes y clasifica cada foto.
El inventario ya está hecho: los duplicados exactos y las variantes de nombre ya
están excluidos, no los vas a ver.

## Reglas de negocio

- **1 proyecto = 1 mueble.** Dos muebles (mismo cliente, fecha o sesión) = dos proyectos.
- **Prioridad de agrupación:** carpeta de cliente + 1 fecha = 1 mueble; carpeta de
  fecha sin cliente = 1 mueble; mismo cliente en fechas distintas = muebles distintos,
  **salvo** que las fotos muestren el mismo mueble (mismo fondo, mismos módulos,
  misma madera) → 1 solo proyecto con fotos de las dos sesiones. Siempre confirma
  con la imagen.
- **Carpeta de tipo sin fecha** (`MESONES`, `PUERTAS CON PERFIL`, `BARRAS`…): si todas
  las fotos son el mismo mueble → 1 proyecto; si son muebles distintos → 1 por mueble,
  titulado por tipo + referencia.
- **Mismo mueble en carpetas distintas:** no crees proyecto duplicado; usa la carpeta
  canónica y anótalo en `nota`.
- **`orden` cronológico** (2016→2018) lo calcula el coordinador, no tú.

## Categoría (enum cerrado de 7)

`cocina`, `closet`, `mueble_tv`, `puerta`, `iluminacion`, `espacio_integral`, `otro`

Corrige el mapeo por carpeta con lo que se ve (hay cruces: `COSINAS/` contiene
`ESCRITORIO FLOTADO` y `REPISAS`; `OFICINA/` contiene baños). No existe categoría
`bano`: los muebles de baño son `otro`.

## Títulos

- Sin tildes ni `ñ`. Formato `<Tipo> <Cliente/referencia>`. Únicos.
- Vocabulario: Cocina · Closet · Vestier · Mueble TV · Biblioteca · Escritorio ·
  Meson · Barra · Cama · Mueble de bano · Sala de juntas · Stand · Bajo escalera ·
  Piano · Joyero · Mesa de centro · Repisas · Mueble flotado · Otro
- Con cliente: `Closet Johana Quinones`. Solo fecha: `Closet 2017-09`.

## Rol de cada foto

- **portada**: la mejor foto del mueble — nítida, bien encuadrada, se entiende de un
  vistazo, horizontal preferente.
- **galeria**: de 2 a 5 fotos en orden de narración: toma general → ángulo distinto →
  detalle constructivo (cajones, correderas, uniones) → contexto en la habitación.
  No repitas ángulos casi idénticos salvo que el proyecto solo tenga eso.
- Si solo hay **1 foto usable**: esa foto es `portada` **y** `galeria` (la misma ruta
  en ambos campos) y anota `nota: 1 foto`.
- Si hay 2–5 usables, la portada puede repetirse como primera de la galería solo si
  no hay otra general; si hay galería suficiente, la portada no se repite.

## Descartes (con motivo, uno de estos)

| Motivo | Cuándo |
|---|---|
| `marketing` | Stock/web ajeno (`venta-de-cocinas…`, `cocinas modernas en medellin`, `*_n.jpg`, nombres de facebook) |
| `plano` | Dibujo técnico, plano, lámina con letreros `A-1`/`B-2` |
| `captura` | Screenshot de web |
| `calidad` | Borrosa, subexpuesta, sobreexpuesta, encuadre inútil o redundante |
| `no-es-mueble` | Sala vacía, personas, materiales sueltos sin mueble |
| `duplicado` | Casi idéntica a otra que ya usaste (otro encuadre de la misma toma) |
| `video` | `.mp4` (fuera de alcance) |

Los archivos ya vienen pre-etiquetados por heurística (`tipo` en el .txt de la hoja):
`marketing` y `plano` suelen ser descarte directo, pero **comprueba con la imagen**:
un render limpio y atractivo de un mueble terminado es candidato normal aunque esté
en `RENDERS/`; una lámina técnica `A-1`/`B-2` es `plano`.

## Salidas (escríbelas aunque no termines, por carpeta)

`Carpinteria Antigua/organizado/parciales/TUGRUPO-clasificacion.csv`

```csv
ruta,proyecto,rol,motivo
CLOSET/CLOSETS/JOHANA QUINONES/IMG-20160925-WA0012.jpg,G03-P1,portada,
CLOSET/CLOSETS/JOHANA QUINONES/IMG-20160925-WA0013.jpg,G03-P1,galeria,
CLOSET/CLOSETS/JOHANA QUINONES/IMG-20160925-WA0014.jpg,G03-P1,descarte,duplicado
```

`Carpinteria Antigua/organizado/parciales/TUGRUPO-proyectos.csv`

```csv
id,titulo,categoria,cliente,fecha,descripcion,portada,galeria,origen,nota
G03-P1,Closet Johana Quinones,closet,Johana Quinones,2016-09-25,,RUTA_PORTADA,RUTA1;RUTA2,CLOSET/CLOSETS/JOHANA QUINONES,
```

- `fecha` en `YYYY-MM-DD` (de la carpeta o del nombre `IMG_YYYYMMDD_*`).
- `galeria` = rutas separadas por `;` (2–5, o 1 si es el caso de foto única).
- `origen` = carpetas de origen aportadas separadas por `;`.
- `descripcion` puede quedar vacía (no bloquea).
- `nota` para avisos al coordinador (mueble repetido en otra carpeta, 1 foto, dudas).

IDs de proyecto: `TUGRUPO-P1`, `TUGRUPO-P2`… en el orden que los crees.

## Al terminar

Además de los dos CSV parciales, devuelve en tu mensaje final un resumen:
nº de proyectos por categoría, nº de fotos usadas/descartadas, y cualquier proyecto
donde tengas dudas.
