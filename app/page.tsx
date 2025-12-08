"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Download, Sparkles, Copy, RefreshCw, Loader2, Image as ImageIcon, Settings, Instagram } from "lucide-react";

export default function Home() {
  const [formData, setFormData] = useState({
    theme: "",
    target: "",
    goal: "",
    atmosphere: "親近感",
  });
  const [image, setImage] = useState<string | null>(null);
  const [filter, setFilter] = useState("none");
  const [overlayText, setOverlayText] = useState("");
  const [isAutoTextMode, setIsAutoTextMode] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);

  // Custom API Key settings
  const [customApiKey, setCustomApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const [testStatus, setTestStatus] = useState<"none" | "success" | "error">("none");
  const [testMessage, setTestMessage] = useState("");
  const [testing, setTesting] = useState(false);

  const testApiKey = async () => {
    setTesting(true);
    setTestStatus("none");
    try {
      const headers: any = {};
      if (customApiKey) headers["x-gemini-api-key"] = customApiKey;

      const res = await fetch("/api/models", { headers });
      const data = await res.json();
      if (data.models || data.items || Array.isArray(data)) {
        setTestStatus("success");
        setTestMessage("接続成功！このキーは有効です✅");
      } else {
        console.error("Test Error:", data);
        setTestStatus("error");
        setTestMessage(`エラー: ${data.error?.message || JSON.stringify(data.error) || "無効な応答"}`);
      }
    } catch (e: any) {
      setTestStatus("error");
      setTestMessage(`通信エラー: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  // ... (inside return JSX)

  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    { name: "暖かく", value: "sepia(0.3)", class: "sepia-30" }, // standard Tailwind doesn't have sepia-30, we'll use style
    { name: "モノクロ", value: "grayscale(1)", class: "grayscale" },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      };
      reader.readAsDataURL(file);
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
          const fontSize = img.width * 0.08; // 8% of image width
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "white";
          ctx.shadowColor = "rgba(0,0,0,0.7)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          const x = img.width / 2;
          const y = img.height / 2;

          // Multi-line support (simple)
          const lines = overlayText.split("\n");
          const lineHeight = fontSize * 1.2;
          const startY = y - ((lines.length - 1) * lineHeight) / 2;

          lines.forEach((line, i) => {
            ctx.fillText(line, x, startY + (i * lineHeight));
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

  const handleSubmit = async () => {
    setError(""); // Clear previous errors
    if (!formData.theme && !image) {
      setError("投稿テーマを入力するか、画像をアップロードしてください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send image (original base64) to API. API processes it for context.
        body: JSON.stringify({ ...formData, image }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
      } else {
        console.error("API Error:", data); // Log full object for developer
        setError(`生成に失敗しました。\n詳細: ${data.details || data.error || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error(error);
      setError(`エラーが発生しました: ${error.message}`);
    } finally {
      setLoading(false);
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

  const handleGenerateCatchphrase = async () => {
    if (!formData.theme && !image) {
      setError("AI生成には投稿テーマまたは画像が必要です");
      return;
    }
    setGeneratingText(true);
    setError("");
    try {
      const headers: any = { "Content-Type": "application/json" };
      if (customApiKey) headers["x-gemini-api-key"] = customApiKey;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...formData, image, mode: "catchphrase" }),
      });
      const data = await res.json();
      if (data.result) {
        setOverlayText(data.result);
      } else {
        console.error("Catchphrase Error:", data);
        setError(`キャッチコピー生成失敗: ${data.details || data.error}`);
      }
    } catch (e: any) {
      setError(`エラー: ${e.message}`);
    } finally {
      setGeneratingText(false);
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
          <input
            type="text"
            value={customApiKey}
            onChange={(e) => saveCustomApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-1 font-mono tracking-tight"
          />
          {customApiKey && (
            <p className="text-[10px] text-gray-400 font-mono mb-2 text-right">
              認識中のキー: {customApiKey.substring(0, 8)}...
            </p>
          )}

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

        {/* Image Section */}
        <section className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            画像 (任意)
          </h2>

          {!image ? (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="text-sm text-gray-500 font-medium">画像をタップして選択</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                {/* Canvas for processing (hidden) */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Preview Container */}
                <div className="relative">
                  <img
                    src={image}
                    alt="Preview"
                    className="w-full h-auto object-contain bg-gray-100"
                    style={{ filter: filter }}
                  />
                  {/* Text Overlay Preview (CSS) */}
                  {overlayText && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p
                        className="text-white font-bold text-center whitespace-pre-wrap leading-tight"
                        style={{
                          fontSize: 'clamp(20px, 8vw, 60px)',
                          textShadow: '2px 2px 10px rgba(0,0,0,0.7)'
                        }}
                      >
                        {overlayText}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Controls */}
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

              {/* Text Input / AI Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">文字入れ</label>
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
                  placeholder={isAutoTextMode ? "AIが生成したテキストがここに入ります（編集可能）" : "画像に入れる文字を入力 (改行可)"}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none ${isAutoTextMode ? "border-purple-200 bg-purple-50/30" : "border-gray-300"}`}
                  rows={2}
                />
              </div>

              <button
                onClick={handleDownloadProcessed}
                className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-5 h-5" />
                画像を保存
              </button>

              <button
                onClick={() => { setImage(null); setOverlayText(""); }}
                className="w-full py-2 text-red-500 font-medium hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                リセット
              </button>
            </div>
          )}
        </section>

        {/* Text Input Section */}
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
        {result && (
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
        )}
      </div>
    </main>
  );
}
