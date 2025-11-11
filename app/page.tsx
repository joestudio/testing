"use client";

import { useState } from "react";

interface ExplodeResult {
  images: string[];
  colors: string[];
  fonts: string[];
}

type FilterType = "all" | "images" | "colors" | "fonts";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplodeResult | null>(null);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [toastMessage, setToastMessage] = useState("");

  const handleExplode = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/explode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to explode URL");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  };

  const handleColorClick = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      setToastMessage(`Copied ${color} to clipboard`);
      setTimeout(() => setToastMessage(""), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleFontClick = (font: string) => {
    // Clean up font name for Google Fonts URL
    const fontName = font.split(",")[0].trim().replace(/['"]/g, "");
    const googleFontsUrl = `https://fonts.google.com/specimen/${encodeURIComponent(fontName.replace(/\s+/g, "+"))}`;
    window.open(googleFontsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Explode<span className="text-purple-600">.it</span>
          </h1>
          <p className="text-gray-600 text-lg">
            Extract images, colors, and fonts from any webpage
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleExplode()}
              placeholder="https://example.com"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleExplode}
              disabled={loading}
              className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Exploding..." : "Explode"}
            </button>
          </div>
          {error && (
            <p className="mt-4 text-red-600 text-sm">{error}</p>
          )}
        </div>

        {result && (
          <div className="space-y-6">
            {/* Segmented Control */}
            <div className="bg-white rounded-lg shadow-lg p-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                    activeFilter === "all"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveFilter("images")}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                    activeFilter === "images"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Images ({result.images.length})
                </button>
                <button
                  onClick={() => setActiveFilter("colors")}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                    activeFilter === "colors"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Colors ({result.colors.length})
                </button>
                <button
                  onClick={() => setActiveFilter("fonts")}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                    activeFilter === "fonts"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Fonts ({result.fonts.length})
                </button>
              </div>
            </div>

            {/* Images Section */}
            {(activeFilter === "all" || activeFilter === "images") && (
              <section className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Images ({result.images.length})
                </h2>
                {result.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {result.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleImageClick(img)}
                      >
                        <img
                          src={img}
                          alt={`Image ${idx + 1}`}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999'%3EError%3C/text%3E%3C/svg%3E";
                          }}
                        />
                        <div className="p-2 bg-gray-50">
                          <p className="text-xs text-gray-600 truncate" title={img}>
                            {img}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No images found</p>
                )}
              </section>
            )}

            {/* Colors Section */}
            {(activeFilter === "all" || activeFilter === "colors") && (
              <section className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Color Palette ({result.colors.length})
                </h2>
                {result.colors.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {result.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="text-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleColorClick(color)}
                      >
                        <div
                          className="w-full h-20 rounded-lg border-2 border-gray-300 mb-2"
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-xs font-mono text-gray-700">{color}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No colors found</p>
                )}
              </section>
            )}

            {/* Fonts Section */}
            {(activeFilter === "all" || activeFilter === "fonts") && (
              <section className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Fonts ({result.fonts.length})
                </h2>
                {result.fonts.length > 0 ? (
                  <ul className="space-y-2">
                    {result.fonts.map((font, idx) => (
                      <li
                        key={idx}
                        className="px-4 py-3 bg-gray-50 rounded-lg font-mono text-sm text-gray-800 cursor-pointer hover:bg-purple-50 hover:border-purple-300 border border-transparent transition-colors"
                        onClick={() => handleFontClick(font)}
                      >
                        {font}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No fonts found</p>
                )}
              </section>
            )}
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
            {toastMessage}
          </div>
        )}
      </div>
    </main>
  );
}
