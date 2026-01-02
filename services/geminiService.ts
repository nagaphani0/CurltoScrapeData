
import { GoogleGenAI, Type } from "@google/genai";
import { ConversionResponse } from "../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeCurlSchema = async (curlCommand: string): Promise<string[]> => {
  const ai = getAIClient();
  
  const prompt = `
    Analyze the following cURL command and predict the likely JSON response schema.
    Return a flat list of strings representing the most useful field names (use dot notation for nested fields, e.g., 'id', 'user.name', 'meta.count').
    
    cURL Command:
    \`\`\`bash
    ${curlCommand}
    \`\`\`
    
    If the API is well-known (like GitHub, Stripe, generic dummy APIs), use your knowledge to list actual fields. 
    If unknown, infer probable fields based on the resource names in the URL or body.
    Provide at least 5-10 likely fields.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fields: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of predicted JSON fields available in the response."
          }
        },
        required: ["fields"]
      }
    }
  });

  const result = JSON.parse(response.text);
  return result.fields || [];
};

export const convertCurlToPython = async (
  curlCommand: string,
  selectedFields: string[]
): Promise<ConversionResponse> => {
  const ai = getAIClient();
  
  const fieldsDescription = selectedFields.length > 0 
    ? selectedFields.join(", ") 
    : "All fields (no filtering)";

  const prompt = `
    Convert the following cURL command into a clean, professional Python script using the 'requests' library.
    
    cURL Command:
    \`\`\`bash
    ${curlCommand}
    \`\`\`
    
    The user explicitly wants to extract ONLY these specific fields from the JSON response: 
    [ ${fieldsDescription} ]
    
    Requirements:
    1. Include error handling for the network request.
    2. Add specific logic to filter the JSON response. Create a new dictionary/object containing ONLY the selected fields.
    3. If nested fields were selected (e.g., 'user.profile.name'), ensure the Python logic traverses the dictionary safely (using .get() or try/except) to avoid KeyErrors if the field is missing.
    4. Provide a sample 'mock' JSON response that demonstrates exactly what the *filtered* output will look like based on the user's selection.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pythonCode: {
            type: Type.STRING,
            description: "The complete Python script including specific filtering logic for the selected fields.",
          },
          explanation: {
            type: Type.STRING,
            description: "A brief explanation of the code, specifically mentioning how the filtering works.",
          },
          mockResponse: {
            type: Type.STRING,
            description: "A stringified JSON example of the output containing only the selected fields.",
          },
        },
        required: ["pythonCode", "explanation", "mockResponse"],
      },
    },
  });

  const result = JSON.parse(response.text);
  return result;
};
