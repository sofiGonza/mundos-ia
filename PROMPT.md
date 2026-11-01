# PROMPT.md — mundos-ia (declaración de uso de IA)

## A. Declaración

**Usé IA: sí.** Este proyecto se construyó con ayuda de una herramienta de IA
(EvoX). Todo el proceso queda declarado en este archivo y el código resultante
fue revisado, probado y ajustado a mano antes de darlo por terminado.

## B. Herramienta y modelo

- **Herramienta:** EvoX (asistente de código en el entorno del SENA).
- **Modelo:** no expongo un identificador de modelo verificable desde mi
  entorno; la versión exacta puede consultarse en la interfaz o en los
  metadatos de ejecución del asistente.
- **Entorno:** Node.js v24, npm 12, Git 2.53, sistema CommonJS.

## C. El prompt inicial completo (copiado literal)

> Actúa como un instructor de Node.js para principiantes del SENA.
> Quiero construir un programa de consola llamado "mundos-ia".
>
> CONTEXTO: solo conozco estos temas: process.argv, módulos con require,
> el módulo nativo fs (writeFileSync, readFileSync, existsSync, mkdirSync),
> path, npm (init, install, scripts), el paquete object-hash, variables de
> entorno con .env y process.loadEnvFile, async/await con try/catch y el fetch
> nativo de Node.
>
> OBJETIVO:
> 1. Recibir por parámetros una situación, un mundo y 5 colores, y guardarlos
>    en un objeto JSON en data/mundo_<id>.json.
> 2. Leer ese JSON y enviarlo con fetch a la API de un modelo de lenguaje para
>    que genere la descripción de una imagen. Guardarla en
>    descripciones/mundo_<id>.txt.
> 3. Enviar esa descripción con fetch a la API de un modelo de imágenes y
>    guardar la imagen en imagenes/mundo_<id>.jpg.
>
> RESTRICCIONES:
> - No uses dotenv, axios, SDK de proveedores, readline, commander ni frameworks.
> - Código simple, con comentarios en español numerados ("paso 1", "paso 2"...).
> - Las API keys se leen del archivo .env y nunca se escriben en el código.
> - Si el .txt o la imagen ya existen, no vuelvas a llamar a las APIs.
> - Divide el código en src/index.js, src/mundo.js, src/texto.js y src/imagen.js.
>
> SERVICIOS: texto con Groq (openai/gpt-oss-20b), imagen con NVIDIA
> FLUX.1-schnell. La imagen de NVIDIA llega en base64 dentro de
> artifacts[0].base64 y hay que comprobar finishReason SUCCESS.
> El error 410 Gone significa que el modelo fue retirado.
>
> FORMA DE RESPONDER: dame un archivo a la vez, explica cada bloque en 2 líneas
> y no uses nada que no esté en el CONTEXTO.

## D. Los prompts siguientes (los 3 más importantes)

### Prompt 2 — errores en español y sin librerías extra

> El programa debe explicar los errores de la API en español y sin mostrar
> mensajes técnicos: 401/403 → "La API key no es válida...", 402/429 →
> "Superaste el límite gratuito...", 404/410 → "El modelo o la URL no
> existen...", TypeError → "No se pudo conectar...", TimeoutError → "El
> servicio tardó demasiado en responder". No puedes usar dotenv: usa
> process.loadEnvFile.

**Qué respondió la IA:** propuso una función que traduce cada estado HTTP a
un mensaje claro y cargar el `.env` con `process.loadEnvFile()` dentro de un
`try/catch` (esa función lanza un error si el archivo no existe a partir de
Node 20.6).

**Qué hice con esa respuesta:** implementé `explicarErrorHttp()` en
`src/texto.js` y `src/imagen.js` y el `try/catch` con `loadEnvFile` en
`src/index.js`, y lo probé provocando los 3 errores (evidencias guardadas en
`evidencias/errores/`).

### Prompt 3 — reutilización de archivos (ahorro de cuota)

> Si descripciones/mundo_<id>.txt ya existe, no llames al modelo de texto y
> usa su contenido. Si imagenes/mundo_<id>.jpg ya existe, no llames al modelo
> de imágenes. Informa al usuario de cada decisión en consola.

**Qué respondió la IA:** comprobar con `fs.existsSync` antes de cada llamada
y guardar la imagen con `fs.writeFileSync(ruta, bytes)` sin la opción
`'utf-8'`.

**Qué hice con esa respuesta:** apliqué `existsSync` en `index.js` para el
`.txt` y el `.jpg`, y el guardado de bytes binarios en `imagen.js`.

### Prompt 4 — mensaje de sistema del modelo de texto

> El mensaje de sistema (role: 'system') debe pedir exactamente: un solo
> párrafo en inglés, entre 80 y 120 palabras, que describa una imagen (escena,
> elementos, iluminación, composición y estilo artístico), mencionando los
> 5 colores, sin títulos ni markdown. Si la respuesta supera 1500 caracteres,
> recórtala con slice y avisa al usuario.

**Qué respondió la IA:** el texto literal del system prompt y el código para
recortar con `slice(0, 1500)`.

**Qué hice con esa respuesta:** implementé `mensajeDeSistema()` en
`texto.js` y verifiqué con el Mundo 1 que la descripción salió en inglés,
coherente con la escena y con los 5 colores (109 palabras).

## E. Al menos 3 cambios que hice yo sobre lo que entregó la IA

1. **Corregí el guardado de la imagen sin `'utf-8'`.** Un primer borrador
   usaba `fs.writeFileSync(ruta, texto, 'utf-8')` para el caso base64: el
   archivo habría quedado dañado. Lo cambié por `Buffer.from(textoBase64,
   'base64')` y `writeFileSync(ruta, bytes)` sin codificación, que es lo que
   exige el taller.

2. **Añadí la validación de colores repetidos sin distinguir mayúsculas** en
   `mundo.js`: la IA solo validaba cantidad y vacíos, y la rúbrica exige
   también colores distintos (`new Set(...)` con los colores en minúscula).

3. **Normalicé las rutas de salida a `/`** con
   `path.relative(...).split(path.sep).join('/')` en `index.js`, para que la
   consola muestre `data/mundo_<id>.json` igual que el ejemplo del taller
   (en Windows las rutas salen con `\`).

4. **Aumenté el timeout de la imagen de 60 s a 120 s** en `imagen.js` cuando
   la API de NVIDIA superó los 60 s: el taller pide 60000, pero el servicio
   gratuito tardaba más y el programa se cortaba; 120 s sigue siendo un
   timeout razonable y evita esperas infinitas.

5. **Quité librerías que la IA propuso y estaban prohibidas** (`readline`
   para "preguntar los datos" y `dotenv`): el taller solo permite módulos
   nativos, `object-hash` y `process.loadEnvFile`.

## F. Una línea de código que no entendía al principio

```js
const bytes = Buffer.from(textoBase64, 'base64');
```

No entendía por qué había que "convertir" el texto base64 en un Buffer. La
respuesta de la API de imagen llega como un string largo con caracteres
seguros (A–Z, a–z, 0–9, `+`, `/`, `=`) que representan los bytes de la imagen
en otra notación. `Buffer.from(texto, 'base64')` reinterpreta ese texto y
devuelve los bytes reales (un `Buffer`), que es lo único que `writeFileSync`
puede escribir para que el archivo sea una imagen válida.

## G. Un error y cómo lo resolví

**Mensaje de error:**

```
Error: El servicio tardó demasiado en responder.
```

**Contexto:** al generar la imagen del Mundo 1 (Aerópolis), la descripción de
texto se guardó bien pero la API de imágenes de NVIDIA no respondió dentro de
los 60 segundos del timeout y el programa terminó con ese mensaje.

**Cómo lo resolví:** primero aumenté `AbortSignal.timeout(60000)` a
`AbortSignal.timeout(120000)` en `src/imagen.js`. Como seguía fallando,
probé la API directamente con un `fetch` (sin mostrar la clave) y confirmé
que el endpoint del servicio gratuito estaba saturado y tardaba más de 5
minutos: no era un error del código ni de la clave. Lo importante: la
descripción ya estaba guardada en `descripciones/mundo_<id>.txt`, así que al
reintentar el programa retoma desde el `.txt` y no vuelve a gastar cuota del
modelo de texto. El mismo flujo de "resultados parciales" permitió conservar
lo ya hecho y continuar desde donde quedó.
