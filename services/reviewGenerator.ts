
import { GoogleGenAI, Type } from "@google/genai";
import { Review } from "../types";
import { buildReviewSynthesizerPrompt, parseReviewSynthesizerOutput } from "./personas/reviewSynthesizer";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Génère des avis clients réalistes basés sur le contexte du produit.
 * Utilise un persona camerounais spécifique.
 */
export const generateProductReviews = async (productName: string, category: string, description: string): Promise<Review[]> => {
  try {
    const ai = getAIClient();
    const prompt = buildReviewSynthesizerPrompt(productName, category, description);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reviews: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  author: { type: Type.STRING },
                  location: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                  date: { type: Type.STRING },
                },
                required: ["author", "location", "rating", "text", "date"],
              },
            },
          },
          required: ["reviews"],
        },
      },
    });

    return parseReviewSynthesizerOutput(response.text || '{}').reviews;

  } catch (error) {
    console.error("Gemini Review Gen Error:", error);
    // Fallback silencieux en cas d'erreur API
    return []; 
  }
};
