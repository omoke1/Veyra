
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || "";

async function main() {
    console.log("Testing Gemini Generation...");
    if (!API_KEY) {
        console.error("No API key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    
    const models = ["gemini-1.5-flash-latest", "gemini-2.5-flash-lite-preview-09-2025"];
    
    // Test via SDK (uses v1beta by default)
    for (const modelName of models) {
        console.log(`Testing SDK model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello");
            const response = await result.response;
            console.log(`✅ SDK ${modelName} worked! Response: ${response.text()}`);
            return;
        } catch (e: any) {
            console.log(`❌ SDK ${modelName} failed: ${e.message}`);
        }
    }

    // Test via REST API v1beta
    console.log("Testing REST API v1beta...");
    for (const modelName of ["gemini-1.5-flash"]) {
        console.log(`Testing REST v1beta model: ${modelName}...`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Hello" }] }]
                })
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errText}`);
            }
            
            const data = await response.json();
            console.log(`✅ REST v1beta ${modelName} worked! Response:`, JSON.stringify(data).substring(0, 100));
            return;
        } catch (e: any) {
            console.log(`❌ REST v1beta ${modelName} failed: ${e.message}`);
        }
    }

    // Test via REST API v1
    console.log("Testing REST API v1...");
    for (const modelName of ["gemini-1.5-flash", "gemini-pro"]) {
        console.log(`Testing REST v1 model: ${modelName}...`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Hello" }] }]
                })
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errText}`);
            }
            
            const data = await response.json();
            console.log(`✅ REST v1 ${modelName} worked! Response:`, JSON.stringify(data).substring(0, 100));
            return;
        } catch (e: any) {
            console.log(`❌ REST v1 ${modelName} failed: ${e.message}`);
        }
    }
}

main().catch(console.error);
