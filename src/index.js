// mundos-ia · src/index.js
// Responsabilidad: orquestar los 3 pasos del programa (sesión 1: módulos).
//   Paso 1: guardar el mundo en data/mundo_<id>.json
//   Paso 2: pedir la descripción al modelo de texto  -> descripciones/mundo_<id>.txt
//   Paso 3: pedir la imagen al modelo de imágenes     -> imagenes/mundo_<id>.jpg

const path = require('path'); // sesión 4: rutas construidas desde el archivo
const fs = require('fs');
const { crearMundo, guardarMundo, leerMundo } = require('./mundo');
const { describirMundo } = require('./texto');
const { generarImagen } = require('./imagen');

// Carpeta base del proyecto: desde aquí se construyen todas las rutas.
const RAIZ = path.join(__dirname, '..');
const CARPETA_DESC = path.join(RAIZ, 'descripciones');
const CARPETA_IMG = path.join(RAIZ, 'imagenes');

// Cargar las variables del .env (sesión 5). Si el .env no existe,
// se sigue adelante: las APIs fallarán con un mensaje claro.
try {
  process.loadEnvFile(path.join(RAIZ, '.env'));
} catch {
  // sin .env no hay claves; los errores se explican solos más adelante
}

// Muestra las rutas relativas al proyecto ("data/mundo_x.json"),
// como en el ejemplo de salida del taller.
function rutaMostrable(rutaAbsoluta) {
  return path.relative(RAIZ, rutaAbsoluta).split(path.sep).join('/');
}

// Orquestación: los 3 pasos en orden, dentro de async main() con try/catch.
async function main() {
  const args = process.argv.slice(2); // sesión 0: argumentos de consola

  // Parte 2: validar los argumentos y crear el objeto del mundo.
  const mundo = crearMundo(args);
  if (!mundo) return; // ya se mostró el error y process.exitCode = 1

  // Paso 1: guardar el objeto JSON en data/mundo_<id>.json.
  const rutaJson = guardarMundo(mundo); // crea data/ si no existe
  console.log(`Paso 1: mundo guardado en ${rutaMostrable(rutaJson)}`);

  // Paso 2: volver a LEER el JSON desde el archivo (no el objeto en memoria).
  const mundoGuardado = leerMundo(rutaJson);

  // Ahorro de cuota: si el .txt ya existe, no se llama al modelo de texto.
  const rutaDesc = path.join(CARPETA_DESC, `mundo_${mundo.id}.txt`);
  let descripcion;
  if (fs.existsSync(rutaDesc)) {
    console.log('Paso 2: la descripción ya existía, no se llamó al modelo de texto.');
  } else {
    const texto = await describirMundo(mundoGuardado);
    fs.mkdirSync(CARPETA_DESC, { recursive: true });
    fs.writeFileSync(rutaDesc, texto, 'utf-8');
    console.log(`Paso 2: descripción guardada en ${rutaMostrable(rutaDesc)}`);
  }
  // La descripción que se envía al modelo de imágenes se lee desde el .txt.
  descripcion = fs.readFileSync(rutaDesc, 'utf-8');

  // Ahorro de cuota: si la imagen ya existe, no se llama al modelo de imágenes.
  const rutaImg = path.join(CARPETA_IMG, `mundo_${mundo.id}.jpg`);
  if (fs.existsSync(rutaImg)) {
    console.log('Paso 3: la imagen ya existía, no se llamó al modelo de imágenes.');
  } else {
    const bytes = await generarImagen(descripcion); // Buffer con los bytes
    fs.mkdirSync(CARPETA_IMG, { recursive: true });
    fs.writeFileSync(rutaImg, bytes); // sin 'utf-8': son bytes binarios
    console.log(`Paso 3: imagen guardada en ${rutaMostrable(rutaImg)}`);
  }

  console.log('Listo. Revisa la carpeta imagenes/');
}

// Los errores de cualquier paso llegan aquí: mensaje claro en español
// y process.exitCode = 1. Los archivos de los pasos anteriores se conservan.
main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});