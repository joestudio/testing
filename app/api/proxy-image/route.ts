import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
        return NextResponse.json({ error: "Failed to fetch image" }, { status: response.status });
    }
    const contentType = response.headers.get("Content-Type");
    const arrayBuffer = await response.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
        headers: {
            "Content-Type": contentType || "application/octet-stream",
            "Access-Control-Allow-Origin": "*"
        }
    });

  } catch (err) {
      console.error("Proxy error:", err);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
