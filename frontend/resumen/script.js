import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = 'AIzaSyBLTkBVW4xKCtuPw5Oxdy9etL5-P9PEjww';
const genAI = new GoogleGenerativeAI(API_KEY);

// Rol
const rolePrompt = "Eres un asistente que ayuda a resumir textos de manera clara y precisa.";

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
let value = 0;

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
    getNumber(resumenLongitud);
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

    if (wordCount > maxWords) {
        wordCounter.classList.add('warning');
    } else {
        wordCounter.classList.remove('warning');
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

function getNumber(number) {
    return value == number;
}

// Evento para resumir texto al hacer clic en el botón
resumirButton.addEventListener('click', async () => {
    const inputText = editableText.value.trim();
    if (!inputText) {
        copyFeedback.textContent = 'El área de texto está vacía.';
        copyFeedback.style.opacity = '1';
        copyFeedback.style.visibility = 'visible';

        setTimeout(() => {
            copyFeedback.style.opacity = '0';
            copyFeedback.style.visibility = 'hidden';
        }, 2000);
        return;
    }

    resumirButton.disabled = true;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        let fullPrompt = '';
        alert(value);

        if (value >= 0 && value <= 30) {
            fullPrompt = `${rolePrompt}\n\nEl resumen debe ser corto sin exceder la longitud del texto original, Texto:\n${inputText} \n\nResumen:`;
        } else if (value >= 31 && value <= 60) {
            fullPrompt = `${rolePrompt}\n\nEl resumen debe ser medio sin exceder la longitud del texto original, Texto: \n${inputText}\n\nResumen:`;
        } else {
            fullPrompt = `${rolePrompt}\n\nEl resumen debe ser largo sin exceder la longitud del texto original, Texto: \n${inputText}\n\nResumen:`;
        }

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const responseText = await response.text();

        viewOnlyText.value = responseText;
    } catch (error) {
        console.error('Error al generar el resumen:', error);
        copyFeedback.textContent = 'Hubo un error al generar el resumen.';
        copyFeedback.style.opacity = '1';
        copyFeedback.style.visibility = 'visible';

        setTimeout(() => {
            copyFeedback.style.opacity = '0';
            copyFeedback.style.visibility = 'hidden';
        }, 2000);
    } finally {
        resumirButton.disabled = false;
    }
});