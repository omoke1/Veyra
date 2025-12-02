
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";

async function main() {
    console.log("Testing Gemini API...");
    if (!API_KEY) {
        console.error("No API key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    
    try {
        // There isn't a direct listModels method exposed in the high-level SDK easily in all versions,
        // but we can try to generate content with a known model.
        
        const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro", "gemini-1.5-pro"];
        
        for (const modelName of models) {
            console.log(`Testing model: ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you working?");
                const response = await result.response;
                console.log(`✅ ${modelName} is working! Response: ${response.text()}`);
                return; // Found a working one
            } catch (e: any) {
                console.log(`❌ ${modelName} failed: ${e.message}`);
            }
        }
    } catch (e: any) {
        console.error("Error:", e);
    }
}

main().catch(console.error);
