import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

export const getShoppingAdvice = async (userMessage: string, chatHistory: { role: 'user' | 'model', text: string }[]) => {
  try {
    // Initialize GoogleGenAI right before the API call to ensure we use the correct injected process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    
    // Create a chat session with the specified model and system instructions
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
    // Use the .text property to access the response content
    return result.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Wanda ! La connexion dérange un peu. On réessaie dans une seconde ?";
  }
};