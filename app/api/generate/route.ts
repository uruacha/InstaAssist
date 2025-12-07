import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log("API Key loaded:", !!apiKey);
        if (apiKey) console.log("Key starts with:", apiKey.substring(0, 10));

        if (!apiKey) {
            console.error("GEMINI_API_KEY is missing via process.env");
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not set on server" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Use gemini-2.5-flash as found previously
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const body = await req.json();
        console.log("Request body mode:", body.mode);
        const { theme, target, goal, atmosphere, image, mode } = body;

        let systemPrompt = "";

        if (mode === 'catchphrase') {
            systemPrompt = `
        あなたはプロのInstagramマーケターです。
        以下の情報を元に、Instagramの画像に重ねるための「短くてインパクトのあるキャッチコピー」を1つだけ生成してください。

        【入力情報】
        投稿テーマ: ${theme}
        ターゲット: ${target}
        雰囲気: ${atmosphere}

        【添付画像について】
        ${image ? "添付画像の要素（色、被写体、雰囲気）を強く意識したフレーズにしてください。" : "テーマに沿ったフレーズにしてください。"}

        【指示】
        1. 15文字以内で出力してください。
        2. 改行はしないでください。
        3. 絵文字は使わないでください（文字のみ）。
        4. 出力は生成されたキャッチコピーのみを返してください（「キャッチコピー：」などの前置きは不要）。
        `;
        } else {
            // Standard Caption Generation
            systemPrompt = `
        あなたはプロのInstagramマーケターです。
        以下の情報を元に、Instagramの投稿用キャプションとハッシュタグを生成してください。

        【入力情報】
        投稿テーマ: ${theme}
        ターゲット: ${target}
        目的: ${goal}
        雰囲気: ${atmosphere}
        `;

            if (image) {
                systemPrompt += `
        【添付画像について】
        ユーザーが投稿に使用したい画像を添付しました。
        画像の内容を分析し、その内容（写っているもの、色、雰囲気など）に触れるようなキャプションにしてください。
        `;
            }

            systemPrompt += `
        【指示】
        1. ターゲットに刺さる言葉選びを意識してください。
        2. 目的に沿った構成にしてください。
        3. 雰囲気（${atmosphere}）に合わせたトーン＆マナーで書いてください。
        4. 絵文字を適度に使用して、読みやすく魅力的な文章にしてください。
        5. 最適なハッシュタグを10〜15個程度提案してください。
        6. 出力フォーマットは以下の通りにしてください。

        [キャプション]
        (ここにキャプション本文)

        [ハッシュタグ]
        (ここにハッシュタグ)
        `;
        }

        console.log("Sending prompt to Gemini...");

        let result;
        if (image) {
            const imagePart = {
                inlineData: {
                    data: image.split(",")[1], // Remove "data:image/jpeg;base64," header
                    mimeType: "image/jpeg",
                },
            };
            result = await model.generateContent([systemPrompt, imagePart]);
        } else {
            result = await model.generateContent(systemPrompt);
        }

        const response = await result.response;
        const text = response.text().trim(); // Trim whitespace
        console.log("Gemini response received");

        return NextResponse.json({ result: text });
    } catch (error: any) {
        console.error("Error generating content:", error);
        if (error.message) {
            console.error("Error message:", error.message);
        }
        return NextResponse.json(
            { error: "Failed to generate content", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
