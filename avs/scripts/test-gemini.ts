
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

// Load env from avs/.env
dotenv.config({ path: path.join(__dirname, "../.env") });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function verifyWithGemini(question: string) {
    const models = ["gemini-2.5-flash-lite-preview-09-2025"];
    
    for (const modelName of models) {
        try {
            console.log(`Testing model: ${modelName}`);
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    responseMimeType: "application/json",
                }
            });

            const currentDate = new Date().toISOString();
            console.log(`Current Date: ${currentDate}`);
            
            const prompt = `
You are an advanced Oracle AI for the Veyra prediction market protocol. 
Your task is to verify the outcome of a prediction market question based on real-world data.
3. Determine if the outcome is YES, NO, or UNCERTAIN.
4. Provide a concise explanation for your decision.
5. You MUST provide at least one valid source URL or citation. Do NOT use "General Knowledge".
6. If the event is in the future, predict the outcome based on current trends but clearly state it is a prediction.

Current Date: ${currentDate}
Question: "${question}"

Provide your response in the following STRICT JSON format:
{
  "outcome": boolean, // true for YES, false for NO
  "explanation": "string", // Detailed explanation of your reasoning
  "sources": ["string"] // List of URLs or sources used. MUST NOT BE EMPTY.
}
`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log("Raw Response:", text);
            
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const data = JSON.parse(jsonStr);
            console.log("Parsed Data:", data);
            
        } catch (error: any) {
            console.error(`Error with model ${modelName}:`, error.message);
        }
    }
}

verifyWithGemini("are we in year 2025?");
