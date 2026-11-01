// mundos-ia · src/mundo.js
// Responsabilidad: validar los argumentos, crear el objeto JSON y
// guardarlo / leerlo (pasos 1 y 2 del flujo).
const fs = require('fs'); // sesión 4: escribir, leer y comprobar archivos
const path = require('path'); // sesión 4: rutas seguras
const hash = require('object-hash'); // sesión 2: identificador único del mundo

// Carpetas construidas desde la ubicación de este archivo,
// no desde donde se ejecuta el comando (pista de la Parte 1).
const RAIZ = path.join(__dirname, '..');
const CARPETA_DATA = path.join(RAIZ, 'data');

const EJEMPLO_USO =
  'Uso: npm start -- "<situación>" "<mundo>" <color1> <color2> <color3> <color4> <color5>';

// Paso 1: valida los 7 argumentos y crea el objeto del mundo.
// Devuelve null (y pone process.exitCode = 1) si algo falla.
function crearMundo(args) {
  // Validación 1: deben llegar exactamente 7 argumentos.
  if (args.length !== 7) {
    console.error('Deben llegar exactamente 7 argumentos: situación, mundo y 5 colores.');
    console.error(EJEMPLO_USO);
    process.exitCode = 1;
    return null;
  }

  const [situacion, mundo, ...colores] = args;

  // Validación 2: ningún argumento vacío ni con solo espacios.
  for (const argumento of [situacion, mundo, ...colores]) {
    if (argumento.trim() === '') {
      console.error('Ningún argumento puede estar vacío ni tener solo espacios.');
      console.error(EJEMPLO_USO);
      process.exitCode = 1;
      return null;
    }
  }

  // Validación 3: los 5 colores deben ser distintos sin distinguir mayúsculas.
  const coloresEnMinuscula = colores.map((color) => color.toLowerCase());
  if (new Set(coloresEnMinuscula).size !== 5) {
    console.error('Los 5 colores deben ser distintos (sin distinguir mayúsculas de minúsculas).');
    console.error(EJEMPLO_USO);
    process.exitCode = 1;
    return null;
  }

  // El id son los primeros 8 caracteres del hash.
  // El hash se calcula SIN creadoEn: los mismos datos producen siempre el mismo id
  // y así se pueden reutilizar los archivos en siguientes ejecuciones.
  const id = hash({ situacion, mundo, colores }).slice(0, 8);

  return {
    id,
    situacion,
    mundo,
    colores,
    creadoEn: new Date().toISOString(), // fecha en formato ISO
  };
}

// Paso 1 (final): guarda el objeto como data/mundo_<id>.json.
function guardarMundo(mundo) {
  fs.mkdirSync(CARPETA_DATA, { recursive: true }); // crea data/ si no existe
  const ruta = path.join(CARPETA_DATA, `mundo_${mundo.id}.json`);
  fs.writeFileSync(ruta, JSON.stringify(mundo, null, 2), 'utf-8');
  return ruta;
}

// Paso 2 (inicio): vuelve a LEER el JSON desde el archivo
// (readFileSync + JSON.parse), no desde la memoria.
function leerMundo(ruta) {
  const contenido = fs.readFileSync(ruta, 'utf-8');
  return JSON.parse(contenido);
}

module.exports = { crearMundo, guardarMundo, leerMundo };