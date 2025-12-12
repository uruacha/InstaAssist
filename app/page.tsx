"use client";
import { useState, useEffect, useRef } from "react";
import { Upload, Download, Sparkles, Copy, RefreshCw, Loader2, Image as ImageIcon, Settings, Instagram, Eye, EyeOff } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function Home() {
  const [formData, setFormData] = useState({
    theme: "",
    target: "",
    goal: "",
    atmosphere: "親近感",
  });
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [image, setImage] = useState<string | null>(null); // Acts as media source (image or video)
  const [filter, setFilter] = useState("none");
  const [overlayText, setOverlayText] = useState("");
  const [isAutoTextMode, setIsAutoTextMode] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Custom API Key settings
  const [customApiKey, setCustomApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"none" | "success" | "error">("none");
  const [testMessage, setTestMessage] = useState("");
  const [testing, setTesting] = useState(false);

  // Text Styling State
  const [textColor, setTextColor] = useState("#ffffff");
  const [textShadow, setTextShadow] = useState("rgba(0,0,0,0.7)");

  const [textDesign, setTextDesign] = useState("gothic"); // gothic, mincho, pop, impact, neon
  const [verticalPos, setVerticalPos] = useState(50); // 0-100%
  const [horizontalPos, setHorizontalPos] = useState(50); // 0-100%
  const [fontSizeScale, setFontSizeScale] = useState(1.0); // 0.5 - 2.0

  const [result, setResult] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load custom API key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("custom_gemini_api_key");
    if (savedKey) setCustomApiKey(savedKey);
  }, []);

  const saveCustomApiKey = (key: string) => {
    // Aggressive cleanup: remove quotes, spaces, and newlines
    const cleanKey = key.replace(/["'\s\n]/g, "");
    setCustomApiKey(cleanKey);
    localStorage.setItem("custom_gemini_api_key", cleanKey);
  };

  const testApiKey = async () => {
    setTesting(true);
    setTestStatus("none");
    try {
      if (!customApiKey) throw new Error("APIキーが入力されていません");

      const genAI = new GoogleGenerativeAI(customApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Minimal generation test
      await model.generateContent("Test");

      setTestStatus("success");
      setTestMessage("接続成功！このキーは有効です✅");
    } catch (e: unknown) {
      const error = e as Error;
      console.error("Test Error:", error);
      setTestStatus("error");
      setTestMessage(`エラー: ${error.message || "無効なキーです"}`);
    } finally {
      setTesting(false);
    }
  };

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem("insta-assistant-data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("insta-assistant-data", JSON.stringify(formData));
  }, [formData]);

  const atmospheres = ["面白い", "真面目", "エモい", "親近感", "ビジネス"];

  // Image Filters
  const filters = [
    { name: "なし", value: "none", class: "" },
    { name: "明るく", value: "brightness(1.2)", class: "brightness-125" },
    { name: "暖かく", value: "sepia(0.3)", class: "sepia-30" },
    { name: "モノクロ", value: "grayscale(1)", class: "grayscale" },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Reset states
      setImage(null);
      setResult("");

      // Robust video detection (file.type can be empty on Windows)
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name);
      setMediaType(isVideo ? 'video' : 'image');

      if (isVideo) {
        // Video specific handling
        if (file.size > 10 * 1024 * 1024) {
          setError("動画サイズは10MB以下にしてください（AI処理の制限のため）");
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setImage(result);
        };
        reader.readAsDataURL(file);
      } else {
        // Existing Image handling
        const reader = new FileReader();
        reader.onloadend = () => {
          const rawResult = reader.result as string;
          // Resize logic
          const img = new Image();
          img.src = rawResult;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const maxDim = 1000;
            let width = img.width;
            let height = img.height;

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height *= maxDim / width;
                width = maxDim;
              } else {
                width *= maxDim / height;
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL("image/jpeg", 0.7);
              setImage(compressed);
            }
          };
          img.onerror = () => {
            console.error("Image load failed");
            setError("ファイルの読み込みに失敗しました。対応していない形式の可能性があります。");
          };
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDownloadProcessed = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = image;
    img.onload = () => {
      // Fix canvas size to image size
      canvas.width = img.width;
      canvas.height = img.height;

      // Apply filter context
      if (ctx) {
        ctx.filter = filter === "none" ? "none" : filter;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        ctx.filter = "none"; // Reset filter for text

        // Draw Text Overlay
        if (overlayText) {
          const baseFontSize = img.width * 0.08; // 8% of image width
          const fontSize = baseFontSize * fontSizeScale;

          // Font & Style map
          let fontFam = "sans-serif";
          let fontWeight = "bold";

          if (textDesign === "mincho") fontFam = "serif";
          else if (textDesign === "pop") fontFam = "sans-serif";
          else if (textDesign === "impact") { fontFam = "Impact, sans-serif"; fontWeight = "900"; }

          ctx.font = `${fontWeight} ${fontSize}px ${fontFam}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const x = (img.width * horizontalPos) / 100;
          const y = (img.height * verticalPos) / 100;

          const lines = overlayText.split("\n");
          const lineHeight = fontSize * 1.2;
          const totalTextHeight = (lines.length * lineHeight);
          const startY = y - (totalTextHeight / 2) + (lineHeight / 2);

          lines.forEach((line, i) => {
            const ly = startY + (i * lineHeight);

            if (textDesign === "neon") {
              // Neon Effect: Multiple shadows
              ctx.shadowColor = textColor;
              ctx.shadowBlur = 15;
              ctx.fillStyle = textColor;
              ctx.fillText(line, x, ly);

              // Reinforce white core
              ctx.shadowBlur = 0;
              ctx.fillStyle = "#ffffff";
              ctx.fillText(line, x, ly);
            }
            else if (textDesign === "pop") {
              // Pop Effect: Thick white stroke
              ctx.strokeStyle = "white";
              ctx.lineWidth = fontSize * 0.15;
              ctx.lineJoin = "round";
              ctx.miterLimit = 2;
              ctx.strokeText(line, x, ly);

              ctx.fillStyle = textColor;
              ctx.shadowColor = "rgba(0,0,0,0.2)";
              ctx.shadowBlur = 5;
              ctx.shadowOffsetX = 3;
              ctx.shadowOffsetY = 3;
              ctx.fillText(line, x, ly);
            }
            else {
              // Standard / Mincho / Impact
              ctx.fillStyle = textColor;
              ctx.shadowColor = textShadow;
              ctx.shadowBlur = 10;
              ctx.shadowOffsetX = 2;
              ctx.shadowOffsetY = 2;
              ctx.fillText(line, x, ly);
            }
          });
        }

        // Download
        const link = document.createElement("a");
        link.download = "processed-image.jpg";
        link.href = canvas.toDataURL("image/jpeg", 0.8);
        link.click();
      }
    };
  };

  const generatePrompt = (mode: 'caption' | 'catchphrase') => {
    const { theme, target, goal, atmosphere } = formData;
    if (mode === 'catchphrase') {
      return `
            あなたはプロのInstagramマーケターです。
            以下の情報を元に、Instagramの画像に重ねるための「短くてインパクトのあるキャッチコピー」を1つだけ生成してください。

            【入力情報】
            投稿テーマ: ${theme}
            ターゲット: ${target}
            雰囲気: ${atmosphere}

            【添付画像・動画について】
            ${image ? "添付されたメディアの要素（色、被写体、雰囲気、動きなど）を強く意識したフレーズにしてください。" : "テーマに沿ったフレーズにしてください。"}

            【指示】
            1. 15文字以内で出力してください。
            2. 改行はしないでください。
            3. 絵文字は使わないでください（文字のみ）。
            4. 出力は生成されたキャッチコピーのみを返してください（「キャッチコピー：」などの前置きは不要）。
            `;
    } else {
      let systemPrompt = `
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
        【添付メディアについて】
        ユーザーが投稿に使用したい画像または動画を添付しました。
        メディアの内容を分析し、その内容（写っているもの、色、雰囲気、動画なら動きやストーリーなど）に触れるようなキャプションにしてください。
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
      return systemPrompt;
    }
  };

  const callGemini = async (prompt: string, mediaBase64: string | null) => {
    if (!customApiKey) throw new Error("APIキーが設定されていません。右上の設定ボタンからキーを入力してください。");

    const genAI = new GoogleGenerativeAI(customApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    if (mediaBase64) {
      const imagePart = {
        inlineData: {
          data: mediaBase64.split(",")[1],
          mimeType: mediaBase64.split(";")[0].split(":")[1],
        },
      };
      const result = await model.generateContent([prompt, imagePart]);
      return result.response.text();
    } else {
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!formData.theme && !image) {
      setError("投稿テーマを入力するか、画像をアップロードしてください");
      return;
    }

    setLoading(true);
    try {
      const prompt = generatePrompt('caption');
      const text = await callGemini(prompt, image);
      setResult(text);
    } catch (error: unknown) {
      const err = error as Error;
      console.error(err);
      setError(`エラーが発生しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCatchphrase = async () => {
    if (!formData.theme && !image) {
      setError("AI生成には投稿テーマまたはメディアが必要です");
      return;
    }
    setGeneratingText(true);
    setError("");
    try {
      const prompt = generatePrompt('catchphrase');
      const text = await callGemini(prompt, image);
      setOverlayText(text.trim());
    } catch (e: unknown) {
      const error = e as Error;
      setError(`エラー: ${error.message}`);
    } finally {
      setGeneratingText(false);
    }
  };

  const handleCopyAndOpen = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        window.location.href = "instagram://library";
        setTimeout(() => {
          window.location.href = "https://instagram.com";
        }, 1500);
      } else {
        window.open("https://instagram.com", "_blank");
      }

    } catch (err) {
      console.error("Failed to copy:", err);
      alert("コピーに失敗しました");
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-4 mb-4 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          InstaAssist AI
        </h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm animate-in slide-in-from-top-2">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            APIキー設定
          </h3>
          <p className="text-xs text-gray-500 mb-2 leading-relaxed">
            Vercelの設定がうまくいかない場合、ここに直接キーを入力してください。<br />
            <span className="text-red-500 font-bold">※「API key not valid」エラーが出る場合、ここに入力し直してください。</span>
          </p>
          <div className="relative mb-4">
            <input
              type={showApiKey ? "text" : "password"}
              value={customApiKey}
              onChange={(e) => saveCustomApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-tight"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {customApiKey && (
              <p className="text-[10px] text-gray-400 font-mono mt-1 text-right">
                認識中のキー: {showApiKey ? customApiKey : "●●●●●●●●"}
              </p>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={testApiKey}
              disabled={!customApiKey || testing}
              className="w-full bg-blue-50 text-blue-600 text-xs py-2 rounded-lg font-bold hover:bg-blue-100 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : "📡 接続テストを実行"}
            </button>
          </div>

          {testStatus !== "none" && (
            <div className={`text-xs p-2 rounded mb-4 break-all max-h-24 overflow-y-auto ${testStatus === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testMessage}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                saveCustomApiKey("");
                setShowSettings(false);
              }}
              className="text-xs text-red-400 hover:text-red-600 underline"
            >
              クリア
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs bg-gray-800 text-white px-3 py-1 rounded-md hover:bg-gray-700"
            >
              保存して閉じる
            </button>
          </div>
        </div>
      )}

      <div className="px-4 space-y-6">

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm whitespace-pre-wrap select-text">
            <p className="font-bold flex items-center gap-2 mb-1">
              <span className="text-lg">⚠️</span> エラーが発生しました
            </p>
            {error}
            <p className="mt-2 text-xs text-gray-500">
              ※上記のエラー内容をコピーして、開発者に伝えてください。
            </p>
          </div>
        )}

        {/* Post Settings Section (Moved to Top) */}
        <section className="bg-white rounded-2xl shadow-sm p-5 space-y-5 border border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5 text-purple-500" />
            投稿設定
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">投稿テーマ</label>
              <input
                type="text"
                placeholder="例：週末のカフェ巡り"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-base placeholder-gray-400 font-medium"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">ターゲット</label>
              <input
                type="text"
                placeholder="例：20代の社会人"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-base placeholder-gray-400 font-medium"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">目的</label>
              <input
                type="text"
                placeholder="例：いいねが欲しい"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-base placeholder-gray-400 font-medium"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-base font-bold text-gray-800 mb-3">雰囲気</label>
              <div className="flex flex-wrap gap-2">
                {atmospheres.map((atm) => (
                  <button
                    key={atm}
                    onClick={() => setFormData({ ...formData, atmosphere: atm })}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${formData.atmosphere === atm
                      ? "bg-purple-600 text-white shadow-md transform scale-105"
                      : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    {atm}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section >

        {/* Image Section (Cleaned up and Text Controls moved here) */}
        <section className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            メディアアップロード
          </h2>

          {!image ? (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="text-sm text-gray-500 font-medium">画像・動画をタップして選択</p>
              </div>
              <input type="file" className="hidden" accept="image/*,video/*" onChange={handleImageUpload} />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                {/* Canvas for processing (hidden) */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Preview Container */}
                <div className="relative">
                  {mediaType === 'video' ? (
                    <video
                      src={image}
                      controls
                      className="w-full h-auto rounded-xl bg-black"
                    />
                  ) : (
                    <img
                      src={image}
                      alt="Preview"
                      className="w-full h-auto object-contain bg-gray-100"
                      style={{ filter: filter }}
                    />
                  )}
                  {/* Text Overlay Preview (CSS) */}
                  {overlayText && (
                    <div
                      className="absolute inset-0 pointer-events-none w-full h-full overflow-hidden"
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: `${verticalPos}%`,
                          left: `${horizontalPos}%`,
                          transform: 'translate(-50%, -50%)',
                          width: '100%',
                          textAlign: 'center'
                        }}
                      >
                        <p
                          className="font-bold whitespace-pre-wrap leading-tight"
                          style={{
                            fontSize: `clamp(12px, ${8 * fontSizeScale}vw, ${60 * fontSizeScale}px)`,
                            color: textDesign === 'neon' ? '#ffffff' : textColor,
                            textShadow: textDesign === 'neon'
                              ? `0 0 5px ${textColor}, 0 0 10px ${textColor}, 0 0 20px ${textColor}`
                              : textDesign === 'pop'
                                ? `2px 2px 0px rgba(0,0,0,0.2)`
                                : `2px 2px 10px ${textShadow}`,
                            fontFamily: textDesign === 'mincho' ? 'serif' : textDesign === 'impact' ? 'Impact, sans-serif' : 'sans-serif',
                            fontWeight: textDesign === 'impact' ? '900' : 'bold',
                            WebkitTextStroke: textDesign === 'pop' ? `0.2em white` : '0',
                            paintOrder: 'stroke fill',
                          }}
                        >
                          {overlayText}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {/* MOVED: Text Style Controls (Sliders, Colors, etc.) - Only for Images */}
              {mediaType === 'image' && overlayText && (
                <div className="pt-2 space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-top-2">

                  {/* Design Selector */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-500">デザイン</span>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { id: "gothic", label: "標準", font: "sans-serif" },
                        { id: "mincho", label: "明朝", font: "serif" },
                        { id: "pop", label: "ポップ", font: "sans-serif" },
                        { id: "impact", label: "強調", font: "Impact" },
                        { id: "neon", label: "ネオン", font: "sans-serif" },
                      ].map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setTextDesign(d.id)}
                          className={`px-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${textDesign === d.id
                            ? "bg-white border-blue-500 text-blue-600 shadow-sm"
                            : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100"
                            }`}
                          style={{ fontFamily: d.font }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selector */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-500">文字色</span>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { c: "#ffffff", s: "rgba(0,0,0,0.8)" },  // White
                        { c: "#000000", s: "rgba(255,255,255,0.8)" }, // Black
                        { c: "#ff007f", s: "rgba(255,255,255,0.9)" }, // Pink
                        { c: "#ff4500", s: "rgba(255,255,255,0.9)" }, // Orange
                        { c: "#ffff00", s: "rgba(0,0,0,0.8)" }, // Yellow
                        { c: "#32cd32", s: "rgba(0,0,0,0.8)" }, // Lime Green
                        { c: "#00ffff", s: "rgba(0,0,0,0.8)" }, // Cyan
                        { c: "#1e90ff", s: "rgba(255,255,255,0.8)" }, // Blue
                        { c: "#9400d3", s: "rgba(255,255,255,0.9)" }, // Purple
                      ].map((style) => (
                        <button
                          key={style.c}
                          onClick={() => { setTextColor(style.c); setTextShadow(style.s); }}
                          className={`w-6 h-6 rounded-full border border-gray-300 shadow-sm transition-transform ${textColor === style.c ? "ring-2 ring-blue-500 scale-110" : "hover:scale-110"}`}
                          style={{ backgroundColor: style.c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Sliders Row (Vertical, Horizontal, Size) */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Vertical Pos */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>縦位置</span>
                          <span>{verticalPos}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={verticalPos}
                          onChange={(e) => setVerticalPos(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* Horizontal Pos */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>横位置</span>
                          <span>{horizontalPos}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={horizontalPos}
                          onChange={(e) => setHorizontalPos(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>サイズ</span>
                        <span>x{fontSizeScale}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={fontSizeScale}
                        onChange={(e) => setFontSizeScale(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Controls (Moved below Style Controls) - Only for Images */}
              {mediaType === 'image' && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-700">雰囲気加工フィルター</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {filters.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f.value
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Input / AI Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {mediaType === 'video' ? 'キャプション生成' : '文字入れ'}
                  </label>
                  <button
                    onClick={() => setIsAutoTextMode(!isAutoTextMode)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors font-bold ${isAutoTextMode
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-500"
                      }`}
                  >
                    {isAutoTextMode ? "✨ AI自動提案モード" : "✍️ 手動入力モード"}
                  </button>
                </div>

                {isAutoTextMode && (
                  <button
                    onClick={handleGenerateCatchphrase}
                    disabled={generatingText}
                    className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm shadow-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {generatingText ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        AIでキャッチコピーを生成
                      </>
                    )}
                  </button>
                )}

                <textarea
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  placeholder={
                    isAutoTextMode
                      ? "AIが生成したテキストがここに入ります（編集可能）"
                      : mediaType === 'video'
                        ? "動画の説明メモ（AI生成のヒントになります）"
                        : "画像に入れる文字を入力 (改行可)"
                  }
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none ${isAutoTextMode ? "border-purple-200 bg-purple-50/30" : "border-gray-300"}`}
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleDownloadProcessed}
                  className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  {mediaType === 'video' ? '完了' : '保存'}
                </button>

                <button
                  onClick={() => { setImage(null); setOverlayText(""); }}
                  className="px-4 py-3 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </section>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              AIで生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              キャプションを生成
            </>
          )}
        </button>

        {/* Result Section */}
        {
          result && (
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="font-bold text-gray-800 ml-1 text-lg">生成結果</h2>
              <div className="bg-white rounded-2xl shadow-sm p-1 border border-gray-200 relative">
                <textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full h-80 p-5 rounded-xl border-none resize-none focus:ring-0 text-base leading-relaxed text-gray-900 bg-transparent"
                />
              </div>

              <button
                onClick={handleCopyAndOpen}
                className="w-full bg-white border-2 border-gray-200 text-gray-800 font-bold py-4 rounded-xl shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base"
              >
                <Copy className="w-5 h-5 text-gray-600" />
                <span>コピーして</span>
                <Instagram className="w-5 h-5 text-pink-600" />
                <span>を開く</span>
              </button>
            </section>
          )
        }
      </div >
    </main >
  );
}
