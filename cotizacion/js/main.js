import { handleFiles, renderFileList } from './csv.js';
import { render, renderListaCompra } from './ui.js';
import { descargarEsquemas, descargarPrecios, exportarExcel, guardarPrecios, cargarPrecios, aplicarPreciosGuardados, limpiarPreciosGuardados, descargarListaCompra, descargarReporteCompra } from './export.js';
import { materiales, margen, preciosGuardados } from './state.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('drag'); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', e => handleFiles(e.target.files));

document.getElementById('inMargen').addEventListener('input', (e) => { margen = parseFloat(e.target.value) || 0; render(); });

document.getElementById('btnMostrarAgregar').addEventListener('click', () => {
  document.getElementById('addForm').classList.toggle('show');
});
document.getElementById('btnAgregarMaterial').addEventListener('click', () => {
  const nombre = document.getElementById('addNombre').value.trim();
  const tipo = document.getElementById('addTipo').value;
  const cantidad = parseFloat(document.getElementById('addCantidad').value) || 0;
  const precioIngresado = parseFloat(document.getElementById('addPrecio').value);
  const clave = tipo + '|' + nombre;
  const precio = (precioIngresado > 0 ? precioIngresado : (preciosGuardados[clave] || 0));
  if(!nombre){ alert('Escribe un nombre de material.'); return; }
  materiales[clave] = { tipo, nombre, parcial:0, acumulada:0, precio, nota:'', cantidadFinal:cantidad, manual:true, addedManually:true };
  document.getElementById('addNombre').value = '';
  document.getElementById('addCantidad').value = 0;
  document.getElementById('addPrecio').value = 0;
  document.getElementById('addForm').classList.remove('show');
  document.getElementById('resultados').style.display = '';
  render(); renderListaCompra();
});

document.getElementById('btnDescargarEsquemas').addEventListener('click', descargarEsquemas);
document.getElementById('btnDescargarPrecios').addEventListener('click', descargarPrecios);
document.getElementById('btnExportarExcel').addEventListener('click', exportarExcel);
document.getElementById('btnGuardarPrecios').addEventListener('click', guardarPrecios);
document.getElementById('btnAplicarPrecios').addEventListener('click', aplicarPreciosGuardados);
document.getElementById('btnLimpiarPrecios').addEventListener('click', limpiarPreciosGuardados);
document.getElementById('btnDescargarListaCompra').addEventListener('click', descargarListaCompra);
document.getElementById('btnDescargarReporteCompra').addEventListener('click', descargarReporteCompra);
document.getElementById('inputPrecios').addEventListener('change', (e) => {
  const file = e.target.files[0]; if(!file) return;
  cargarPrecios(file);
});
