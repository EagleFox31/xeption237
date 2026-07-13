
import { Review } from "../types";
import { buildReviewSynthesizerPrompt, parseReviewSynthesizerOutput } from "./personas/reviewSynthesizer";
import { deepseekChatJson } from "./deepseekClient";

/**
 * Génère des avis clients réalistes basés sur le contexte du produit (DeepSeek).
 */
export const generateProductReviews = async (productName: string, category: string, description: string): Promise<Review[]> => {
  try {
    const prompt = buildReviewSynthesizerPrompt(productName, category, description);
    const text = await deepseekChatJson(prompt, { maxTokens: 900, temperature: 0.2 });
    return parseReviewSynthesizerOutput(text).reviews;
  } catch (error) {
    console.error("DeepSeek Review Gen Error:", error);
    return [];
  }
};
