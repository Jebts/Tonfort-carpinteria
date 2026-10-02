import { archivos, materiales, indefinidos, preciosGuardados, piezasPorMaterial, TIPOS_VALIDOS, limpiarNum, claveDe, hayCombinado } from './state.js';
import { render, renderListaCompra } from './ui.js';

export function recolectarPiezasTablero(){
  Object.keys(piezasPorMaterial).forEach(k => delete piezasPorMaterial[k]);
  const combinados = archivos.filter(a => a.tipo === 'combinado' && a.filas && a.filas.length);
  const fuente = combinados.length ? combinados : archivos.filter(a => a.filas && a.filas.length);
  fuente.forEach(a => {
    a.filas.forEach(f => {
      const tipo = (f['Tipo de material']||'').trim();
      if(tipo !== 'Tablero') return;
      const nombre = (f['Nombre del material']||'').trim();
      const cantidad = parseInt(f['Cantidad']) || 0;
      const largo = limpiarNum(f['Longitud']);
      const ancho = limpiarNum(f['Anchura']);
      if(!largo || !ancho) return;
      if(!piezasPorMaterial[nombre]) piezasPorMaterial[nombre] = [];
      const label = (f['Designación']||nombre);
      for(let i=0;i<cantidad;i++) piezasPorMaterial[nombre].push({w:largo, h:ancho, label});
    });
  });
}

export function recalcularTodo(){
  const preservado = {};
  Object.entries(materiales).forEach(([clave, m]) => {
    preservado[clave] = {precio: m.precio, nota: m.nota, manual: m.manual, addedManually: m.addedManually, cantidadFinal: m.cantidadFinal};
  });
  Object.keys(materiales).forEach(k => delete materiales[k]);
  indefinidos.clear();

  Object.entries(preservado).forEach(([clave, p]) => {
    if(p.addedManually){
      const [tipo, nombre] = clave.split('|');
      materiales[clave] = {tipo, nombre, parcial:0, acumulada:0, precio:p.precio||0, nota:p.nota||'', cantidadFinal:p.cantidadFinal||0, manual:true, addedManually:true};
    }
  });

  function acumularEn(campo, filas){
    filas.forEach(f => {
      const tipo = (f['Tipo de material']||'').trim();
      const nombre = (f['Nombre del material']||'').trim();
      const cantidad = parseInt(f['Cantidad']) || 0;
      const longitud = limpiarNum(f['Longitud']);
      const area = limpiarNum(f['Area - final']);
      if(!TIPOS_VALIDOS.includes(tipo)){ if(f['Designación']) indefinidos.add(f['Designación']); return; }
      const clave = claveDe(tipo, nombre);
      if(!materiales[clave]){
        const p = preservado[clave] || {};
        materiales[clave] = { tipo, nombre, parcial:0, acumulada:0, precio: p.precio ?? (preciosGuardados[clave] || 0), nota: p.nota || '', cantidadFinal: p.cantidadFinal, manual: !!p.manual, addedManually:false };
      }
      let cant = 0;
      if(tipo === 'Tablero') cant = cantidad * (area || 0);
      else if(tipo === 'Canto' || tipo === 'Liston') cant = cantidad * (longitud || 0) / 1000;
      else if(tipo === 'Accesorio') cant = cantidad;
      materiales[clave][campo] += cant;
    });
  }

  archivos.forEach(a => { if(a.filas && a.filas.length) acumularEn(a.tipo === 'combinado' ? 'acumulada' : 'parcial', a.filas); });

  const combinado = hayCombinado();
  Object.values(materiales).forEach(m => {
    if(!m.manual) m.cantidadFinal = combinado ? m.acumulada : m.parcial;
  });

  recolectarPiezasTablero();
  const hayDatos = archivos.some(a => a.filas && a.filas.length) || Object.keys(materiales).length > 0;
  document.getElementById('resultados').style.display = hayDatos ? '' : 'none';
  if(hayDatos){ render(); renderListaCompra(); }
}
