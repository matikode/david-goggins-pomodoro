# David Goggins Pomodoro Timer

"STAY HARD" - Un temporizador Pomodoro minimalista e implacable, inspirado en la filosofía de David Goggins. Diseñado para mantenerte concentrado, sin excusas y construyendo disciplina.

## Características Principales

- **Temporizador Personalizable**: Ajusta los tiempos de trabajo (Work), descanso corto (Break) y descanso largo (Long Break).
- **Estética Militar / Oscura**: Interfaz sin distracciones con los clásicos "Dog Tags" (placas de identificación) para llevar la cuenta de los ciclos completados (4 Pomodoros antes de un descanso largo).
- **Historial de Sesiones**: Registra automáticamente cada sesión de trabajo completada de forma local en el navegador, para que sepas exactamente cuánto tiempo has dedicado.
- **Frases Motivacionales Aleatorias**: Cada vez que termina un ciclo o inicias uno nuevo, recibirás una dosis de motivación directa.

## Instalación y Uso

Como es un proyecto basado completamente en HTML, CSS y JavaScript (sin dependencias complejas), usarlo es extremadamente sencillo:

1. **Clona este repositorio:**
   ```bash
   git clone https://github.com/matikode/david-goggins-pomodoro.git
   ```
2. **Abre el proyecto:**
   Simplemente haz doble clic en el archivo `index.html` para abrirlo en tu navegador favorito. No requiere instalación de Node.js ni bases de datos.
   *(Opcional: puedes usar extensiones como Live Server en VSCode o ejecutar `npx serve` para servirlo localmente).*

## Configuración de Voz / Audio (Importante)

Por defecto, la aplicación utiliza el motor de voz robótico integrado en el navegador para decir las frases motivacionales. Si quieres llevarlo al siguiente nivel y **escuchar la voz real**, debes añadir los audios en formato MP3 manualmente (por cuestiones de copyright no se incluyen en el repositorio).

1. Crea o descarga tus clips de audio.
2. Colócalos en la carpeta `assets/audio/`.
3. Nómbralos exactamente así:
   - **Inicio:** `start_0.mp3`, `start_1.mp3`, `start_2.mp3`, `start_3.mp3`, `start_4.mp3`
   - **Frases:** `quote_0.mp3`, `quote_1.mp3`, `quote_2.mp3`, `quote_3.mp3`, `quote_4.mp3`
   - **Fin de descanso:** `break_end.mp3`

El código detectará automáticamente si el archivo existe y lo reproducirá; de lo contrario, volverá a la voz robótica como plan B.

---

> *"Don't stop when you're tired. Stop when you're done."*

<p align="center">
  <br>
  <small>Built by <a href="https://github.com/matikode">matikode</a></small>
</p>
