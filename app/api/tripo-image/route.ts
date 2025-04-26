import { NextRequest, NextResponse } from 'next/server';
import fetch from 'node-fetch';

// Simple proxy for Tripo image content
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  
  if (!taskId) {
    return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
  }
  
  try {
    // Construct a URL to get the 2D render of the model
    // This is more reliable than trying to get the 3D model
    const imageUrl = `https://tripo-data.rg1.data.tripo3d.com/tcli_9270104da6f34a46a2479869119b834d/20250422/${taskId}/legacy.webp`;
    
    console.log(`🖼️ [tripo-image] Fetching image for task ${taskId}`);
    
    // Minimal headers that work reliably with S3 signed content
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': '*/*',
      }
    });
    
    if (!response.ok) {
      console.error(`❌ [tripo-image] Failed to fetch image: ${response.status} ${response.statusText}`);
      return NextResponse.json({ 
        error: `Failed to fetch image: ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }
    
    // Get the image data
    const imageData = await response.arrayBuffer();
    
    console.log(`✅ [tripo-image] Successfully fetched image (${imageData.byteLength} bytes)`);
    
    // Return the image with proper headers
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': imageData.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error(`❌ [tripo-image] Error:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}