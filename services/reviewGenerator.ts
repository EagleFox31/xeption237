
import { GoogleGenAI, Type } from "@google/genai";
import { Review } from "../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Génère des avis clients réalistes basés sur le contexte du produit.
 * Utilise un persona camerounais spécifique.
 */
export const generateProductReviews = async (productName: string, category: string, description: string): Promise<Review[]> => {
  try {
    const ai = getAIClient();
    
    // RAG Context : Injection de la connaissance locale et des règles de notation
    const prompt = `
      CONTEXTE :
      Tu es le moteur de "Preuve Sociale" de Xeption Network, un e-commerce High-Tech au Cameroun.
      Ton rôle est de générer des avis clients réalistes pour rassurer les futurs acheteurs.
      
      PRODUIT CIBLE :
      - Nom : ${productName}
      - Catégorie : ${category}
      - Description : ${description}

      RÈGLES DE GÉNÉRATION (IMPORTANT) :
      1. Quantité : Génère entre 3 et 6 avis.
      2. Note : La moyenne doit être excellente (entre 4.2 et 5.0). Si le produit est "Refurbished/Reconditionné", mentionne que l'état est "propre" ou "quasi neuf".
      3. Identité (CRITIQUE) : Utilise UNIQUEMENT des PRÉNOMS courants au Cameroun.
         - Exemples Garçons : Yannick, Landry, Thierry, Boris, Franck, Cédric, Steve, Loïc, Junior, Arnaud, Patrick, Hervé.
         - Exemples Filles : Sandrine, Vanessa, Carine, Raïssa, Mélissa, Laetitia, Audrey, Brenda, Jessica, Muriel.
         - INTERDIT : N'utilise PAS de noms de famille comme "Talla", "Ngo", "Kamga", "Abena", "Eto'o" comme prénom.
      4. Localisation : Utilise des quartiers précis de Yaoundé (Bastos, Omnisports, Biyem-Assi, Odza, Mendong) et Douala (Akwa, Bonapriso, Bonanjo, Ndogpassi, Ange Raphaël) ou autres villes (Bafoussam, Buea, Garoua).
      5. Langage : Français standard avec une touche locale légère ("Le téléphone est propre", "Validé", "Livraison au calme", "Gère", "Scellé"). Pas trop d'argot, reste professionnel.
      6. Dates : Génère des dates relatives (ex: "Il y a 2 jours", "La semaine dernière").

      FORMAT DE SORTIE (JSON Strict) :
      Une liste d'objets avec : id, author, location, rating (number), text, date.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              author: { type: Type.STRING },
              location: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              text: { type: Type.STRING },
              date: { type: Type.STRING },
            },
            required: ["id", "author", "location", "rating", "text", "date"],
          },
        },
      },
    });

    const reviews = JSON.parse(response.text || '[]');
    
    // Post-traitement pour assurer des IDs uniques si l'IA hallucine des doublons
    return reviews.map((r: any, idx: number) => ({
        ...r,
        id: `rev_${Date.now()}_${idx}`,
        rating: Math.min(5, Math.max(1, r.rating)) // Clamp rating 1-5
    }));

  } catch (error) {
    console.error("Gemini Review Gen Error:", error);
    // Fallback silencieux en cas d'erreur API
    return []; 
  }
};
