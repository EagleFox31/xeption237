
import { Type } from '@google/genai';
import { getGeminiClient, withGeminiModelChain, GEMINI_TEXT_MODELS } from './geminiClient';

export const evaluateDeviceWithVision = async (