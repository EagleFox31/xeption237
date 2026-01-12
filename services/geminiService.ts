import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getShoppingAdvice = async (userMessage: string, chatHistory: { role: 'user' | 'model', text: string }[]) => {
  try {
    const model = 'gemini-3-flash-preview';
    
    // Transform simple history to format expected by Chat if needed, 
    // but here we will just use generateContent with history included in prompt for simplicity 
    // or maintain a chat session. Let's use chat session for better context.
    
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