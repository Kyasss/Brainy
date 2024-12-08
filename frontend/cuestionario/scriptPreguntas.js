import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiQuizGenerator {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.initializeModel();
    }

    initializeModel() {
        return this.genAI.getGenerativeModel({
            model: "gemini-pro",
            generationConfig: {
                temperature: 0.1,
                topP: 0.8,
                topK: 40,
            },
        });
    }

    async generateQuiz(topic) {
        const [quizPromise, summaryPromise] = await Promise.all([
            this.generateQuizQuestions(topic),
            this.generateTopicSummary(topic)
        ]);

        try {
            const [quizResult, summary] = await Promise.all([quizPromise, summaryPromise]);
            const quizText = quizResult.response.text();

            // Guardar el resumen en localStorage
            localStorage.setItem('topicSummary', summary.response.text().trim());

            return this.parseQuizResponse(quizText);
        } catch (error) {
            console.error("Quiz Generation Error:", error);
            return this.createFallbackQuiz(topic);
        }
    }

    async generateQuizQuestions(topic) {
        const prompt = this.createQuizPrompt(topic);
        return await this.model.generateContent(prompt);
    }

    async generateTopicSummary(topic) {
        const summaryPrompt = `Resume el siguiente tema en dos palabras que mejor lo represente: "${topic}"`;
        return await this.model.generateContent(summaryPrompt);
    }

    parseQuizResponse(quizText) {
        try {
            const parsedQuiz = JSON.parse(quizText);

            const quizData = parsedQuiz.quiz || parsedQuiz.quizz;

            if (quizData && quizData.questions && quizData.questions.length >= 10) {
                return quizData.questions;
            } else {
                console.error("El cuestionario generado tiene menos de 10 preguntas, generando preguntas adicionales.");
                return this.createFallbackQuiz("Topic", 10);  // Generar 10 preguntas de respaldo
            }
        } catch (error) {
            console.error("Error parsing JSON:", error);
            return this.createFallbackQuiz("Topic", 10);  // Generar 10 preguntas de respaldo en caso de error
        }
    }


    createQuizPrompt(topic) {
        return `Genera un cuestionario en formato JSON sobre: ${topic}. 

INSTRUCCIONES IMPORTANTES:
1. Responde SOLO con un objeto JSON sin markdown ni bloques de código
2. Las preguntas deben:
   - Ser cortas y directas (máximo 15 palabras)
   - Ser claras y específicas
   - Evaluar diferentes aspectos del tema
   - Tener respuestas concisas (máximo 5 palabras por opción)
   - Evitar ambigüedades

3. Usa exactamente este formato JSON:
{
  "quizz": {
    "name": "Cuestionario sobre [tema]",
    "description": "Evaluación de conocimientos sobre [tema]",
    "questions": [
      {
        "questionText": "Pregunta corta y directa?",
        "difficulty": "básico|intermedio|avanzado",
        "answers": [
          {"answerText": "Respuesta breve 1", "isCorrect": false},
          {"answerText": "Respuesta breve 2", "isCorrect": true},
          {"answerText": "Respuesta breve 3", "isCorrect": false},
          {"answerText": "Respuesta breve 4", "isCorrect": false}
        ]
      }
      // Generar exactamente 10 preguntas
    ]
  }
}

REQUISITOS ADICIONALES:
- Preguntas de máximo 15 palabras
- Respuestas de máximo 5 palabras
- Mezclar preguntas de diferentes niveles de dificultad
- Las respuestas incorrectas deben ser plausibles
- Variar la posición de la respuesta correcta`;
    }

    createFallbackQuiz(topic) {
        return [{
            questionText: `Error generando preguntas sobre ${topic}. Inténtalo de nuevo.`,
            answers: [
                { "answerText": "A", "isCorrect": false },
                { "answerText": "B", "isCorrect": true },
                { "answerText": "C", "isCorrect": false },
                { "answerText": "D", "isCorrect": false }
            ]
        }];
    }
}

// Quiz Application UI and Logic
class QuizApplication {
    constructor(quizGenerator) {
        this.quizGenerator = quizGenerator;
        this.initializeDOM();
        this.bindEvents();
    }

    initializeDOM() {
        this.questionText = document.getElementById('question-text');
        this.options = document.querySelectorAll('.option');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.progressBar = document.getElementById('progress');

        // Contenedor de carga (spinner)
        this.loadingContainer = document.createElement('div');
        this.loadingContainer.classList.add('loading-container');
        this.loadingContainer.innerHTML = '<div class="spinner"></div>'; // Spinner
        document.body.appendChild(this.loadingContainer); // Agregar al body

        this.currentQuestionIndex = 0;
        this.questions = [];
        this.userAnswers = [];
    }

    bindEvents() {
        this.options.forEach(option => {
            option.addEventListener('click', this.handleOptionSelection.bind(this));
        });

        this.prevBtn.addEventListener('click', this.navigatePrevious.bind(this));
        this.nextBtn.addEventListener('click', this.navigateNext.bind(this));
    }

    initializeQuiz() {
        const topic = localStorage.getItem('selectedTopic');

        if (!topic) {
            console.error('No se ha seleccionado un tema');
            return;
        }

        this.questionText.textContent = "Generando cuestionario...";
        // Mostrar el spinner mientras se genera el cuestionario
        this.loadingContainer.style.display = 'flex';

        this.quizGenerator.generateQuiz(topic)
            .then(generatedQuestions => {
                // Ocultar el spinner una vez generadas las preguntas
                this.loadingContainer.style.display = 'none';
                
                if (!generatedQuestions || generatedQuestions.length === 0) {
                    throw new Error('No se generaron preguntas');
                }

                this.questions = generatedQuestions;
                this.userAnswers = new Array(this.questions.length).fill(null);

                this.displayQuestion(this.currentQuestionIndex);
                this.updateProgressBar();
            })
            .catch(error => {
                console.error('Error al inicializar el cuestionario:', error);
                this.questionText.textContent = 'Error al generar el cuestionario. Intente de nuevo.';
            });
    }

    handleOptionSelection(event) {
        const selectedOption = event.target;
        const selectedAnswerText = selectedOption.textContent;

        // Marcar la opción seleccionada
        this.options.forEach(opt => opt.classList.remove('selected'));
        selectedOption.classList.add('selected');

        // Buscar la opción en la respuesta y almacenar el índice correspondiente
        const selectedIndex = Array.from(this.options).findIndex(option => option.textContent === selectedAnswerText);

        this.userAnswers[this.currentQuestionIndex] = selectedIndex;

        this.nextBtn.disabled = false;
    }

    navigatePrevious() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion(this.currentQuestionIndex);
            this.updateProgressBar();
        }
    }

    navigateNext() {
        console.log('Preguntas actuales:', this.questions);
        console.log('Respuestas del usuario:', this.userAnswers);

        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion(this.currentQuestionIndex);
            this.updateProgressBar();
        } else {
            this.showResults();
        }
    }

    displayQuestion(index) {
        const currentQuestion = this.questions[index];
        this.questionText.textContent = currentQuestion.questionText;

        this.options.forEach((option, i) => {
            option.textContent = currentQuestion.answers[i].answerText;
            option.classList.remove('selected');
            option.setAttribute('data-correct', currentQuestion.answers[i].isCorrect);
        });

        this.updateNavigationButtons(index);
    }

    updateNavigationButtons(index) {
        this.prevBtn.disabled = index === 0;
        this.nextBtn.disabled = this.userAnswers[index] === null;
    }

    updateProgressBar() {
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        this.progressBar.style.width = `${progress}%`;
    }

    showResults() {
        // Verificar que haya preguntas y respuestas
        if (!this.questions || this.questions.length === 0) {
            console.error('No hay preguntas para mostrar resultados');
            return;
        }

        const correctAnswers = this.calculateCorrectAnswers();
        this.createResultsModal(correctAnswers);
    }


    calculateCorrectAnswers() {
        return this.questions.filter((question, index) => {
            if (this.userAnswers[index] === null) return false;

            const selectedAnswerIndex = this.userAnswers[index];
            const selectedOption = question.answers[selectedAnswerIndex];  // Obtener la opción seleccionada por índice

            // Verificar si la respuesta seleccionada es correcta
            return selectedOption && selectedOption.isCorrect === true;
        }).length;
    }

    createResultsModal(correctAnswers) {
        const topic = localStorage.getItem('selectedTopic');
        const topicSummary = localStorage.getItem('topicSummary') || 'No disponible';

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'custom-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Resultados del Cuestionario</h2>
                <p>Tema de estudio: ${topicSummary}</p>
                <p>Preguntas correctas: ${correctAnswers} de ${this.questions.length}</p>
                <button id="modal-close">Cerrar</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        document.getElementById('modal-close').addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        });

        overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        });
    }
}

// Application Initialization
document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = 'AIzaSyBLTkBVW4xKCtuPw5Oxdy9etL5-P9PEjww';
    const quizGenerator = new GeminiQuizGenerator(API_KEY);
    const quizApp = new QuizApplication(quizGenerator);

    quizApp.initializeQuiz();
});