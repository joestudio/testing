"use client";

import { useState, useEffect } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

export default function WatermarkPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Watermark Settings
  const [watermarkType, setWatermarkType] = useState<"text" | "image">("text");
  
  // Text Settings
  const [text, setText] = useState("CONFIDENTIAL");
  const [color, setColor] = useState("#FF0000");
  const [fontSize, setFontSize] = useState(50);
  const [fontName, setFontName] = useState<StandardFonts>(StandardFonts.Helvetica);
  
  // Image Settings
  const [imageUrl, setImageUrl] = useState("");
  const [imageScale, setImageScale] = useState(0.5);

  // Common Settings
  const [opacity, setOpacity] = useState(0.5);
  const [rotation, setRotation] = useState(-45);
  const [position, setPosition] = useState<"center" | "custom">("center");
  const [customX, setCustomX] = useState(0);
  const [customY, setCustomY] = useState(0);
  
  // Page selection
  const [pageOption, setPageOption] = useState<"all" | "specific">("all");
  const [specificPages, setSpecificPages] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const arrayBuffer = await selectedFile.arrayBuffer();
      setPdfBytes(new Uint8Array(arrayBuffer));
    }
  };

  const generatePreview = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // Determine which pages to watermark
      let pagesToWatermark: number[] = [];
      if (pageOption === "all") {
        pagesToWatermark = pages.map((_, i) => i);
      } else {
        const parts = specificPages.split(",");
        parts.forEach(p => {
            const range = p.trim().split("-");
            if (range.length === 2) {
                const start = parseInt(range[0]) - 1;
                const end = parseInt(range[1]) - 1;
                for (let i = start; i <= end; i++) pagesToWatermark.push(i);
            } else {
                const pageNum = parseInt(p.trim()) - 1;
                if (!isNaN(pageNum)) pagesToWatermark.push(pageNum);
            }
        });
      }

      let embeddedImage;
      let font;
      
      if (watermarkType === "image" && imageUrl) {
          try {
              const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
              if (!res.ok) throw new Error("Failed to fetch image");
              const imageBytes = await res.arrayBuffer();
              try {
                  embeddedImage = await pdfDoc.embedPng(imageBytes);
              } catch {
                  embeddedImage = await pdfDoc.embedJpg(imageBytes);
              }
          } catch (e) {
              console.error("Image fetch failed", e);
              // Fallback or alert? 
          }
      } else {
          font = await pdfDoc.embedFont(fontName);
      }

      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;

      pages.forEach((page, index) => {
        if (!pagesToWatermark.includes(index)) return;

        const { width, height } = page.getSize();
        
        let x = 0;
        let y = 0;

        if (watermarkType === "text" && font) {
            if (position === "center") {
                const textWidth = font.widthOfTextAtSize(text, fontSize);
                const textHeight = font.heightAtSize(fontSize);
                x = width / 2 - textWidth / 2;
                y = height / 2 - textHeight / 2;
            } else {
                x = customX;
                y = customY;
            }

            page.drawText(text, {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(r, g, b),
                opacity,
                rotate: degrees(rotation),
            });
        } else if (watermarkType === "image" && embeddedImage) {
             const imgDims = embeddedImage.scale(imageScale);
             
             if (position === "center") {
                 x = width / 2 - imgDims.width / 2;
                 y = height / 2 - imgDims.height / 2;
             } else {
                 x = customX;
                 y = customY;
             }

             page.drawImage(embeddedImage, {
                 x,
                 y,
                 width: imgDims.width,
                 height: imgDims.height,
                 opacity,
                 rotate: degrees(rotation),
             });
        }
      });

      const pdfData = await pdfDoc.save();
      const blob = new Blob([pdfData], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Error generating preview:", err);
      // alert("Failed to generate preview");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (pdfBytes) {
      const timer = setTimeout(() => {
        generatePreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [
      pdfBytes, 
      watermarkType, 
      text,
      fontName, 
      imageUrl, 
      opacity, 
      fontSize, 
      imageScale, 
      rotation, 
      color, 
      position, 
      customX, 
      customY, 
      pageOption, 
      specificPages
  ]);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">PDF Watermark Tool</h1>
            <a href="/" className="text-purple-600 hover:text-purple-800">← Back to Explode.it</a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="bg-white p-6 rounded-lg shadow-md space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload PDF</label>
                <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-purple-50 file:text-purple-700
                    hover:file:bg-purple-100"
                />
            </div>

            {file && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Type</label>
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input 
                                    type="radio" 
                                    value="text" 
                                    checked={watermarkType === "text"} 
                                    onChange={() => setWatermarkType("text")}
                                    className="mr-2"
                                />
                                Text
                            </label>
                            <label className="flex items-center">
                                <input 
                                    type="radio" 
                                    value="image" 
                                    checked={watermarkType === "image"} 
                                    onChange={() => setWatermarkType("image")}
                                    className="mr-2"
                                />
                                Image URL
                            </label>
                        </div>
                    </div>

                    {watermarkType === "text" ? (
                        <>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Text</label>
                                <input 
                                    type="text" 
                                    value={text} 
                                    onChange={(e) => setText(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Font</label>
                                <select 
                                    value={fontName} 
                                    onChange={(e) => setFontName(e.target.value as StandardFonts)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value={StandardFonts.Helvetica}>Helvetica</option>
                                    <option value={StandardFonts.TimesRoman}>Times Roman</option>
                                    <option value={StandardFonts.Courier}>Courier</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                                    <input 
                                        type="color" 
                                        value={color} 
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-full h-10 rounded-md cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Size ({fontSize}px)</label>
                                    <input 
                                        type="number" 
                                        value={fontSize} 
                                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                                <input 
                                    type="url" 
                                    value={imageUrl} 
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://example.com/logo.png"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Scale ({imageScale}x)</label>
                                <input 
                                    type="number" 
                                    step="0.1"
                                    value={imageScale} 
                                    onChange={(e) => setImageScale(parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Opacity ({opacity})</label>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                value={opacity} 
                                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rotation ({rotation}°)</label>
                            <input 
                                type="number" 
                                value={rotation} 
                                onChange={(e) => setRotation(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                        <select 
                            value={position} 
                            onChange={(e) => setPosition(e.target.value as "center" | "custom")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                        >
                            <option value="center">Center</option>
                            <option value="custom">Custom Coordinates</option>
                        </select>
                        {position === "custom" && (
                            <div className="grid grid-cols-2 gap-4">
                                <input 
                                    type="number" 
                                    placeholder="X" 
                                    value={customX} 
                                    onChange={(e) => setCustomX(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                                <input 
                                    type="number" 
                                    placeholder="Y" 
                                    value={customY} 
                                    onChange={(e) => setCustomY(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Pages</label>
                         <div className="flex gap-4 mb-2">
                            <label className="flex items-center">
                                <input 
                                    type="radio" 
                                    value="all" 
                                    checked={pageOption === "all"} 
                                    onChange={() => setPageOption("all")}
                                    className="mr-2"
                                />
                                All Pages
                            </label>
                            <label className="flex items-center">
                                <input 
                                    type="radio" 
                                    value="specific" 
                                    checked={pageOption === "specific"} 
                                    onChange={() => setPageOption("specific")}
                                    className="mr-2"
                                />
                                Specific Pages
                            </label>
                         </div>
                         {pageOption === "specific" && (
                             <input 
                                type="text" 
                                placeholder="e.g. 1, 3, 5-7" 
                                value={specificPages} 
                                onChange={(e) => setSpecificPages(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                             />
                         )}
                    </div>

                    <a 
                        href={previewUrl || "#"} 
                        download={`watermarked-${file.name}`}
                        className={`block w-full py-3 text-center rounded-lg font-semibold text-white transition-colors ${
                            previewUrl ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-400 cursor-not-allowed"
                        }`}
                        onClick={(e) => { if (!previewUrl) e.preventDefault(); }}
                    >
                        {isProcessing ? "Processing..." : "Download PDF"}
                    </a>
                </>
            )}
          </div>

          {/* Preview */}
          <div className="md:col-span-2 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center min-h-[600px] border border-gray-300 relative">
            {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center z-10">
                    <span className="bg-white px-4 py-2 rounded shadow">Generating Preview...</span>
                </div>
            )}
            {previewUrl ? (
                <iframe src={previewUrl} className="w-full h-[800px]" />
            ) : (
                <div className="text-gray-500">
                    {file ? "Processing..." : "Upload a PDF to start"}
                </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
