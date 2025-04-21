import { NextRequest, NextResponse } from 'next/server';

/**
 * Convert 3D models to STL format
 * This API proxies the model through our server and returns a URL that Three.js can load
 */
export async function GET(request: NextRequest) {
  try {
    // Get the model URL from the request
    const url = request.nextUrl.searchParams.get("url");
    
    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }
    
    console.log(`🔍 [convert-to-stl] Converting model from URL: ${url}`);
    
    // Check if the URL seems like a Tripo URL with their complex URL pattern
    const isTripoUrl = url.includes('tripo-data.rg1.data.tripo3d.com') || 
                      url.includes('mesh.glb') ||
                      url.includes('Policy=') ||
                      url.includes('Signature=');
                      
    if (isTripoUrl) {
      console.log(`🔍 [convert-to-stl] Detected Tripo URL pattern`);
    }
    
    // Create a proxy URL that will handle fetching the model
    // Our client-side will load this through the proxy to avoid CORS issues
    const proxyUrl = `/api/model-proxy?url=${encodeURIComponent(url)}`;
    
    console.log(`✅ [convert-to-stl] Created proxy URL for model: ${proxyUrl}`);
    
    // Return the proxy URL that will be loaded directly by Three.js
    // The client can load this as an STL or GLB depending on what works
    return NextResponse.json({
      stlUrl: proxyUrl,
      originalUrl: url,
      isTripoUrl: isTripoUrl
    });
  } catch (error) {
    console.error(`❌ [convert-to-stl] Conversion error:`, error);
    return NextResponse.json({
      error: `Failed to convert model: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
} 