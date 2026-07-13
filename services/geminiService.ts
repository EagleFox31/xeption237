
import { Type } from '@google/genai';
import type { Product } from '../types';
import { buildSalesGuideInstruction } from './personas/salesGuide';
import {
  buildProductEnricherPrompt,
  parseProductEnricherOutput,
  type ProductEnricherField,
  type ProductEnricherOutput,
  type ProductEnricherContext,
} from './personas/productEnricher';
import { getGeminiClient, GEMINI_TEXT_MODEL } from './geminiClient';
import { deepseekChatJson } from './deepseekClient';

export const getShoppingAdvice = async (
  userMessage: string,
  chatHistory: { role: 'user' | 'model', text: string }[],
  products: Product[],
) => {
  try {
    const ai = getGeminiClient();
    const model = GEMINI_TEXT_MODEL;
    
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: buildSalesGuideInstruction(products, userMessage),
      },
      history: chatHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
    });

    const result = await chat.sendMessage({ message: userMessage });
    return result.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Wanda ! La connexion dérange un peu. On réessaie dans une seconde ?";
  }
};

/** Génère un ou plusieurs champs produit via DeepSeek (field = un champ, 'all' = tout). */
export const generateProductDetails = async (
  productName: string,
  category: string,
  fields?: ProductEnricherField | ProductEnricherField[] | 'all',
  context?: ProductEnricherContext
): Promise<Partial<ProductEnricherOutput>> => {
  try {
    const prompt = buildProductEnricherPrompt(productName, category, fields, context);
    const text = await deepseekChatJson(prompt, { maxTokens: 1600 });
    return parseProductEnricherOutput(text, fields);
  } catch (error) {
    console.error('DeepSeek Product Gen Error:', error);
    throw new Error(
      error instanceof Error
        ? `Impossible de générer les détails : ${error.message}`
        : 'Impossible de générer les détails. Vérifiez la clé DeepSeek et votre connexion.'
    );
  }
};

export const evaluateDeviceWithVision = async (
  photos: File[],
  deviceInfo: {
    brand: string; model: string; storage?: string; ram?: string;
    batteryHealth: number; screenCondition: string;
    bodyCondition: string; accessories: string[];
  }
): Promise<{ score: number; justification: string }> => {
  const ai = getGeminiClient();

  // Conversion des photos en base64 (avant upload Cloudinary)
  const imageParts = await Promise.all(
    photos.map(async (file) => {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      return { inlineData: { mimeType: file.type, data: base64 } };
    })
  );

  const contextPart = {
    text: `Tu es un expert reconditionnement d'appareils électroniques au Cameroun pour Xeption Network.
Analyse les photos de cet appareil déclaré comme suit :
- Marque/Modèle : ${deviceInfo.brand} ${deviceInfo.model}
- Stockage : ${deviceInfo.storage || 'N/A'} | RAM : ${deviceInfo.ram || 'N/A'}
- Santé batterie (déclarée) : ${deviceInfo.batteryHealth}%
- État écran (déclaré) : ${deviceInfo.screenCondition}
- État coque (déclaré) : ${deviceInfo.bodyCondition}
- Accessoires inclus : ${deviceInfo.accessories.join(', ') || 'Aucun'}

Examine attentivement chaque photo et identifie : fissures, rayures, traces d'humidité,
oxydation des ports, état de la caméra, cohérence entre l'état déclaré et le visuel.`,
  };

  const instructionPart = {
    text: `Retourne UNIQUEMENT un JSON valide :
{
  "score": <entier entre 0 et 100>,
  "justification": "<2-3 phrases en français mentionnant ce que tu vois dans les photos>"
}

Barème : 70-100 excellent, 40-69 moyen, 1-39 mauvais état, 0 refus total.
Si l'état déclaré contredit les photos, pénalise fortement et mentionne-le.`,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ parts: [contextPart, ...imageParts, instructionPart] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score:         { type: Type.INTEGER },
          justification: { type: Type.STRING },
        },
        required: ['score', 'justification'],
      },
    },
  });

  return JSON.parse(response.text || '{}');
};
