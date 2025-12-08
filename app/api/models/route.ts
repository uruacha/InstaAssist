import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    // 1. Try to get key from request header
    let apiKey = req.headers.get("x-gemini-api-key");
    // 2. Fallback to server env
    if (!apiKey) {
        apiKey = process.env.GEMINI_API_KEY || null;
    }

    if (!apiKey) {
        return NextResponse.json({ error: "No API Key provided" });
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: String(e) });
    }
}
