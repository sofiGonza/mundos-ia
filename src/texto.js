// mundos-ia · src/texto.js
// Responsabilidad: consultar al modelo de lenguaje (fetch) y devolver
// una descripción en inglés de la imagen (paso 2 del flujo).
const path = require('path');

const RAIZ = path.join(__dirname, '..');

// Mensaje de sistema (role: 'system'): pide exactamente lo que necesita
// el modelo de imágenes: un párrafo en inglés, 80-120 palabras, que
// describa una imagen y mencione los 5 colores del mundo.
function mensajeDeSistema(colores) {
  return (
    'Eres un asistente que escribe descripciones breves para generar imágenes. ' +
    'Responde con un solo párrafo en inglés, de 80 a 120 palabras, que describa ' +
    'una imagen: escena, elementos, iluminación, composición y estilo artístico ' +
    '(no un cuento ni una historia). ' +
    `Menciona estos 5 colores (puedes traducirlos al inglés): ${colores.join(', ')}. ` +
    'Sin títulos, sin formato markdown y sin texto escrito dentro de la imagen.'
  );
}

// Convierte un estado HTTP en un mensaje claro en español (Parte 5).
function explicarErrorHttp(estado) {
  if (estado === 401 || estado === 403) {
    return 'La API key no es válida. Revisa tu archivo .env.';
  }
  if (estado === 402 || estado === 429) {
    return 'Superaste el límite gratuito. Espera un momento (revisa el encabezado retry-after si existe).';
  }
  if (estado === 404 || estado === 410) {
    return 'El modelo o la URL no existen. Revisa tu configuración.';
  }
  return `El servicio respondió con el estado ${estado}. Revisa tu configuración.`;
}

// Paso 2: pide la descripción al modelo de texto (función async).
async function describirMundo(mundo) {
  const url = process.env.TEXTO_URL;
  const clave = process.env.TEXTO_API_KEY;
  const modelo = process.env.TEXTO_MODELO;

  if (!url || !clave || !modelo) {
    throw new Error('Faltan TEXTO_URL, TEXTO_API_KEY o TEXTO_MODELO en el archivo .env.');
  }

  let respuesta;
  try {
    // Mismo formato compatible con OpenAI que en el Taller 2.
    respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clave}`, // la clave nunca se imprime
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: 'system', content: mensajeDeSistema(mundo.colores) },
          // El mensaje del usuario es el contenido del JSON guardado.
          { role: 'user', content: JSON.stringify(mundo) },
        ],
      }),
      signal: AbortSignal.timeout(30000), // sesión 5: tiempo máximo 30 s
    });
  } catch (error) {
    // fetch lanza TypeError si no hay conexión o la URL está mal escrita.
    if (error.name === 'TimeoutError') {
      throw new Error('El servicio tardó demasiado en responder.');
    }
    throw new Error('No se pudo conectar. Revisa tu internet o la URL.');
  }

  if (!respuesta.ok) {
    throw new Error(explicarErrorHttp(respuesta.status));
  }

  const datos = await respuesta.json();
  const descripcion = datos?.choices?.[0]?.message?.content;

  // Validación: la respuesta no puede llegar vacía.
  if (!descripcion || descripcion.trim() === '') {
    throw new Error('El modelo de texto devolvió una respuesta vacía.');
  }

  // Si supera 1500 caracteres se recorta y se avisa al usuario.
  if (descripcion.length > 1500) {
    console.warn('Aviso: la descripción superaba 1500 caracteres y se recortó.');
    return descripcion.slice(0, 1500);
  }
  return descripcion;
}

module.exports = { describirMundo };