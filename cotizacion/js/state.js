export const TIPOS_VALIDOS = ["Tablero","Canto","Accesorio","Liston"];
export const UNIDAD_POR_TIPO = {Tablero:"m²", Canto:"ml", Accesorio:"unid", Liston:"ml"};
export const TAMANOS_ESTANDAR = [
  {label:"2440 x 1830", w:2440, h:1830},
  {label:"2440 x 2150", w:2440, h:2150},
  {label:"2140 x 1220", w:2140, h:1220},
  {label:"1830 x 1220", w:1830, h:1220},
];

export let archivos = [];
export let materiales = {};
export let indefinidos = new Set();
export let configTableros = {};
export let piezasPorMaterial = {};
export let resultadosCorte = {};
export let cortesAbiertos = new Set();
export let margen = 0;
export let preciosGuardados = {};

export function fmtMoney(v){ return '$' + Math.round(v||0).toLocaleString('es-CO'); }
export function fmtNum(v){ return (v||0).toLocaleString('es-CO', {minimumFractionDigits:2, maximumFractionDigits:2}); }
export function limpiarNum(v){
  if(v === undefined || v === null || v === '') return NaN;
  return parseFloat(String(v).replace(' mm','').replace(' m²','').replace(',','.'));
}
export function claveDe(tipo, nombre){ return tipo + '|' + nombre; }
export function hayCombinado(){ return archivos.some(a => a.tipo === 'combinado' && a.filas && a.filas.length); }
export function cssSafe(s){ return s.replace(/[^a-zA-Z0-9]/g,'_'); }
