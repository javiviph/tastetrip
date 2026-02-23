import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
async function run() {
    try {
        const res = await ai.models.list();
        for await (const m of res) {
            console.log(m.name);
        }
    } catch (e) {
        console.log("Error:", e);
    }
}
run();
