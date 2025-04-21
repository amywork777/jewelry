import { NextRequest, NextResponse } from 'next/server';

// Define CORS headers for consistent use
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Max-Age': '86400',
};

/**
 * Model proxy to handle CORS issues and AWS S3 signed URLs
 * 
 * This API route acts as a proxy for model files, allowing frontend to access models
 * from remote servers that might have CORS restrictions or require special headers.
 */
export async function GET(request: NextRequest) {
  try {
    // Get URL from query parameter
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");
    const taskId = searchParams.get("taskId");
    const forceImageRedirect = searchParams.has("forceImageRedirect");
    
    // Check if we have a valid URL
    if (!targetUrl) {
      console.log("❌ [model-proxy] No URL provided");
      return NextResponse.json({ error: "No URL provided" }, { status: 400, headers: corsHeaders });
    }
    
    // Extract the final destination URL by unwrapping any proxied URLs
    let finalUrl = targetUrl;
    let extracted = false;
    
    try {
      // Handle deeply nested model-proxy URLs by extracting the original target URL
      if (targetUrl.includes("/api/model-proxy") || targetUrl.includes("model-proxy")) {
        // Extract the final URL by finding the first real external URL
        const tripoPrefixes = [
          "https://tripo-data.rg1.data.tripo3d.com/",
          "https://tripo3d.ai/"
        ];
        
        // Decode the URL multiple times to handle nested URL encoding
        let decodedUrl = targetUrl;
        let prevDecodedUrl = "";
        // Decode until it doesn't change anymore
        while (decodedUrl !== prevDecodedUrl) {
          prevDecodedUrl = decodedUrl;
          decodedUrl = decodeURIComponent(decodedUrl);
        }
        
        // Try to extract the actual Tripo URL
        for (const prefix of tripoPrefixes) {
          const prefixIndex = decodedUrl.indexOf(prefix);
          if (prefixIndex !== -1) {
            // Find where this URL ends (it might be followed by nestingLevel params)
            let endIndex = decodedUrl.indexOf("&nestingLevel=", prefixIndex);
            if (endIndex === -1) {
              endIndex = decodedUrl.length;
            }
            
            finalUrl = decodedUrl.substring(prefixIndex, endIndex);
            extracted = true;
            console.log(`✅ [model-proxy] Extracted direct URL: ${finalUrl.substring(0, 100)}...`);
            break;
          }
        }
        
        // If we still have model-proxy in the URL, it's a recursion issue
        if (!extracted) {
          console.warn(`⚠️ [model-proxy] Could not extract direct URL from nested proxies`);
          return NextResponse.json(
            { error: "Could not extract direct URL from nested proxies" }, 
            { status: 400, headers: corsHeaders }
          );
        }
      }
    } catch (extractError) {
      console.error("❌ [model-proxy] URL extraction error:", extractError);
      // Continue with the original URL if extraction fails
      finalUrl = targetUrl;
    }
    
    // Determine additional headers for Tripo URLs
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (compatible; ModelProxyBot/1.0)',
    };
    
    // For Tripo URLs, we might need to add the Authorization header
    if (finalUrl.includes('tripo-data.rg1.data.tripo3d.com') || 
        finalUrl.includes('tripo3d.ai')) {
      const TRIPO_API_KEY = process.env.TRIPO_API_KEY;
      if (TRIPO_API_KEY) {
        headers['Authorization'] = `Bearer ${TRIPO_API_KEY}`;
      }
    }
    
    console.log(`🔄 [model-proxy] Fetching original URL: ${finalUrl.substring(0, 100)}...`);
    
    // Fetch the file
    const response = await fetch(finalUrl, {
      headers,
      redirect: 'follow',
    }).catch(error => {
      console.error(`❌ [model-proxy] Fetch error:`, error);
      throw new Error(`Failed to fetch model: ${error.message}`);
    });
    
    // Check if the request was successful
    if (!response.ok) {
      console.error(`❌ [model-proxy] Response not OK: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { 
          error: `Failed to fetch model: ${response.status} ${response.statusText}` 
        }, 
        { status: response.status, headers: corsHeaders }
      );
    }
    
    // Get response data as array buffer
    const data = await response.arrayBuffer();
    
    // Get content type from response headers or infer from URL
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // If forcing image, set appropriate content type based on file extension
    if (forceImageRedirect) {
      if (finalUrl.endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (finalUrl.endsWith('.jpg') || finalUrl.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (finalUrl.endsWith('.png')) {
        contentType = 'image/png';
      }
    }
    // For model URLs, we want to ensure they are treated as binary
    else {
      if (finalUrl.endsWith('.glb')) {
        contentType = 'model/gltf-binary';
      } else if (finalUrl.endsWith('.stl')) {
        contentType = 'application/vnd.ms-pki.stl';
      } else if (finalUrl.endsWith('.obj')) {
        contentType = 'application/x-tgif';
      } else if (finalUrl.endsWith('.gltf')) {
        contentType = 'model/gltf+json';
      }
    }
    
    console.log(`✅ [model-proxy] Success: ${contentType}, size: ${(data.byteLength / 1024).toFixed(1)}KB`);
    
    // Create a new response with the data and proper headers
    const headers_response = new Headers();
    headers_response.set('Content-Type', contentType);
    headers_response.set('Content-Length', data.byteLength.toString());
    headers_response.set('Access-Control-Allow-Origin', '*');
    headers_response.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    
    // Add task ID as a header if present
    if (taskId) {
      headers_response.set('X-Task-ID', taskId);
    }
    
    return new NextResponse(data, {
      status: 200,
      statusText: 'OK',
      headers: headers_response
    });
    
  } catch (error) {
    console.error(`❌ [model-proxy] Error:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
      }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

// HEAD handler for preflight checks
export async function HEAD(request: Request) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 