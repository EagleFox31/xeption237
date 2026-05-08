
import { GoogleGenAI, Type } from "@google/genai";
import type { Product } from '../types';
import { buildSalesGuideInstruction } from './personas/salesGuide';
import { buildProductEnricherPrompt, parseProductEnricherOutput } from './personas/productEnricher';

// Initialize AI with API Key
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getShoppingAdvice = async (
  userMessage: string,
  chatHistory: { role: 'user' | 'model', text: string }[],
  products: Product[],
) => {
  try {
    const ai = getAIClient();
    const model = 'gemini-3-flash-preview';
    
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

export const generateProductDetails = async (productName: string, category: string) => {
  try {
    const ai = getAIClient();
    const prompt = buildProductEnricherPrompt(productName, category);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING },
                reviewShort: { type: Type.STRING },
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                manualChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
                specs: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT,
                        properties: {
                            label: { type: Type.STRING },
                            value: { type: Type.STRING }
                        },
                        required: ["label", "value"]
                    } 
                }
            },
            required: ["description", "reviewShort", "pros", "cons", "specs", "manualChecks"]
        }
      }
    });

    return parseProductEnricherOutput(response.text || '{}');
  } catch (error) {
    console.error("Gemini Product Gen Error:", error);
    throw new Error("Impossible de générer les détails. Vérifiez votre connexion.");
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
  const ai = getAIClient();

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

export const generateMarketingVideo = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getAIClient();
    
    // Check for API Key selection for Veo (as per SDK requirements)
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
            // Race condition mitigation: assume success after dialog interaction or throw to retry
            // For smoother UX here, we proceed, but in strict env we might wait.
        }
    }

    console.log("Starting Video Generation with prompt:", prompt);

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    console.log("Video operation started...", operation);

    // Polling loop
    while (!operation.done) {
      console.log("Generating video... waiting 5s");
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (videoUri) {
        // Appending API key is required for the download link as per SDK docs
        return `${videoUri}&key=${process.env.API_KEY}`;
    }
    
    return null;

  } catch (error) {
    console.error("Veo Generation Error:", error);
    throw new Error("Erreur génération vidéo: " + (error as any).message);
  }
};
