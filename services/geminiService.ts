import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API client
// The API key is obtained from the environment variable process.env.API_KEY as per strict guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateEmailSubject = async (topic: string, audience: string, tone: string, language: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a single, catchy, high-converting email subject line for a marketing email about "${topic}" targeting "${audience}". 
      The tone should be "${tone}". 
      The language must be "${language}".
      Return ONLY the subject line text, no quotes or prefixes.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating subject:", error);
    return "Exclusive Offer Just for You"; // Fallback
  }
};

export const generateEmailBody = async (topic: string, audience: string, tone: string, type: string, language: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a "${type}" email marketing body copy about "${topic}" for an audience of "${audience}". 
      
      Constraints:
      - Tone: ${tone}
      - Language: ${language}
      - Use placeholders like {{Name}} or {{Company}} where appropriate for personalization.
      - Keep it persuasive and formatted for readability.
      - OUTPUT FORMAT: Plain text only. Do not use HTML tags (like <p>, <br>, <html>). 
      - Use standard spacing for paragraphs.
      
      Return only the body content.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating body:", error);
    return "Hello {{Name}},\n\nCheck out our latest updates."; // Fallback
  }
};

export const spamCheck = async (content: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following email content for spam trigger words or phrases. If it's clean, say "Clean". If there are issues, list them briefly. Content: "${content}"`,
    });
    return response.text.trim();
  } catch (error) {
    return "Could not perform spam check.";
  }
};