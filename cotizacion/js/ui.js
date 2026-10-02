import { materiales, configTableros, piezasPorMaterial, resultadosCorte, cortesAbiertos, margen, indefinidos, UNIDAD_POR_TIPO, TAMANOS_ESTANDAR, fmtMoney, fmtNum, claveDe, hayCombinado, cssSafe } from './state.js';
import { renderSheetSVG } from './packer.js';

export function render(){
  const tipos = ['Tablero','Canto','Liston','Accesorio'];
  const cardsEl = document.getElementById('cards');
  cardsEl.innerHTML = '';
  tipos.forEach(tipo => {
    let p = 0, a = 0;
    Object.values(materiales).forEach(m => { if(m.tipo === tipo){ p += m.parcial; a += m.acumulada; } });
    const unidad = UNIDAD_POR_TIPO[tipo];
    const nombreTipo = {Tablero:'Tableros', Canto:'Cantos', Liston:'Listones', Accesorio:'Accesorios'}[tipo];
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="label">${nombreTipo}</div>
      <div class="row"><span class="k">Parcial</span><span class="v">${tipo==='Accesorio'? Math.round(p) : fmtNum(p)} ${unidad}</span></div>
      <div class="row acumulada"><span class="k">Acumulado</span><span class="v">${tipo==='Accesorio'? Math.round(a) : fmtNum(a)} ${unidad}</span></div>`;
    cardsEl.appendChild(div);
  });

  const tbody = document.getElementById('tablaMateriales');
  tbody.innerHTML = '';
  const ordenados = Object.values(materiales).sort((a,b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre));

  ordenados.forEach(m => {
    const clave = claveDe(m.tipo, m.nombre);
    const cantidad = m.cantidadFinal || 0;
    const subtotal = cantidad * (m.precio||0);
    const subConMargen = subtotal * (1 + margen/100);

    const tr = document.createElement('tr');
    const subnota = (!m.manual && (m.parcial || m.acumulada)) ? `<div class="subnota">parcial: ${fmtNum(m.parcial)} / acumulada: ${fmtNum(m.acumulada)}</div>` : '';
    const iconoCorte = m.tipo === 'Tablero' ? `<button class="icon-btn" data-corte="${clave}" title="Ver esquema de corte">🪚</button>` : '';
    const iconoBorrar = m.addedManually ? `<button class="icon-btn del" data-del="${clave}" title="Eliminar material">🗑</button>` : '';

    tr.innerHTML = `
      <td>${m.nombre}</td>
      <td>${m.tipo}</td>
      <td>${UNIDAD_POR_TIPO[m.tipo]}</td>
      <td class="num"><input type="number" class="cantidad" data-clave="${clave}" value="${cantidad}" step="0.01">${subnota}</td>
      <td class="num"><input type="number" class="precio" data-clave="${clave}" value="${m.precio || ''}" placeholder="0"></td>
      <td><input type="text" class="nota" data-clave="${clave}" value="${m.nota||''}" placeholder="Fuente / observación"></td>
      <td class="num sub-td">${fmtMoney(subtotal)}</td>
      <td class="num sub-margen-td">${fmtMoney(subConMargen)}</td>
      <td>${iconoCorte}${iconoBorrar}</td>
    `;
    tbody.appendChild(tr);

    if(m.tipo === 'Tablero' && cortesAbiertos.has(m.nombre)){
      const trCorte = document.createElement('tr');
      trCorte.className = 'cut-row';
      const td = document.createElement('td');
      td.colSpan = 9;
      td.appendChild(construirPanelCorte(m.nombre));
      trCorte.appendChild(td);
      tbody.appendChild(trCorte);
    }
  });

  tbody.querySelectorAll('input.cantidad').forEach(inp => {
    inp.addEventListener('input', () => {
      const clave = inp.dataset.clave;
      materiales[clave].cantidadFinal = parseFloat(inp.value) || 0;
      materiales[clave].manual = true;
      const tr = inp.closest('tr');
      const m = materiales[clave];
      const cantidad = m.cantidadFinal || 0;
      const subtotal = cantidad * (m.precio||0);
      const subConMargen = subtotal * (1 + margen/100);
      const tds = tr.querySelectorAll('td');
      if(tds[6]) tds[6].textContent = fmtMoney(subtotal);
      if(tds[7]) tds[7].textContent = fmtMoney(subConMargen);
      actualizarTotales();
      renderListaCompra();
    });
  });
  tbody.querySelectorAll('input.precio').forEach(inp => {
    inp.addEventListener('input', () => {
      materiales[inp.dataset.clave].precio = parseFloat(inp.value) || 0;
      const tr = inp.closest('tr');
      const m = materiales[inp.dataset.clave];
      const cantidad = m.cantidadFinal || 0;
      const subtotal = cantidad * (m.precio||0);
      const subConMargen = subtotal * (1 + margen/100);
      const tds = tr.querySelectorAll('td');
      if(tds[6]) tds[6].textContent = fmtMoney(subtotal);
      if(tds[7]) tds[7].textContent = fmtMoney(subConMargen);
      actualizarTotales();
    });
  });
  tbody.querySelectorAll('input.nota').forEach(inp => {
    inp.addEventListener('input', () => { materiales[inp.dataset.clave].nota = inp.value; });
  });
  tbody.querySelectorAll('[data-corte]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [tipo, nombre] = btn.dataset.corte.split('|');
      if(cortesAbiertos.has(nombre)) cortesAbiertos.delete(nombre); else cortesAbiertos.add(nombre);
      render();
    });
  });
  tbody.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => { delete materiales[btn.dataset.del]; render(); renderListaCompra(); });
  });

  actualizarTotales();

  const warnBox = document.getElementById('warnBox');
  if(indefinidos.size){
    warnBox.style.display = '';
    warnBox.innerHTML = `<strong>${indefinidos.size} pieza(s) sin tipo de material asignado (excluidas del cálculo):</strong>${[...indefinidos].join(', ')}`;
  } else warnBox.style.display = 'none';
}

export function actualizarTotales(){
  const totalSinMargen = Object.values(materiales).reduce((sum, m) => sum + (m.cantidadFinal || 0) * (m.precio || 0), 0);
  document.getElementById('totalSinMargen').textContent = fmtMoney(totalSinMargen);
  document.getElementById('totalConMargen').textContent = fmtMoney(totalSinMargen * (1 + margen/100));
  const totalConMargen = totalSinMargen * (1 + margen/100);
  document.getElementById('rangoTexto').textContent = `${fmtMoney(totalSinMargen)} — ${fmtMoney(totalConMargen)}`;
  document.getElementById('ahorroPct').innerHTML = `${margen.toFixed(1)}%<span>margen aplicado</span>`;
}

export function renderListaCompra(){
  const tbody = document.getElementById('tablaCompra');
  tbody.innerHTML = '';
  const combinado = hayCombinado();
  const ordenados = Object.values(materiales).sort((a,b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre));
  ordenados.forEach(m => {
    const cantidad = m.cantidadFinal || 0;
    const clave = claveDe(m.tipo, m.nombre);
    const tr = document.createElement('tr');
    const displayCantidad = m.tipo === 'Accesorio' || m.tipo === 'Tablero' ? Math.round(cantidad) : cantidad.toFixed(2);
    const unidad = m.tipo === 'Tablero' ? 'láminas' : UNIDAD_POR_TIPO[m.tipo];
    tr.innerHTML = `<td>${m.nombre}</td><td>${m.tipo}</td><td class="num"><input type="number" class="cantidad-compra" data-clave="${clave}" value="${displayCantidad}" step="0.01"></td><td>${unidad}</td><td><input type="text" class="nota-compra" data-clave="${clave}" value="${m.nota||''}"></td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('input.cantidad-compra').forEach(inp => {
    inp.addEventListener('input', () => {
      const clave = inp.dataset.clave;
      const raw = parseFloat(inp.value);
      materiales[clave].cantidadFinal = isNaN(raw) ? 0 : raw;
      materiales[clave].manual = true;
      const m = materiales[clave];
      const cantidad = m.cantidadFinal || 0;
      const subtotal = cantidad * (m.precio||0);
      const subConMargen = subtotal * (1 + margen/100);
      const tablaMateriales = document.getElementById('tablaMateriales');
      const filaMaterial = tablaMateriales.querySelector(`input.cantidad[data-clave="${clave}"]`)?.closest('tr');
      if(filaMaterial){
        const tds = filaMaterial.querySelectorAll('td');
        if(tds[6]) tds[6].textContent = fmtMoney(subtotal);
        if(tds[7]) tds[7].textContent = fmtMoney(subConMargen);
      }
      actualizarTotales();
      const display = m.tipo === 'Accesorio' || m.tipo === 'Tablero' ? Math.round(cantidad) : cantidad.toFixed(2);
      inp.value = display;
    });
  });

  tbody.querySelectorAll('input.nota-compra').forEach(inp => {
    inp.addEventListener('input', () => {
      const clave = inp.dataset.clave;
      materiales[clave].nota = inp.value;
      const tablaMateriales = document.getElementById('tablaMateriales');
      const filaMaterial = tablaMateriales.querySelector(`input.nota[data-clave="${clave}"]`);
      if(filaMaterial){
        filaMaterial.value = inp.value;
      }
    });
  });
}

export function construirPanelCorte(nombre){
  const wrap = document.createElement('div');
  wrap.className = 'cut-panel';
  if(!configTableros[nombre]) configTableros[nombre] = {sheetW: 2440, sheetH: 2150, kerf: 4};
  const cfg = configTableros[nombre];
  const piezas = piezasPorMaterial[nombre] || [];
  const bins = resultadosCorte[nombre];

  const stdBtns = TAMANOS_ESTANDAR.map(t => `<button data-w="${t.w}" data-h="${t.h}">${t.label} mm</button>`).join('');

  wrap.innerHTML = `
    <h4>Esquema de corte — ${nombre}</h4>
    ${piezas.length ? '' : '<p class="subnota">No hay piezas de despiece de este material en los CSV cargados — sube el archivo de corte para generar el esquema.</p>'}
    <div class="std-sizes">${stdBtns}</div>
    <div class="cfg-row">
      <div class="cfg-field"><label>Largo lámina (mm)</label><input type="number" id="cw_${cssSafe(nombre)}" value="${cfg.sheetW}"></div>
      <div class="cfg-field"><label>Ancho lámina (mm)</label><input type="number" id="ch_${cssSafe(nombre)}" value="${cfg.sheetH}"></div>
      <div class="cfg-field"><label>Kerf sierra (mm)</label><input type="number" id="ck_${cssSafe(nombre)}" value="${cfg.kerf}"></div>
      <button class="action" id="gen_${cssSafe(nombre)}">Generar esquema</button>
    </div>
    <div id="res_${cssSafe(nombre)}"></div>
  `;

  wrap.querySelectorAll('.std-sizes button').forEach(b => {
    b.addEventListener('click', () => {
      wrap.querySelector(`#cw_${cssSafe(nombre)}`).value = b.dataset.w;
      wrap.querySelector(`#ch_${cssSafe(nombre)}`).value = b.dataset.h;
    });
  });

  wrap.querySelector(`#gen_${cssSafe(nombre)}`).addEventListener('click', () => {
    cfg.sheetW = parseFloat(wrap.querySelector(`#cw_${cssSafe(nombre)}`).value) || cfg.sheetW;
    cfg.sheetH = parseFloat(wrap.querySelector(`#ch_${cssSafe(nombre)}`).value) || cfg.sheetH;
    cfg.kerf = parseFloat(wrap.querySelector(`#ck_${cssSafe(nombre)}`).value) || cfg.kerf;
    if(!piezas.length){ alert('No hay piezas de este material para generar el esquema.'); return; }
    resultadosCorte[nombre] = guillotinePack(piezas, cfg.sheetW, cfg.sheetH, cfg.kerf);
    render();
  });

  if(bins){
    const areaLamina = cfg.sheetW * cfg.sheetH;
    const areaUsada = piezas.reduce((s,p) => s + p.w*p.h, 0);
    const aprovechamiento = bins.length ? (areaUsada / (areaLamina*bins.length) * 100) : 0;
    const resDiv = wrap.querySelector(`#res_${cssSafe(nombre)}`);
    const resumen = document.createElement('div');
    resumen.className = 'resumen-tablero';
    resumen.innerHTML = `
      <span>Piezas: <b>${piezas.length}</b></span>
      <span>Láminas necesarias: <b>${bins.length}</b></span>
      <span>Aprovechamiento: <b>${aprovechamiento.toFixed(1)}%</b></span>
      <button class="use-btn" id="usar_${cssSafe(nombre)}">Usar ${bins.length} como cantidad a comprar</button>
    `;
    resDiv.appendChild(resumen);
    resumen.querySelector(`#usar_${cssSafe(nombre)}`).addEventListener('click', () => {
      const clave = claveDe('Tablero', nombre);
      if(materiales[clave]){ materiales[clave].cantidadFinal = bins.length; materiales[clave].manual = true; render(); renderListaCompra(); }
    });
    const sheetsWrap = document.createElement('div');
    sheetsWrap.className = 'sheets-wrap';
    bins.forEach((bin, i) => {
      const sb = document.createElement('div');
      sb.className = 'sheet-box';
      sb.innerHTML = `<div class="sheet-title">Lámina ${i+1} de ${bins.length}</div>` + renderSheetSVG(bin, cfg.sheetW, cfg.sheetH);
      sheetsWrap.appendChild(sb);
    });
    resDiv.appendChild(sheetsWrap);
  }
  return wrap;
}
