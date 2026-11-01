# mundos-ia

Programa de consola que genera **bocetos visuales de mundos imaginarios**:
recibe una situación, un mundo y 5 colores, pide la **descripción** de la imagen
a un modelo de lenguaje gratuito y genera la **imagen** con un modelo de
imágenes gratuito.

## Qué hace

1. Valida los 7 argumentos y guarda el mundo en `data/mundo_<id>.json`.
2. Lee ese JSON desde el archivo y lo envía a la **API de texto** para obtener
   una descripción en inglés (guardada en `descripciones/mundo_<id>.txt`).
3. Envía esa descripción a la **API de imágenes** y guarda el resultado en
   `imagenes/mundo_<id>.jpg`.

Si ejecutas el mismo comando otra vez, **no vuelve a llamar a las APIs**
(reutiliza el `.txt` y la imagen ya generados y ahorra tu cuota gratuita).

## Requisitos

- Node.js 20.12 o superior (`node -v`).
- npm y Git.
- Una cuenta gratuita en el servicio de texto y otra en el de imágenes (abajo).

## Configuración

1. Copia el archivo de ejemplo y pega tus claves:

   ```
   cp .env.example .env        # en Windows: copy .env.example .env
   ```

2. Edita `.env` con las claves de tus servicios (el archivo `.env` **no** se
   sube a Git: está en `.gitignore`).
3. Instala la única dependencia:

   ```
   npm install
   ```

## Ejemplo de uso

```
npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta
```

Las comillas son necesarias: sin ellas, cada palabra de la situación o del
mundo llegaría como un argumento distinto.

Salida esperada:

```
Paso 1: mundo guardado en data/mundo_3f9a1c2e.json
Paso 2: descripción guardada en descripciones/mundo_3f9a1c2e.txt
Paso 3: imagen guardada en imagenes/mundo_3f9a1c2e.jpg
Listo. Revisa la carpeta imagenes/
```

Segunda ejecución (ahorro de cuota):

```
Paso 1: mundo guardado en data/mundo_3f9a1c2e.json
Paso 2: la descripción ya existía, no se llamó al modelo de texto.
Paso 3: la imagen ya existía, no se llamó al modelo de imágenes.
Listo. Revisa la carpeta imagenes/
```

## Estructura de carpetas

```
mundos-ia/
├── src/
│   ├── index.js     # orquesta los pasos 1 a 3
│   ├── mundo.js     # valida los argumentos, crea el objeto y lo guarda o lee (JSON)
│   ├── texto.js     # consulta al modelo de lenguaje (fetch)
│   └── imagen.js    # consulta al modelo de imágenes (fetch) y devuelve los bytes
├── data/            # mundo_<id>.json        (no va a Git)
├── descripciones/   # mundo_<id>.txt         (no va a Git)
├── imagenes/        # mundo_<id>.jpg         (no va a Git)
├── .env             # tus claves             (no va a Git)
├── .env.example     # mismas variables, sin claves reales
├── .gitignore
├── package.json
├── PROMPT.md        # declaración y proceso del uso de IA
└── README.md
```

## Servicios utilizados

| Servicio | Para | URL |
| --- | --- | --- |
| Groq (`openai/gpt-oss-20b`) | Texto (descripción) | https://console.groq.com |
| Pollinations | Imágenes | https://pollinations.ai |

Nota sobre la imagen: el proyecto usa Pollinations (sin clave) porque el
endpoint de NVIDIA FLUX.1-schnell estuvo saturado/caído durante las pruebas
(más de 5 minutos por petición). El código de `src/imagen.js` soporta ambos:
si pones en `IMAGEN_URL` la de NVIDIA, vuelve al formato JSON con base64
(`artifacts[0].base64` y `finishReason SUCCESS`); si pones la de Pollinations,
usa GET con `encodeURIComponent` y bytes directos. Límite de Pollinations:
1 imagen cada 45 segundos por IP (si lo superas responde 402 `FREE_LIMIT`).

## Errores explicados (Parte 5)

El programa traduce los errores a mensajes claros en español:

| Situación | Mensaje |
| --- | --- |
| 401 o 403 | `La API key no es válida. Revisa tu archivo .env.` |
| 402 o 429 | `Superaste el límite gratuito. Espera un momento (revisa el encabezado retry-after si existe).` |
| 404 o 410 | `El modelo o la URL no existen. Revisa tu configuración.` |
| Sin conexión (TypeError) | `No se pudo conectar. Revisa tu internet o la URL.` |
| Tiempo agotado | `El servicio tardó demasiado en responder.` |

## Experimento: `npm publish --dry-run` y el `.gitignore` (Parte 6)

`npm publish` **no** incluye en el paquete los directorios `data/`,
`descripciones/` e `imagenes/`, ni el archivo `.env`: npm respeta el
`.gitignore` cuando no existe un `.npmignore`.

Para comprobarlo se hizo el experimento (resultado real guardado en
`evidencias/dryrun_con_gitignore.txt` y `evidencias/dryrun_sin_gitignore.txt`):

1. Con el `.gitignore` normal, `npm publish --dry-run` publicaría **23
   archivos** y **NO aparece `.env`** ni `data/`, `descripciones/`,
   `imagenes/`: solo `README.md`, `package.json`, `.env.example`, `PROMPT.md`
   y `src/`.
2. Al renombrar temporalmente `.gitignore` a `.gitignore.off` y repetir el
   comando, el paquete sube a **33 archivos** y **aparece el `.env` (605B, con
   tus claves reales)**, además de `data/`, `descripciones/`, `imagenes/` y
   `.gitignore.off`.

**Por qué es peligroso:** si publicaras el paquete en npm sin el `.gitignore`,
cualquier persona que lo descargue podría leer tus claves de API dentro del
`.env` y gastar tu cuota gratuita (o peor). Las claves reales **nunca** deben
subirse ni compartirse. Se restauró el nombre `.gitignore` después del
experimento.

## Preguntas de reflexión

**¿Por qué el id se calcula sin la fecha? ¿Qué pasaría si la incluyeras?**

Porque el id identifica los *datos del mundo* (situación, mundo y colores), no
el momento en que se creó. Si se incluyera `creadoEn` en el hash, cada
ejecución generaría un id distinto aunque los datos fueran los mismos, y el
programa nunca podría reutilizar los archivos ya generados (llamaría a las
APIs cada vez, gastando cuota).

**¿Por qué se le pide al modelo de texto la descripción en inglés?**

Los modelos de imágenes entienden mejor las descripciones en inglés: la
mayoría se entrenaron con millones de pares *texto-imagen* en inglés, así que
la imagen generada suele ser más fiel a la descripción. Si se probara en
español, la calidad puede bajar o algunos detalles (iluminación, estilo)
podrían interpretarse distinto.

**¿Qué diferencia hay entre una respuesta JSON de texto y una respuesta con
los bytes de una imagen? ¿Qué es base64?**

Una respuesta de texto es un JSON con caracteres legibles (UTF-8). Una imagen
son *bytes binarios* (0 y 1: cabecera JPEG `FF D8`, píxeles, etc.). Como la
API de imágenes entrega esos bytes en un JSON, se transportan en **base64**,
una forma de escribir bytes usando solo caracteres de texto seguro
(A–Z, a–z, 0–9, `+`, `/`, `=`). Para recuperar la imagen hay que convertir ese
texto con `Buffer.from(textoBase64, 'base64')` y escribir el `Buffer` **sin**
`'utf-8'`.

**¿Qué pasaría si guardas la imagen con 'utf-8'? ¿Por qué?**

El archivo `.jpg` quedaría dañado y no se abriría. `'utf-8'` es una
codificación de *texto*: obliga a convertir los bytes a caracteres, rompiendo
la estructura binaria de la imagen. Aún sin `'utf-8'`, guardar el JSON
completo (o el base64 como texto) también daña el archivo; lo que se guarda
son los **bytes** del `Buffer`.

**¿Qué pasos consumen cuota gratuita y cómo evitaste repetirlos?**

Consumen cuota la llamada a la API de texto (Paso 2) y la de imágenes
(Paso 3); el Paso 1 es solo local. Para no repetirlas, antes de cada llamada
se comprueba con `fs.existsSync` si `descripciones/mundo_<id>.txt` o
`imagenes/mundo_<id>.jpg` ya existen: si existen, se reutilizan y se avisa en
consola.

**Si usaste IA: ¿qué fue lo más difícil de pedirle y qué parte tuviste que
corregir tú?**

Lo más difícil fue pedirle que respetara las reglas del taller (sin `dotenv`,
sin `axios`, sin SDK) y que el sistema de mensajes del modelo de texto fuera
exacto (un párrafo en inglés, 80-120 palabras, con los 5 colores). Tuve que
corregir a mano el guardado de la imagen (la primera versión la escribía como
texto con `'utf-8'`, por lo que la imagen salía dañada) y quitar librerías que
propuso y no estaban permitidas. Todo el proceso está declarado en
`PROMPT.md`.

## Recuperar el proyecto al clonar

```
git clone <url-del-repositorio> mundos-ia
cd mundos-ia
cp .env.example .env     # o copy .env.example .env
npm install
npm start -- "..." "..." rojo azul verde dorado violeta
```

## Licencia

MIT