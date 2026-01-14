
import { GoogleGenAI, Type } from "@google/genai";
import { ConversionResponse } from "../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface AnalysisResult {
  responseFields: string[];
  volatileInputs: Array<{
    name: string;
    currentValue: string;
    type: 'header' | 'query' | 'body';
    description: string;
  }>;
}

export const analyzeCurlSchema = async (curlCommand: string): Promise<AnalysisResult> => {
  const ai = getAIClient();
  
  const prompt = `
    Analyze the following cURL command. 
    1. Predict the likely JSON response schema (useful field names in dot notation).
    2. Identify "Volatile Inputs": These are parts of the request that are likely to expire or need changing tomorrow (e.g., Authorization tokens, API keys, session cookies, timestamps, or nonce values).
    
    cURL Command:
    \`\`\`bash
    ${curlCommand}
    \`\`\`
    
    Return a JSON object with:
    - 'responseFields': array of predicted response field names.
    - 'volatileInputs': array of objects { name, currentValue, type, description } for things like 'Authorization', 'Cookie', etc.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          responseFields: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          volatileInputs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                currentValue: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['header', 'query', 'body'] },
                description: { type: Type.STRING }
              },
              required: ["name", "currentValue", "type", "description"]
            }
          }
        },
        required: ["responseFields", "volatileInputs"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const convertCurlToPython = async (
  curlCommand: string,
  selectedFields: string[],
  volatileInputs: any[]
): Promise<ConversionResponse> => {
  const ai = getAIClient();
  
  const fieldsDescription = selectedFields.length > 0 
    ? selectedFields.join(", ") 
    : "All fields";

  const prompt = `
    Convert this cURL to a production-ready Python script using 'requests'.
    
    cURL:
    \`\`\`bash
    ${curlCommand}
    \`\`\`
    
    Selected Response Extraction: [ ${fieldsDescription} ]
    
    CRITICAL INSTRUCTION:
    The user needs to run this script repeatedly, but some fields (tokens/headers) might expire.
    1. Create a "CONFIGURATION" section at the top of the script using variables or a dictionary.
    2. Put all identified volatile inputs (${JSON.stringify(volatileInputs)}) into this configuration section.
    3. Use these variables in the actual request call.
    4. Ensure the response is handled as JSON.
    5. Filter the response to include ONLY the selected fields.
    6. Include a 'mockResponse' that shows the filtered output.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pythonCode: { type: Type.STRING },
          explanation: { type: Type.STRING },
          mockResponse: { type: Type.STRING },
        },
        required: ["pythonCode", "explanation", "mockResponse"],
      },
    },
  });

  return JSON.parse(response.text);
};
