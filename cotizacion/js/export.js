import { materiales, resultadosCorte, configTableros, piezasPorMaterial, indefinidos, margen, preciosGuardados, hayCombinado, UNIDAD_POR_TIPO, fmtMoney, fmtNum, claveDe } from './state.js';
import { renderSheetSVG } from './packer.js';

export function descargarEsquemas(){
  const nombres = Object.keys(resultadosCorte);
  if(!nombres.length){ alert('Aún no has generado ningún esquema de corte (usa el ícono 🪚 en la tabla de materiales).'); return; }
  let body = '';
  nombres.forEach(nombre => {
    const bins = resultadosCorte[nombre];
    const cfg = configTableros[nombre];
    body += `<h2>${nombre} — lámina ${cfg.sheetW}x${cfg.sheetH}mm (kerf ${cfg.kerf}mm) — ${bins.length} lámina(s)</h2><div class="sheets">`;
    bins.forEach((bin,i) => { body += `<div class="sheet"><div class="t">Lámina ${i+1} de ${bins.length}</div>${renderSheetSVG(bin, cfg.sheetW, cfg.sheetH)}</div>`; });
    body += `</div>`;
  });
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Esquemas de corte</title>
  <style>
    body{font-family:Arial,sans-serif;padding:20px;color:#2A2420;}
    h1{margin-bottom:4px;} .fecha{color:#6B615A;font-size:13px;margin-bottom:24px;}
    h2{font-size:16px;margin-top:30px;border-bottom:2px solid #A8703F;padding-bottom:6px;}
    .sheets{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;}
    .sheet{border:1px solid #E1D9CB;border-radius:6px;padding:8px;page-break-inside:avoid;}
    .sheet .t{font-size:11px;color:#6B615A;text-align:center;margin-bottom:6px;}
    @media print{ .sheet{ page-break-inside: avoid; } }
  </style></head><body>
  <h1>Esquemas de corte</h1><div class="fecha">Generado ${new Date().toLocaleDateString('es-CO')}</div>${body}
  </body></html>`;
  const blob = new Blob([html], {type:'text/html'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Esquemas_de_Corte.html'; a.click();
}

export function descargarPrecios(){
  const ordenados = Object.values(materiales).sort((a,b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre));
  const filas = [["Material","Tipo","Unidad","Precio unitario","Nota / Fuente"]];
  ordenados.forEach(m => filas.push([m.nombre, m.tipo, UNIDAD_POR_TIPO[m.tipo], m.precio||0, m.nota||'']));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws['!cols'] = [{wch:40},{wch:12},{wch:10},{wch:16},{wch:45}];
  XLSX.utils.book_append_sheet(wb, ws, "Lista de Precios");
  XLSX.writeFile(wb, "Lista_de_Precios.xlsx");
}

export function exportarExcel(){
  const proyecto = document.getElementById('inProyecto').value || 'Proyecto sin nombre';
  const cliente = document.getElementById('inCliente').value || '—';
  const numero = document.getElementById('inNumero').value || '—';
  const fecha = new Date().toLocaleDateString('es-CO');
  const combinado = hayCombinado();

  const ordenados = Object.values(materiales).sort((a,b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre));
  let totalSinMargen = 0;

  const detalle = [["Tipo","Material","Unidad","Parcial","Acumulada","Cantidad a comprar","Precio unitario","Nota","Subtotal","Subtotal c/margen"]];
  ordenados.forEach(m => {
    const cantidad = m.cantidadFinal || 0;
    const subtotal = cantidad * (m.precio||0);
    totalSinMargen += subtotal;
    detalle.push([m.tipo, m.nombre, UNIDAD_POR_TIPO[m.tipo],
      Number((m.parcial||0).toFixed(3)), Number((m.acumulada||0).toFixed(3)), Number(cantidad.toFixed(3)),
      m.precio||0, m.nota||'', Math.round(subtotal), Math.round(subtotal*(1+margen/100))]);
  });
  const totalConMargen = totalSinMargen * (1+margen/100);
  detalle.push(["", "", "", "", "", "", "", "TOTAL", Math.round(totalSinMargen), Math.round(totalConMargen)]);

  const resumen = [
    ["COTIZACIÓN", proyecto], [],
    ["Cliente", cliente], ["N.° de cotización", numero], ["Fecha", fecha], [],
    ["Margen de ganancia aplicado", margen.toFixed(1) + "%"], [],
    ["Total sin margen", Math.round(totalSinMargen)],
    ["Total con margen (precio a cobrar)", Math.round(totalConMargen)], [],
    ["Rango a presentar al cliente", `${fmtMoney(totalSinMargen)} — ${fmtMoney(totalConMargen)}`],
  ];
  if(indefinidos.size){
    resumen.push([]); resumen.push(["Piezas sin tipo de material asignado (revisar, no incluidas en el total)"]);
    [...indefinidos].forEach(d => resumen.push(["", d]));
  }

  const wb = XLSX.utils.book_new();
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{wch:48},{wch:26}];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalle);
  wsDetalle['!cols'] = [{wch:12},{wch:38},{wch:9},{wch:12},{wch:12},{wch:16},{wch:14},{wch:32},{wch:14},{wch:16}];
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle");

  const compra = [["Material","Tipo","A comprar","Unidad","Precio unitario","Subtotal","Subtotal c/margen","Nota"]];
  ordenados.forEach(m => {
    const cantidad = m.cantidadFinal || 0;
    const unidad = m.tipo === 'Tablero' ? 'láminas' : UNIDAD_POR_TIPO[m.tipo];
    const precio = m.precio || 0;
    const subtotal = cantidad * precio;
    const subConMargen = subtotal * (1 + margen / 100);
    let nota;
    if (m.addedManually) nota = 'agregado manualmente';
    else if (m.tipo === 'Tablero' && resultadosCorte[m.nombre]) nota = 'según esquema de corte';
    else nota = combinado ? 'según archivo combinado' : 'suma de individuales';
    compra.push([m.nombre, m.tipo, Math.round(cantidad), unidad, precio, Math.round(subtotal), Math.round(subConMargen), nota]);
  });
  const wsCompra = XLSX.utils.aoa_to_sheet(compra);
  wsCompra['!cols'] = [{wch:38},{wch:12},{wch:14},{wch:10},{wch:14},{wch:14},{wch:16},{wch:34}];
  XLSX.utils.book_append_sheet(wb, wsCompra, "Lista de Compra");

  const esquemas = [["Material","Lámina (mm)","Kerf (mm)","Piezas","Láminas necesarias","Aprovechamiento %"]];
  Object.keys(resultadosCorte).forEach(nombre => {
    const bins = resultadosCorte[nombre];
    const cfg = configTableros[nombre];
    const piezas = piezasPorMaterial[nombre] || [];
    const areaLamina = cfg.sheetW * cfg.sheetH;
    const areaUsada = piezas.reduce((s,p) => s + p.w*p.h, 0);
    const aprovechamiento = bins.length ? (areaUsada / (areaLamina*bins.length) * 100) : 0;
    esquemas.push([nombre, `${cfg.sheetW}x${cfg.sheetH}`, cfg.kerf, piezas.length, bins.length, Number(aprovechamiento.toFixed(1))]);
  });
  const wsEsquemas = XLSX.utils.aoa_to_sheet(esquemas);
  wsEsquemas['!cols'] = [{wch:38},{wch:14},{wch:10},{wch:10},{wch:18},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsEsquemas, "Esquemas de Corte");

  XLSX.writeFile(wb, `Cotizacion_${proyecto.replace(/[^a-zA-Z0-9]+/g,'_')}.xlsx`);
}

export function guardarPrecios(){
  const data = {};
  Object.entries(materiales).forEach(([clave, m]) => { if(m.precio) data[clave] = m.precio; });
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Precios_Maestros.json'; a.click();
}

export function cargarPrecios(file){
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      let precios = {};
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.tipo && item.nombre && item.precio !== undefined) {
            precios[claveDe(item.tipo, item.nombre)] = Number(item.precio);
          }
        });
      } else if (data && typeof data === 'object') {
        precios = data;
      }
      Object.keys(preciosGuardados).forEach(k => delete preciosGuardados[k]);
      Object.assign(preciosGuardados, precios);
      Object.entries(preciosGuardados).forEach(([clave, precio]) => { if(materiales[clave]) materiales[clave].precio = precio; });
      const info = document.getElementById('preciosCargadosInfo');
      if(info) info.textContent = `${Object.keys(preciosGuardados).length} precio(s) cargado(s)`;
      render();
    } catch(err){ alert('No pude leer ese archivo de precios.'); }
  };
  reader.readAsText(file);
}

export function aplicarPreciosGuardados(){
  Object.entries(preciosGuardados).forEach(([clave, precio]) => {
    if(materiales[clave]) materiales[clave].precio = precio;
  });
  render();
}

export function limpiarPreciosGuardados(){
  Object.keys(preciosGuardados).forEach(k => delete preciosGuardados[k]);
  const info = document.getElementById('preciosCargadosInfo');
  if(info) info.textContent = '0 precio(s) cargado(s)';
}

export function descargarReporteCompra(){
  const ordenados = Object.values(materiales).sort((a,b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre));
  const n = ordenados.length;

  let totalSM = 0, totalCM = 0, maxSM = 0, minSM = Infinity;
  let maxNombre = '', minNombre = '', sumPrecio = 0, cntPrecio = 0;
  ordenados.forEach(m => {
    const cantidad = m.cantidadFinal || 0;
    const precio = m.precio || 0;
    const sm = cantidad * precio;
    const cm = sm * (1 + margen / 100);
    totalSM += sm; totalCM += cm;
    if (sm > maxSM){ maxSM = sm; maxNombre = m.nombre; }
    if (sm > 0 && sm < minSM){ minSM = sm; minNombre = m.nombre; }
    if (precio > 0){ sumPrecio += precio; cntPrecio++; }
  });
  if (minSM === Infinity){ minSM = 0; minNombre = '—'; }

  const lastDataRow = 1 + n;

  const detalle = [["Material","Tipo","Unidad","Cantidad a comprar","Precio unitario","Subtotal sin margen","Subtotal c/margen","Nota / Fuente","% del total"]];
  ordenados.forEach(m => {
    const cantidad = m.cantidadFinal || 0;
    const precio = m.precio || 0;
    const sm = cantidad * precio;
    const cm = sm * (1 + margen / 100);
    const unidad = m.tipo === 'Tablero' ? 'láminas' : UNIDAD_POR_TIPO[m.tipo];
    let nota;
    if (m.addedManually) nota = 'agregado manualmente';
    else if (m.tipo === 'Tablero' && resultadosCorte[m.nombre]) nota = 'según esquema de corte';
    else nota = hayCombinado() ? 'según archivo combinado' : 'suma de individuales';
    detalle.push([m.nombre, m.tipo, unidad, cantidad, precio, sm, cm, nota, { f: `=IF(SUM(H2:H${lastDataRow})=0,0,F2/F${lastDataRow})*100`, t: 'n' }]);
  });

  const wb = XLSX.utils.book_new();

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalle);
  wsDetalle['!cols'] = [{wch:40},{wch:12},{wch:10},{wch:16},{wch:14},{wch:16},{wch:16},{wch:34},{wch:12}];
  wsDetalle['!rows'] = Array.from({ length: lastDataRow + 1 }, () => ({ hpt: 13 }));
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle de Materiales");

  const resumen = [
    ["RESUMEN DE COMPRA", ""],
    ["Fecha", new Date().toLocaleDateString('es-CO')],
    ["Margen de ganancia", margen.toFixed(1) + "%"],
    [],
    ["Concepto","Valor"],
    ["Total de materiales", n],
    ["Total sin margen", totalSM],
    ["Total con margen (a cobrar)", totalCM],
    ["Material más caro", maxNombre + ' (' + fmtMoney(maxSM) + ')'],
    ["Material más barato", minNombre !== '—' ? minNombre + ' (' + fmtMoney(minSM) + ')' : '—'],
    ["Promedio de precio unitario", cntPrecio ? sumPrecio / cntPrecio : 0],
    [],
    ["Concepto","Fórmula (referencia Detalle de Materiales)"],
    ["Total sin margen", { f: "=SUM('Detalle de Materiales'!F2:F" + lastDataRow + ")", t: "n" }],
    ["Total c/margen (fórmula)", { f: "=SUM('Detalle de Materiales'!G2:G" + lastDataRow + ")*(1+" + (margen/100) + ")", t: "n" }],
    ["Promedio precio unitario (fórmula)", { f: "=AVERAGE('Detalle de Materiales'!E2:E" + lastDataRow + ")", t: "n" }],
    ["Precio máximo (fórmula)", { f: "=MAX('Detalle de Materiales'!F2:F" + lastDataRow + ")", t: "n" }],
    ["Precio mínimo (fórmula)", { f: "=MIN('Detalle de Materiales'!F2:F" + lastDataRow + ")", t: "n" }],
    ["Cantidad total (fórmula)", { f: "=SUM('Detalle de Materiales'!D2:D" + lastDataRow + ")", t: "n" }],
    ["Total sin margen (fórmula)","=SUM('Detalle de Materiales'!F2:F" + lastDataRow + ")"],
    ["Total c/margen (fórmula)","=SUM('Detalle de Materiales'!G2:G" + lastDataRow + ")"],
    ["Promedio precio unitario (fórmula)","=AVERAGE('Detalle de Materiales'!E2:E" + lastDataRow + ")"],
    ["Precio máximo (fórmula)","=MAX('Detalle de Materiales'!F2:F" + lastDataRow + ")"],
    ["Precio mínimo (fórmula)","=MIN('Detalle de Materiales'!F2:F" + lastDataRow + ")"],
    ["Cantidad total (fórmula)","=SUM('Detalle de Materiales'!D2:D" + lastDataRow + ")"],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{wch:40},{wch:30}];
  wsResumen['!rows'] = Array.from({length: resumen.length}, () => ({hpt: 13}));
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  if (n > 0) {
    try {
      const { Drawing, Rel, ContentType } = XLSX;
      const drawing = new Drawing({
        name: "chartMaterials",
        title: "Distribución por material (subtotal sin margen)",
        description: "Gráfico de torta de subtotales por material",
        anchor: "twoCellAnchor",
        from: { col: 0, colOff: 0, row: 0, rowOff: 0 },
        to:   { col: 6, colOff: 0, row: 24, rowOff: 0 },
        worksheets: [{ name: "Resumen" }]
      });
      const chart = {
        type: "pie",
        title: { text: "Distribución por material (subtotal sin margen)", color: { rgb: "FF2A2420" } },
        legend: { position: "b", color: { rgb: "FF2A2420" } },
        dataLabels: { showPercent: true, showCatName: true, separator: ": ", color: { rgb: "FF2A2420" } },
        series: [{
          title: "Subtotal sin margen",
          points: ordenados.map(m => ({ label: m.nombre, value: (m.cantidadFinal||0) * (m.precio||0) }))
        }]
      };
      if (chart && chart.series && chart.series[0]) {
        const s = chart.series[0];
        s.ref = "'Detalle de Materiales'!B2:B" + lastDataRow;
        s.cat = "'Detalle de Materiales'!B2:B" + lastDataRow;
        s.val = "'Detalle de Materiales'!F2:F" + lastDataRow;
        s.labels = { showPercent: true, showCatName: true, separator: ": " };
      }
      drawing.chart = chart;
      const rels = drawing.rels || [];
      if (!rels.find(r => r.Type && r.Type.endsWith("/chart"))) {
        rels.push(new Rel({
          rId: "rId1",
          type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
          target: "charts/chart1.xml"
        }));
      }
      drawing.rels = rels;
      const ctypes = drawing.ctypes || [];
      if (!ctypes.find(c => (c.ContentType||c).includes("drawing"))) {
        ctypes.push(new ContentType({ ContentType: "application/vnd.openxmlformats-officedocument.drawing+xml", Extension: "rels", PartName: "/xl/drawings/_rels/drawing1.xml.rels" }));
      }
      drawing.ctypes = ctypes;
      wsResumen['!drawing'] = drawing;
      wsResumen['!charts'] = [drawing];
    } catch (e) {
      console.warn('No se pudo insertar el gráfico en el reporte:', e.message);
    }
  }

  const porTipo = [["Tipo","Cantidad de materiales","Cantidad total a comprar","Subtotal sin margen","Subtotal c/margen","% del total"]];
  ["Tablero","Canto","Liston","Accesorio"].forEach(tipo => {
    const tipoItems = ordenados.filter(m => m.tipo === tipo);
    const cntTipo = tipoItems.length;
    const sumQty = tipoItems.reduce((s, m) => s + (m.cantidadFinal || 0), 0);
    const sumSM = tipoItems.reduce((s, m) => s + (m.cantidadFinal || 0) * (m.precio || 0), 0);
    const sumCM = sumSM * (1 + margen / 100);
    porTipo.push([tipo,
      { f: "=COUNTIF('Detalle de Materiales'!$B$2:$B$" + lastDataRow + ",A2)", t: "n" },
      { f: "=SUMIF('Detalle de Materiales'!$B$2:$B$" + lastDataRow + ",A2,'Detalle de Materiales'!$D$2:$D$" + lastDataRow + ")", t: "n" },
      { f: "=SUMPRODUCT(('Detalle de Materiales'!$B$2:$B$" + lastDataRow + "=A2)*('Detalle de Materiales'!$F$2:$F$" + lastDataRow + "))", t: "n" },
      { f: "=SUMPRODUCT(('Detalle de Materiales'!$B$2:$B$" + lastDataRow + "=A2)*('Detalle de Materiales'!$G$2:$G$" + lastDataRow + "))", t: "n" },
      { f: "=IF(SUM($D$2:$D$5)=0,0,D" + (porTipo.length + 1) + "/SUM($D$2:$D$5)*100)", t: "n" }
    ]);
  });
  porTipo.push(["TOTAL",
    { f: "=SUM(B2:B5)", t: "n" },
    { f: "=SUM(C2:C5)", t: "n" },
    { f: "=SUM(D2:D5)", t: "n" },
    { f: "=SUM(E2:E5)", t: "n" },
    { f: "=SUM(F2:F5)", t: "n" }
  ]);
  const wsPorTipo = XLSX.utils.aoa_to_sheet(porTipo);
  wsPorTipo['!cols'] = [{wch:14},{wch:22},{wch:26},{wch:20},{wch:20},{wch:14}];
  XLSX.utils.book_append_sheet(wb, wsPorTipo, "Por Tipo");

  const list = [["Material","Tipo","A comprar","Unidad","Nota"]];
  ordenados.forEach(m => {
    const cantidad = m.cantidadFinal || 0;
    const unidad = m.tipo === 'Tablero' ? 'láminas' : UNIDAD_POR_TIPO[m.tipo];
    let nota;
    if (m.addedManually) nota = 'agregado manualmente';
    else if (m.tipo === 'Tablero' && resultadosCorte[m.nombre]) nota = 'según esquema de corte';
    else nota = hayCombinado() ? 'según archivo combinado' : 'suma de individuales';
    list.push([m.nombre, m.tipo, Math.round(cantidad), unidad, nota]);
  });
  const wsList = XLSX.utils.aoa_to_sheet(list);
  wsList['!cols'] = [{wch:40},{wch:12},{wch:14},{wch:10},{wch:40}];
  XLSX.utils.book_append_sheet(wb, wsList, "Lista de Compra (imprimir)");

  XLSX.writeFile(wb, "Reporte_Lista_de_Compra.xlsx");
}

export function descargarListaCompra(){
  const ordenados = Object.values(materiales).sort((a,b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre));
  const filas = [["Material","Tipo","A comprar","Unidad","Nota"]];
  ordenados.forEach(m => {
    const cantidad = m.cantidadFinal || 0;
    const displayCantidad = m.tipo === 'Accesorio' || m.tipo === 'Tablero' ? Math.round(cantidad) : Number(cantidad.toFixed(2));
    const unidad = m.tipo === 'Tablero' ? 'láminas' : UNIDAD_POR_TIPO[m.tipo];
    filas.push([m.nombre, m.tipo, displayCantidad, unidad, m.nota||'']);
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws['!cols'] = [{wch:40},{wch:12},{wch:14},{wch:10},{wch:40}];
  XLSX.utils.book_append_sheet(wb, ws, "Lista de Compra");
  XLSX.writeFile(wb, "Lista_de_Compra.xlsx");
}
