import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = 'AIzaSyBLTkBVW4xKCtuPw5Oxdy9etL5-P9PEjww';
const genAI = new GoogleGenerativeAI(API_KEY);

// Rol
const rolePrompt = "Eres un asistente especializado en resumir textos de manera clara, precisa y concisa, manteniendo la esencia y los puntos clave del contenido original. Tu tarea es identificar la información más relevante, eliminar redundancias y asegurar que el resumen sea fácil de entender sin perder detalles importantes."

// Referencias a elementos del DOM
const slider = document.getElementById('slider');
const editableText = document.querySelector('.editable-text');
const wordCounter = document.getElementById('word-counter');
const clearButton = document.getElementById('clear-button');
const viewOnlyText = document.querySelector('.view-only-text');
const wordCounter2 = document.getElementById('word-counter-2');
const copyButton = document.getElementById('copy-button');
const copyFeedback = document.getElementById('copy-feedback');
const resumirButton = document.getElementById('resumir-button');

// Configuración
const maxWords = 3000;
const colorStart = [255, 229, 209];
const colorEnd = [255, 134, 80];
let resumenLongitud = 50;

/**
 * Interpolación de colores lineal.
 * Calcula un color intermedio entre dos colores dados y un porcentaje.
 * @param {Array} start - Color inicial en formato RGB.
 * @param {Array} end - Color final en formato RGB.
 * @param {number} percentage - Porcentaje de interpolación (0-1).
 * @returns {Array} Color interpolado en formato RGB.
 */
const interpolateColor = (start, end, percentage) =>
    start.map((val, i) => Math.round(val + (end[i] - val) * percentage));

// Actualiza el fondo del slider
slider.addEventListener('input', (event) => {
    const value = event.target.value;
    const percentage = value / 100;
    const currentColor = interpolateColor(colorStart, colorEnd, percentage);

    slider.style.background = `linear-gradient(to right, rgb(${currentColor.join(',')}) ${value}%, #ffffff ${value}%)`;
});

slider.addEventListener('input', (event) => {
    resumenLongitud = event.target.value; // Actualiza la longitud
    // Mostrar visualmente el porcentaje de resumen ajustado (opcional)
    copyFeedback.textContent = `Longitud del resumen ajustada al ${resumenLongitud}%`;
    copyFeedback.style.opacity = '1';
    copyFeedback.style.visibility = 'visible';
    setTimeout(() => {
        copyFeedback.style.opacity = '0';
        copyFeedback.style.visibility = 'hidden';
    }, 1000);
});

/**
 * Cuenta el número de palabras en un texto.
 * @param {string} text - Texto para contar palabras.
 * @returns {number} Número de palabras en el texto.
 */
const countWords = (text) => {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
};

// Actualizar contador de palabras en el textarea editable
editableText.addEventListener('input', () => {
    const wordCount = countWords(editableText.value);
    wordCounter.textContent = `${wordCount} / ${maxWords}`;

    // Desactivar el botón si el número de palabras es mayor a 3000
    if (wordCount > maxWords) {
        wordCounter.classList.add('warning');
        resumirButton.disabled = true; // Desactivar botón
    } else {
        wordCounter.classList.remove('warning');
        resumirButton.disabled = false; // Activar botón
    }
});

// Función para limpiar el contenido del área editable
clearButton.addEventListener('click', () => {
    editableText.value = '';

    wordCounter.textContent = `0 / ${maxWords}`;
    wordCounter2.textContent = '0 Palabras';

    wordCounter.classList.remove('warning');
});

// Función para copiar el texto del área de solo visualización al portapapeles
copyButton.addEventListener('click', () => {
    if (viewOnlyText.value.trim() === '') {
        copyFeedback.textContent = 'No hay texto para copiar';
        copyFeedback.style.opacity = '1';
        copyFeedback.style.visibility = 'visible';

        setTimeout(() => {
            copyFeedback.style.opacity = '0';
            copyFeedback.style.visibility = 'hidden';
        }, 2000);
        return;
    }

    // Intentar copiar el contenido al portapapeles
    navigator.clipboard.writeText(viewOnlyText.value)
        .then(() => {
            copyFeedback.textContent = 'Texto copiado con éxito';
            copyFeedback.style.opacity = '1';
            copyFeedback.style.visibility = 'visible';

            setTimeout(() => {
                copyFeedback.style.opacity = '0';
                copyFeedback.style.visibility = 'hidden';
            }, 2000);
        })
        .catch(() => {
            copyFeedback.textContent = 'Error al copiar el texto';
            copyFeedback.style.opacity = '1';
            copyFeedback.style.visibility = 'visible';

            setTimeout(() => {
                copyFeedback.style.opacity = '0';
                copyFeedback.style.visibility = 'hidden';
            }, 2000);
        });
});

// Función para mostrar el feedback de error o éxito
function showFeedback(message, duration = 4000) {
    copyFeedback.textContent = message;
    copyFeedback.style.opacity = '1';
    copyFeedback.style.visibility = 'visible';

    setTimeout(() => {
        copyFeedback.style.opacity = '0';
        copyFeedback.style.visibility = 'hidden';
    }, duration);
}

function animateText(element, text, speed = 50) {
    let index = 0;
    element.value = '';  // Limpiar el campo antes de empezar la animación

    const interval = setInterval(() => {
        if (index < text.length) {
            element.value += text.charAt(index);
            index++;
        } else {
            clearInterval(interval); // Detener la animación cuando el texto esté completo
        }
    }, speed);
}

// Evento para resumir texto al hacer clic en el botón
resumirButton.addEventListener('click', async () => {
    const inputText = editableText.value.trim();
    if (!inputText) {
        showFeedback('El área de texto está vacía.');
        return;
    }

    resumirButton.disabled = true;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // Ajustar el tipo de resumen según el valor de `value`
        let fullPrompt;

        if (resumenLongitud >= 0 && resumenLongitud <= 30) {
            // Resumen corto
            fullPrompt = `${rolePrompt}\n\nTu tarea es generar un resumen **muy breve y conciso** que capture solo las ideas principales del texto original. El resumen debe ser lo más preciso posible y no debe extenderse más allá de lo necesario. No debe exceder la longitud del texto original. Texto:\n${inputText}\n\nResumen:`;
        } else if (resumenLongitud >= 31 && resumenLongitud <= 60) {
            // Resumen medio
            fullPrompt = `${rolePrompt}\n\nGenera un resumen **moderadamente detallado**, que cubra las ideas principales y explique los puntos clave del texto de manera clara. El resumen debe ser informativo, pero aún debe ser relativamente breve, sin extenderse más allá de lo necesario. No debe exceder la longitud del texto original. Texto:\n${inputText}\n\nResumen:`;
        } else {
            // Resumen largo
            fullPrompt = `${rolePrompt}\n\nTu tarea es generar un resumen **detallado y exhaustivo**, que cubra todos los puntos importantes del texto original, incluyendo ejemplos y explicaciones cuando sea necesario. El resumen debe ser claro y completo, pero no debe exceder la longitud del texto original. Texto:\n${inputText}\n\nResumen:`;
        }

        // Generar el contenido con el modelo
        const result = await model.generateContent(fullPrompt);
        const responseText = await result.response.text();

        animateText(viewOnlyText, responseText, 8); // 50ms de retraso entre cada letra

    } catch (error) {
        console.error('Error al generar el resumen:', error);
        showFeedback('Hubo un error al generar el resumen.');
    } finally {
        resumirButton.disabled = false;
    }
});
