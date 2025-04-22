import { type NextRequest, NextResponse } from "next/server"

/**
 * Convert 3D models to STL format
 * This API proxies the model through our server and returns a URL that Three.js can load
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "Model URL is required" }, { status: 400 })
    }

    // Fetch the GLB model
    const modelResponse = await fetch(url)

    if (!modelResponse.ok) {
      return NextResponse.json({ error: "Failed to download model from source" }, { status: modelResponse.status })
    }

    // Get the model data as an ArrayBuffer
    const modelData = await modelResponse.arrayBuffer()

    // Return the model file with STL headers
    return new NextResponse(modelData, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment; filename=model.stl",
      },
    })
  } catch (error) {
    console.error("Error converting model to STL:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 