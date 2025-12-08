import { GoogleGenAI, Type } from "@google/genai";
import { GiftSuggestion } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

// Initialize the client
let ai: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

export const getGiftSuggestions = async (
  gifteeName: string,
  interests: string,
  budget: string
): Promise<GiftSuggestion[]> => {
  if (!ai) {
    console.warn("Gemini API Key missing");
    return [
      { title: "Tarjeta de Regalo", description: "Una opción segura cuando no sabes qué regalar.", estimatedPrice: budget },
      { title: "Algo hecho a mano", description: "Un detalle personalizado siempre es valorado.", estimatedPrice: "Variable" },
      { title: "Caja de Chocolates", description: "Un clásico dulce que no suele fallar.", estimatedPrice: "Bajo" }
    ];
  }

  try {
    const prompt = `Sugiere 3 regalos creativos y específicos para ${gifteeName}. 
    Sus intereses son: ${interests || "No especificados, sugiere algo general pero bonito"}.
    El presupuesto límite es: ${budget || "Moderado"}.
    Responde en español y sé creativo.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Nombre corto del regalo" },
              description: { type: Type.STRING, description: "Por qué es buena idea en 1 frase" },
              estimatedPrice: { type: Type.STRING, description: "Precio estimado en moneda local" }
            },
            required: ["title", "description", "estimatedPrice"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GiftSuggestion[];
    }
    
    throw new Error("No data returned");

  } catch (error) {
    console.error("Error fetching gift suggestions:", error);
    // Fallback in case of error
    return [
      { title: "Experiencia Gourmet", description: "Algo delicioso para comer o beber.", estimatedPrice: budget },
      { title: "Libro Best-Seller", description: "Una lectura popular del momento.", estimatedPrice: "Variable" },
      { title: "Accesorio de Tecnología", description: "Útil y práctico para el día a día.", estimatedPrice: budget }
    ];
  }
};

export const generateAvatar = async (name: string, description: string, style: string = '3D Cartoon'): Promise<string | null> => {
  if (!ai) return null;

  try {
    // Using gemini-2.5-flash-image for image generation
    let prompt = '';
    
    if (style === 'Custom') {
        prompt = `Generate a square avatar based on this specific description: ${description}. 
                 The image should be a single character portrait, centered, with a simple background. High quality, expressive.`;
    } else {
        prompt = `Generate a square avatar of a person named ${name}. 
                 Style: ${style}. 
                 Key elements/interests to include visually: ${description}. 
                 The image should be a single character portrait, centered, with a simple solid or gradient background. High quality, expressive.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
        ],
      },
      config: {
        // Nano banana models do not support responseMimeType or responseSchema
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating avatar:", error);
    return null;
  }
};