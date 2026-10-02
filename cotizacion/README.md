# Cotizador de Cortes — Taller de Carpintería

Aplicación web standalone para cotizar proyectos de carpintería a partir de los CSV que exporta el plugin **OpenCutList de SketchUp**. Calcula gasto de material, genera esquemas de corte (nesting) y exporta la cotización a Excel.

## Características

- Importación de múltiples CSV (modelos individuales + combinado)
- Cálculo automático de cantidades parcial y acumulada
- Motor de nesting guillotina con rotación y kerf
- Esquemas de corte visuales en SVG
- Gestión de precios y márgenes de ganancia
- Exportación a Excel con 4 hojas: Resumen, Detalle, Lista de Compra y Esquemas de Corte
- Persistencia de precios mediante JSON descargable (sin localStorage)
- Paleta de colores cálida tipo taller de madera

## Estructura del proyecto

```
cotizacion/
├── index.html              # HTML principal (módulos ES)
├── css/
│   └── style.css           # Estilos de la aplicación
├── js/
│   ├── state.js            # Estado global, constantes y utilidades
│   ├── packer.js           # Algoritmo guillotina + render SVG
│   ├── logic.js            # Lógica de negocio (recalcularTodo, piezas)
│   ├── ui.js               # Renderizado de tablas, cards y paneles
│   ├── csv.js              # Importación y parseo de archivos CSV
│   ├── export.js           # Descargas HTML/Excel/JSON
│   └── main.js             # Punto de entrada y eventos estáticos
└── Cotizador_Visual-2.html # Respaldo del HTML monolítico original
```

## Módulos

- `state.js`: Variables globales (`archivos`, `materiales`, `configTableros`, etc.), constantes (`TIPOS_VALIDOS`, `UNIDAD_POR_TIPO`, `TAMANOS_ESTANDAR`) y funciones utilitarias (`fmtMoney`, `fmtNum`, `limpiarNum`, `claveDe`, `hayCombinado`, `cssSafe`).
- `packer.js`: Motor de empaquetado `guillotinePack(piezas, sheetW, sheetH, kerf)` y generador de SVG `renderSheetSVG(bin, sheetW, sheetH)`.
- `logic.js`: `recalcularTodo()` reconstruye `materiales` preservando precios, notas y overrides manuales; `recolectarPiezasTablero()` extrae piezas desde los CSV para el packer.
- `ui.js`: `render()` arma cards + tabla principal + totales; `renderListaCompra()` arma la tabla de compra; `construirPanelCorte(nombre)` genera el panel inline del esquema de corte.
- `csv.js`: `handleFiles()` procesa archivos arrastrados o seleccionados; `renderFileList()` muestra la lista con tags toggle Individual/Combinado.
- `export.js`: `descargarEsquemas()`, `descargarPrecios()`, `exportarExcel()`, `guardarPrecios()` y `cargarPrecios()`.
- `main.js`: Event listeners estáticos (dropzone, margen, agregar material, botones de descarga).

## Formato de entrada CSV (OpenCutList)

- Separador `;`, encoding UTF-8 con BOM.
- Columnas usadas: `Tipo de material`, `Nombre del material`, `Cantidad`, `Longitud`, `Anchura`, `Area - final`, `Designación`.
- Tipos válidos: `Tablero`, `Canto`, `Liston`, `Accesorio`.

## Reglas de cálculo

- **Parcial**: suma de archivos marcados Individual.
- **Acumulada**: suma de archivos marcados Combinado.
- **Cantidad a comprar**: por defecto toma Acumulada si hay combinado, si no Parcial. El usuario puede sobrescribirla manualmente; una vez editada, se marca `manual: true` y no se recalcula automáticamente.

## Cómo probar

1. Abrí una terminal en la carpeta `cotizacion/`.
2. Ejecutá un servidor HTTP local (por ejemplo):
   ```bash
   python3 -m http.server 8080
   ```
3. Abrí el navegador en `http://localhost:8080/`.
4. Arrastrá los CSV de OpenCutList a la zona de importación.
5. Revisá las tarjetas de gasto, ajustá precios y margen, generá esquemas de corte y exportá la cotización.

## Notas técnicas

- No usa `localStorage` ni `sessionStorage`; la persistencia es solo por exportación/importación de `.json`.
- El motor de corte es una implementación heurística tipo guillotina con best-area-fit y rotación permitida. No es el motor C++ real de OpenCutList, pero da una aproximación razonable para uso en taller.
- El formato de moneda es `es-CO` sin decimales. Las cantidades usan 2 decimales.
