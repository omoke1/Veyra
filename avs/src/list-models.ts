
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";

async function main() {
    console.log("Listing Gemini Models...");
    if (!API_KEY) {
        console.error("No API key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Try to access listModels if it exists (using any to bypass TS check if needed)
    try {
        // Some versions expose it on the instance or via a ModelManager
        // Let's try to inspect the object
        console.log("genAI keys:", Object.keys(genAI));
        
        // Try to call listModels if it exists on the API
        // Note: The SDK might not expose it directly, but we can try.
        // Or we can try to fetch from the API endpoint directly using fetch
        
        console.log("Fetching models via REST API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Models:", JSON.stringify(data, null, 2));
        
    } catch (e: any) {
        console.error("Error listing models:", e);
    }
}

main().catch(console.error);
