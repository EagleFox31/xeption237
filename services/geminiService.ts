
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

// Initialize AI with API Key
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getShoppingAdvice = async (userMessage: string, chatHistory: { role: 'user' | 'model', text: string }[]) => {
  try {
    const ai = getAIClient();
    const model = 'gemini-3-flash-preview';
    
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
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
    const prompt = `
      Je veux ajouter le produit "${productName}" (Catégorie: ${category}) sur mon site e-commerce Tech au Cameroun.
      Génère-moi les informations marketing et techniques au format JSON strict.
      
      Le ton doit être "Tech & Chill", expert mais accessible.
      
      Structure attendue :
      {
        "description": "Une description commerciale accrocheuse (2-3 phrases)",
        "reviewShort": "Un verdict court et percutant (1 phrase)",
        "pros": ["Point fort 1", "Point fort 2", "Point fort 3"],
        "cons": ["Point faible 1", "Point faible 2"],
        "specs": [
          {"label": "Écran", "value": "ex: 6.7 pouces AMOLED"},
          {"label": "Processeur", "value": "ex: Snapdragon 8 Gen 2"},
          {"label": "Stockage", "value": "ex: 256 Go"},
           ... autres specs pertinentes
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Using strict schema with 'required' fields to ensure pros/cons are generated
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING },
                reviewShort: { type: Type.STRING },
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } },
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
            required: ["description", "reviewShort", "pros", "cons", "specs"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Product Gen Error:", error);
    throw new Error("Impossible de générer les détails. Vérifiez votre connexion.");
  }
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
