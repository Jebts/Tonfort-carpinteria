# Reinit reproducible y set base del portafolio de Bogotá

## Qué es

`npm run db:reinit` es un **único comando** que:

1. **Verifica** que el entorno esté listo (variables, esquema BD, set base de archivos, servidor).
2. **Hace snapshot** del estado actual de la BD a `/tmp/tonfort-pre-reinit-<iso>/` (conteos + CSV de proyectos + visores landing).
3. **Resetea** la BD (`TRUNCATE` vía RPC o borrado fila a fila) y siembra el *seed demo* (3 usuarios, 5 clientes, 6 proyectos Santa Marta, productos, propuestas, animaciones, 2 modalidades, 48 citas).
4. **Arranca** `next dev` en un puerto libre si no hay servidor respondiendo (y lo mata al terminar).
5. **Carga** los **190 proyectos del portafolio histórico de Bogotá** con sus fotos (idempotente: una segunda pasada no crea ni cambia nada).
6. **Verifica** con aserciones estrictas que todo cuadra (conteos, portada, slugs, categorías, galería, ficha pública, check-tables).

El set base (manifest + 190 carpetas = 298 MB) vive versionado en `infra/seed/portafolio-bogota/`. El archivo crudo del que salió (2,4 GB en `Carpinteria Antigua/`) quedó fuera del repo.

---

## De dónde salió el set base

El manifiesto (`manifest.csv`) y las fotos organizadas (`NNN-slug/portada.jpg` + galería `00.jpg`…) provinieron del directorio `Carpinteria Antigua/organizado/` tras un proceso de inventario, deduplicación y clasificación (ver `docs/11_manifiesto_portafolio.md` y `infra/seed/portafolio-bogota/fase1-reglas.md`). El manifiesto tiene 190 filas, todas con `estado=pendiente`, y las carpetas corresponden 1:1.

---

## Cómo regenerar el set base

1. Tener la carpeta cruda (`Carpinteria Antigua/` con los originales).
2. Ejecutar los scripts de staging (ahora archivados en `/Users/jebts/Documents/Proyects/tonfort-archivo/scripts-staging/`) para producir `organizado/manifest.csv` y las 190 carpetas `NNN-slug/`.
3. Mover `organizado/` a `infra/seed/portafolio-bogota/`.
4. `git add infra/seed/portafolio-bogota` → commit único.
5. Los CSV de staging (`inventario.csv`, `clasificacion.csv`, `dedup.csv`, `descartes.csv`, `proyectos.csv`, `manifest.estado.csv`) son derivados y **no** se versionan (están en `.gitignore`).

---

## El comando `npm run db:reinit`

```
node infra/scripts/reinit.mjs [--seco] [--solo-cargar] [--sin-servidor]
                               [--desde N] [--solo <slug>]
                               [--modo-portada unica|duplicada]
                               [--origen URL] [--snapshot ruta]
```

| Flag | Qué hace |
|---|---|
| `--seco` | Solo preflight (lee BD, comprueba set base, no escribe nada). |
| `--solo-cargar` | Salta el TRUNCATE y el seed demo; carga Bogotá sobre la BD actual (para probar idempotencia). |
| `--sin-servidor` | No levanta `next dev`; exige que `--origen` ya responda. |
| `--desde N` | Solo proyectos con `orden >= N` (útil para reanudar). |
| `--solo <slug>` | Solo ese proyecto. |
| `--modo-portada` | `unica` (por defecto, sin repetir la portada) o `duplicada` (legacy). |
| `--origen` | URL base del servidor (por defecto `http://localhost:3000`). |
| `--snapshot` | Directorio donde volcar el snapshot previo (por defecto `/tmp/tonfort-pre-reinit-<iso>/`). |

### Variables de entorno requeridas

- `CARPINTERIA_SUPABASE_URL`
- `CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `INITIAL_ADMIN_PASSWORD`

`SUPABASE_ACCESS_TOKEN` **no** es obligatorio: si falta, el reset usa borrado fila a fila (más lento pero correcto). `INITIAL_ADMIN_USUARIO` por defecto `admin@tonfort.local`.

### Puertos y servidor

Si `ORIGEN` no responde y no se pasa `--sin-servidor`, el orquestador busca un puerto libre (`net.createServer().listen(0)`), lanza `npx next dev -p <puerto>`, hace polling cada 1 s (máx. 90 s) contra `/api/public/portafolio/proyectos` hasta 200, y **siempre mata el proceso hijo al terminar** (éxito, error o `SIGINT`/`SIGTERM`).

---

## Dos modos de portada

El cargador sube `portada.jpg` + los archivos de la galería del manifiesto (`00.jpg`, `01.jpg`…).

| Modo | Comportamiento | Filas en `proyectos_fotos` |
|---|---|---|
| `unica` (por defecto) | Omite las fotos de galería que son **la misma imagen** (mismo tamaño + hash SHA-1) que `portada.jpg`. | **550** (190 portadas + 360 galería real) |
| `duplicada` | Legacy: sube todo, aunque `00.jpg` sea idéntica a `portada.jpg`. | **594** (190 + 404) |

El número exacto se calcula **en tiempo de ejecución** desde el manifiesto (`conteoEsperado()` en `portafolio-paths.mjs`), no se escribe a palo. En el manifiesto actual hay **44** fotos de galería idénticas a su portada, por eso 594 − 44 = 550.

El verificador (`reinit-verificar.mjs`) usa la misma función, así que si el manifiesto cambia, la verificación cambia con él.

---

## Prueba de idempotencia (dos pasadas)

1. `npm run db:reinit` → verificador en verde (190 creados, 550 fotos).
2. `npm run db:reinit -- --solo-cargar` sobre la BD ya cargada → **0 creados, 0 fotos subidas, 0 PATCH, 190 skips**, verificador en verde con los mismos conteos.
3. (Opcional) Un tercer `npm run db:reinit` completo: el estado final es idéntico al de la pasada 1 salvo por los `id` (UUID nuevos) y las URLs de storage.

---

## Checklist de verificación (lo que aserta `reinit-verificar.mjs`)

| Comprobación | Esperado |
|---|---|
| Proyectos `sede=bogota` publicados | 190 |
| Proyectos `sede=santa_marta` (seed demo) | 6, publicados 4 |
| Filas en `proyectos_fotos` | 550 (`unica`) · 594 (`duplicada`) |
| Proyectos sin `portada_url` | 0 |
| Slugs duplicados o con sufijo `-N` | 0 |
| Proyectos del manifiesto ausentes del panel | 0 |
| Reparto por categoría | `otro:59`, `cocina:52`, `closet:47`, `mueble_tv:12`, `espacio_integral:11`, `puerta:9` |
| Ficha pública de 8 proyectos al azar | 200 y ≥ 1 foto |
| `GET /portafolio` | 200 |
| `npm run db:check` (check-tables) | sin faltantes |

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El TRUNCATE borra datos reales sin retorno | Snapshot previo a `/tmp` + `--seco` para probar. |
| Alguien ejecuta `portafolio-limpiar-staging` y destruye el set base | El script se borró. |
| Un slug divergente genera una línea de duplicados | Fallo duro en el cargador (aborta la pasada). |
| Objetos huérfanos que crecen en el bucket `portafolio-imagenes` | Solo se informan; limpieza manual si se decide. |
| El commit de 298 MB engorda el repo | Es la decisión tomada; va en un único commit aislado. |
| El reinit depende de un servidor HTTP | El orquestador lo arranca y lo mata; `--sin-servidor` para CI. |
| El seed demo siembra propuestas sin vídeo | Corregido (claves semánticas + fail-fast). |

---

## Fuera de alcance

- Crear clientes en BD a partir de la columna `cliente` del manifiesto (los proyectos históricos se crean sin `cliente_id`).
- Publicar el módulo 3D / visores en los proyectos de Bogotá (la sede es histórica: `lib/portfolio-service.ts:132-134`).
- Rediseñar el panel de portafolio o el contrato de la API.