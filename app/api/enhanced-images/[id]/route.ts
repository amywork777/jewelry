import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * GET handler for enhanced images
 * This endpoint serves images that were generated and stored temporarily
 * to avoid Content Security Policy issues with data URLs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const imageId = params.id;
  
  // Validate imageId to prevent directory traversal attacks
  if (!imageId || !imageId.match(/^enhanced-\d+$/)) {
    return NextResponse.json(
      { error: "Invalid image ID format" },
      { status: 400 }
    );
  }
  
  // Determine upload directory based on environment
  const isProd = process.env.NODE_ENV === "production";
  const uploadsDir = isProd
    ? join(tmpdir(), "uploads")
    : join(process.cwd(), "public", "uploads");
  
  // Build the full path to the image
  const imagePath = join(uploadsDir, `${imageId}.png`);
  
  // Check if the file exists
  if (!existsSync(imagePath)) {
    console.error(`File not found: ${imagePath}`);
    return NextResponse.json(
      { error: "Image not found" },
      { status: 404 }
    );
  }
  
  try {
    // Read the image file
    const fileBuffer = await readFile(imagePath);
    
    // Return the image with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error(`Error reading image file: ${error}`);
    return NextResponse.json(
      { error: "Failed to read image" },
      { status: 500 }
    );
  }
} 