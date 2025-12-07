import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "No API Key" });
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const list = await genAI.getGenerativeModel({ model: "gemini-pro" }).apiKey;
        // Wait, the SDK doesn't expose listModels directly on the main class easily in all versions.
        // Let's use the fetch endpoint directly to be sure.
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: String(e) });
    }
}
