import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface ExplodeRequest {
  url: string;
}

interface ExplodeResponse {
  images: string[];
  colors: string[];
  fonts: string[];
}

// Helper function to resolve relative URLs
function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
}

// Extract hex color codes from text
function extractColors(text: string): string[] {
  const colorRegex = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;
  const matches = text.match(colorRegex) || [];
  // Normalize 3-digit hex to 6-digit
  return matches.map((color) => {
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
    }
    return color.toUpperCase();
  });
}

// Extract background image URLs from CSS
function extractBackgroundImages(css: string, baseUrl: string): string[] {
  const bgRegex = /url\(['"]?([^'")]+)['"]?\)/g;
  const images: string[] = [];
  let match;

  while ((match = bgRegex.exec(css)) !== null) {
    const imageUrl = match[1];
    if (!imageUrl.startsWith("data:")) {
      images.push(resolveUrl(baseUrl, imageUrl));
    }
  }

  return images;
}

// Extract font families from CSS
function extractFonts(css: string): string[] {
  const fonts = new Set<string>();

  // Extract from font-family declarations
  const fontFamilyRegex = /font-family\s*:\s*([^;{}]+)/gi;
  let match;

  while ((match = fontFamilyRegex.exec(css)) !== null) {
    const fontDeclaration = match[1].trim();
    // Split by comma and clean up each font
    fontDeclaration.split(",").forEach((font) => {
      const cleaned = font.trim().replace(/['"]/g, "");
      if (cleaned && !cleaned.match(/^(inherit|initial|unset|none)$/i)) {
        fonts.add(cleaned);
      }
    });
  }

  // Extract from @font-face declarations
  const fontFaceRegex = /@font-face\s*{([^}]+)}/gi;

  while ((match = fontFaceRegex.exec(css)) !== null) {
    const fontFaceBlock = match[1];
    const familyMatch = /font-family\s*:\s*['"]?([^'";]+)['"]?/i.exec(fontFaceBlock);
    if (familyMatch) {
      fonts.add(familyMatch[1].trim());
    }
  }

  return Array.from(fonts);
}

export async function POST(request: NextRequest) {
  try {
    const body: ExplodeRequest = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch the webpage
    const fetchResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!fetchResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${fetchResponse.statusText}` },
        { status: 502 }
      );
    }

    const html = await fetchResponse.text();
    const $ = cheerio.load(html);

    const images = new Set<string>();
    const colors = new Set<string>();
    const fonts = new Set<string>();
    const allCss: string[] = [];

    // Extract images from <img> tags
    $("img").each((_, elem) => {
      const src = $(elem).attr("src");
      if (src && !src.startsWith("data:")) {
        images.add(resolveUrl(url, src));
      }
    });

    // Extract images from srcset attributes
    $("img[srcset], source[srcset]").each((_, elem) => {
      const srcset = $(elem).attr("srcset");
      if (srcset) {
        srcset.split(",").forEach((src: string) => {
          const imgUrl = src.trim().split(/\s+/)[0];
          if (imgUrl && !imgUrl.startsWith("data:")) {
            images.add(resolveUrl(url, imgUrl));
          }
        });
      }
    });

    // Extract inline styles and collect CSS
    $("[style]").each((_, elem) => {
      const style = $(elem).attr("style");
      if (style) {
        allCss.push(style);
      }
    });

    // Extract CSS from <style> tags
    $("style").each((_, elem) => {
      const css = $(elem).html();
      if (css) {
        allCss.push(css);
      }
    });

    // Extract CSS from <link> tags (external stylesheets)
    const linkPromises: Promise<void>[] = [];
    $("link[rel='stylesheet']").each((_, elem) => {
      const href = $(elem).attr("href");
      if (href) {
        const cssUrl = resolveUrl(url, href);
        linkPromises.push(
          fetch(cssUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          })
            .then((res) => res.ok ? res.text() : "")
            .then((css) => {
              if (css) allCss.push(css);
            })
            .catch(() => {
              // Silently fail for external CSS
            })
        );
      }
    });

    // Wait for all external CSS to be fetched
    await Promise.all(linkPromises);

    // Process all collected CSS
    const combinedCss = allCss.join("\n");

    // Extract background images from CSS
    extractBackgroundImages(combinedCss, url).forEach((img) => images.add(img));

    // Extract colors from CSS
    extractColors(combinedCss).forEach((color) => colors.add(color));

    // Extract fonts from CSS
    extractFonts(combinedCss).forEach((font) => fonts.add(font));

    // Also check for Google Fonts in link tags
    $("link[href*='fonts.googleapis.com']").each((_, elem) => {
      const href = $(elem).attr("href");
      if (href) {
        const familyMatch = /family=([^&:]+)/i.exec(href);
        if (familyMatch) {
          const families = decodeURIComponent(familyMatch[1]).split("|");
          families.forEach((family: string) => {
            fonts.add(family.replace(/\+/g, " "));
          });
        }
      }
    });

    const response: ExplodeResponse = {
      images: Array.from(images),
      colors: Array.from(colors),
      fonts: Array.from(fonts),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in /api/explode:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
