import { archivos, materiales, indefinidos } from './state.js';
import { recalcularTodo } from './logic.js';

export function handleFiles(fileArr){
  [...fileArr].forEach(file => {
    if(!file.name.toLowerCase().endsWith('.csv')) return;
    const esCombinado = /todos|modelo_00/i.test(file.name);
    const entry = { file, nombre: file.name, tipo: esCombinado ? 'combinado' : 'individual', filas: [] };
    archivos.push(entry);
    Papa.parse(file, {
      header: true, skipEmptyLines: true, delimiter: ";", encoding: "UTF-8",
      complete: (res) => { entry.filas = res.data; renderFileList(); recalcularTodo(); }
    });
  });
  renderFileList();
}

export function renderFileList(){
  const fileListEl = document.getElementById('fileList');
  fileListEl.innerHTML = '';
  archivos.forEach((a, i) => {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `
      <span class="name">${a.nombre}</span>
      <span class="tag ${a.tipo}" data-i="${i}">${a.tipo === 'combinado' ? 'Combinado' : 'Individual'}</span>
      <button class="remove" data-i="${i}" title="Quitar">✕</button>
    `;
    fileListEl.appendChild(row);
  });
  fileListEl.querySelectorAll('.tag').forEach(t => {
    t.addEventListener('click', () => {
      const i = +t.dataset.i;
      archivos[i].tipo = archivos[i].tipo === 'combinado' ? 'individual' : 'combinado';
      renderFileList(); recalcularTodo();
    });
  });
  fileListEl.querySelectorAll('.remove').forEach(b => {
    b.addEventListener('click', () => { archivos.splice(+b.dataset.i, 1); renderFileList(); recalcularTodo(); });
  });
}
