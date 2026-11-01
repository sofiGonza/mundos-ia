// mundos-ia · src/imagen.js
// Responsabilidad: consultar al modelo de imágenes (fetch) y devolver
// los bytes de la imagen (paso 3 del flujo).
//
// Dos formatos posibles según la URL del .env:
//  - NVIDIA FLUX.1-schnell: la imagen llega en base64 dentro de un JSON,
//    en artifacts[0].base64 (y hay que comprobar finishReason SUCCESS).
//  - Pollinations: la imagen llega directamente como bytes (image/jpeg),
//    sin JSON; se obtienen con Buffer.from(await respuesta.arrayBuffer()).

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

// Paso 3: pide la imagen al modelo de imágenes y devuelve un Buffer (bytes).
async function generarImagen(descripcion) {
  const url = process.env.IMAGEN_URL;
  const clave = process.env.IMAGEN_API_KEY;

  if (!url) {
    throw new Error('Falta IMAGEN_URL en el archivo .env.');
  }

  // Pollinations: sin clave, GET directo con la descripción en la URL.
  const esPollinations = url.includes('pollinations.ai');
  let respuesta;
  try {
    if (esPollinations) {
      // La descripción debe pasar por encodeURIComponent para ir en la URL.
      const urlImagen = `${url}/${encodeURIComponent(descripcion)}?width=1024&height=1024&nologo=true`;
      respuesta = await fetch(urlImagen, {
        signal: AbortSignal.timeout(120000), // generar una imagen tarda más (120 s)
      });
    } else {
      // NVIDIA: POST con JSON; la imagen llega en base64.
      respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${clave}`, // la clave nunca se imprime
        },
        body: JSON.stringify({
          prompt: descripcion, // descripción leída del .txt guardado
          width: 1024,
          height: 1024,
          // FLUX.1-dev exige steps >= 5; FLUX.1-schnell usa 1 a 4.
          // Al usar 5 funciona con ambos modelos de NVIDIA.
          steps: 5,
          seed: 0, // 0 significa semilla aleatoria
        }),
        signal: AbortSignal.timeout(120000),
      });
    }
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error('El servicio tardó demasiado en responder.');
    }
    throw new Error('No se pudo conectar. Revisa tu internet o la URL.');
  }

  if (!respuesta.ok) {
    throw new Error(explicarErrorHttp(respuesta.status));
  }

  let bytes;
  if (esPollinations) {
    // La imagen llega directamente como bytes (image/jpeg), sin JSON.
    bytes = Buffer.from(await respuesta.arrayBuffer());
  } else {
    // NVIDIA: la imagen llega como texto base64 dentro del JSON.
    const datos = await respuesta.json();
    const arte = datos?.artifacts?.[0];
    if (!arte || arte.finishReason !== 'SUCCESS' || !arte.base64) {
      throw new Error('El modelo de imágenes no devolvió una imagen válida.');
    }
    // Buffer.from(textoBase64, 'base64') lo convierte en los bytes reales.
    bytes = Buffer.from(arte.base64, 'base64');
  }

  if (bytes.length === 0) {
    throw new Error('El modelo de imágenes devolvió una imagen vacía.');
  }
  return bytes; // Buffer: al guardarlo NO se usa 'utf-8'
}

module.exports = { generarImagen };