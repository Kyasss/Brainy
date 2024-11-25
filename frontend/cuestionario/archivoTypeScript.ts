import { NextRequest, NextResponse } from "next/server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { GoogleGenerativeAI } from "@google/generative-ai";
import saveQuizz from "./saveToDb";

// Inicializar la API de Gemini
const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Función auxiliar para limpiar la respuesta JSON
function cleanJsonResponse(response: string): string {
  // Eliminar bloques de código en markdown, si están presentes
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Eliminar espacios en blanco adicionales
  cleaned = cleaned.trim();
  return cleaned;
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const document = body.get("pdf");

  try {
    // Cargar y procesar el PDF
    const pdfLoader = new PDFLoader(document as Blob, {
      parsedItemSeparator: " ",
    });

    const docs = await pdfLoader.load();
    const selectedDocuments = docs.filter((doc) => doc.pageContent !== undefined);
    const texts = selectedDocuments.map((doc) => doc.pageContent);
    const content = texts.join("\n");

    // Inicializar el modelo generativo de Gemini con la configuración
    const model = genai.getGenerativeModel({
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
      },
    });

    // Crear el prompt para la generación del cuestionario
    const prompt = `
    Generate a valid JSON quiz based on this content:

    ${content}

    Generate exactly 3 multiple choice questions following these rules:
    1. Each question must have exactly 4 options
    2. Only one answer should be correct
    3. Questions must be based on the document content
    4. Use clear academic language

    Return ONLY the JSON with this exact structure:
    {
      "quizz": {
        "name": "Quiz about [topic]",
        "description": "3 questions quiz about [topic]",
        "questions": [
          {
            "questionText": "Question text here?",
            "answers": [
              {"answerText": "Option 1", "isCorrect": false},
              {"answerText": "Option 2", "isCorrect": true},
              {"answerText": "Option 3", "isCorrect": false},
              {"answerText": "Option 4", "isCorrect": false}
            ]
          }
        ]
      }
    }

    DO NOT include any markdown formatting, code blocks, or additional text. Return the JSON object directly.`;

    // Generar el cuestionario usando Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const quizText = response.text();

    // Limpiar la respuesta antes de analizarla
    const cleanedQuizText = cleanJsonResponse(quizText);
    console.log("Cleaned response:", cleanedQuizText); // Para depuración

    try {
      // Parsear el JSON generado
      const quizJson = JSON.parse(cleanedQuizText);

      // Guardar el cuestionario en la base de datos
      try {
        const { quizzId } = await saveQuizz(quizJson.quizz);

        // Responder con el ID del cuestionario guardado
        return NextResponse.json({ quizzId }, { status: 200 });
      } catch (dbError) {
        console.error("Error saving quiz to the database:", dbError);
        return NextResponse.json(
          { error: "Failed to save quiz to the database" },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
      console.error("Raw response:", quizText);
      console.error("Cleaned response:", cleanedQuizText);
      return NextResponse.json(
        { error: "Failed to parse quiz JSON" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
}