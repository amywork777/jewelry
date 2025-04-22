import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
// @ts-ignore - node-fetch types may not match exactly
import fetch from 'node-fetch';
import crypto from 'crypto';

// Ensure we use dynamic routes that don't cache
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Directory for caching models
const CACHE_DIR = path.join(process.cwd(), 'model-cache');

// Ensure cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (err) {
  console.error('Error creating cache directory:', err);
  // Continue even if cache directory creation fails
}

// Generate a safe filename from a URL
function getSafeFilename(url: string): string {
  // Create MD5 hash of the URL to use as filename
  return crypto.createHash('md5').update(url).digest('hex');
}

// Check if a file is cached
function isFileCached(filename: string): boolean {
  try {
    const filePath = path.join(CACHE_DIR, filename);
    return fs.existsSync(filePath);
  } catch (err) {
    console.error('Error checking cache:', err);
    return false;
  }
}

// CORS headers for consistent use
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Range',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
  'Access-Control-Max-Age': '86400',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

// Get proper content type based on file extension
function getContentType(url: string, defaultType = 'application/octet-stream'): string {
  if (url.includes('.stl') || url.endsWith('.stl')) {
    return 'model/stl';
  } else if (url.includes('.glb') || url.endsWith('.glb')) {
    return 'model/gltf-binary';
  } else if (url.includes('.gltf') || url.endsWith('.gltf')) {
    return 'model/gltf+json';
  } else if (url.includes('.webp') || url.endsWith('.webp')) {
    return 'image/webp';
  } else if (url.includes('.jpg') || url.includes('.jpeg') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
    return 'image/jpeg';
  } else if (url.includes('.png') || url.endsWith('.png')) {
    return 'image/png';
  }
  return defaultType;
}

// Get response headers for the model
function getModelResponseHeaders(contentType: string, contentLength: number): HeadersInit {
  return {
    'Content-Type': contentType,
    'Content-Length': contentLength.toString(),
    'Cache-Control': 'public, max-age=31536000', // 1 year cache
    ...corsHeaders
  };
}

// Main proxy function
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
    
    // Try to retrieve from cache first if caching is enabled
    const cacheKey = getSafeFilename(finalUrl);
    const cacheFilePath = path.join(CACHE_DIR, cacheKey);

    // Check if we have this file cached
    if (isFileCached(cacheKey)) {
      try {
        console.log(`✅ [model-proxy] Serving from cache: ${cacheKey}`);
        const cachedData = fs.readFileSync(cacheFilePath);
        
        // Determine content type based on URL or force image if specified
        let contentType = getContentType(finalUrl);
        if (forceImageRedirect) {
          if (finalUrl.endsWith('.webp')) {
            contentType = 'image/webp';
          } else if (finalUrl.endsWith('.jpg') || finalUrl.endsWith('.jpeg')) {
            contentType = 'image/jpeg';
          } else if (finalUrl.endsWith('.png')) {
            contentType = 'image/png';
          }
        }
        
        // Serve from cache
        return new NextResponse(cachedData, {
          headers: getModelResponseHeaders(contentType, cachedData.length)
        });
      } catch (cacheError) {
        console.error(`❌ [model-proxy] Error reading from cache:`, cacheError);
        // Continue with fetching if cache read fails
      }
    }
    
    // Prepare specific request headers based on the URL type
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    
    // Special headers for Tripo URLs
    if (finalUrl.includes('tripo-data.rg1.data.tripo3d.com') || 
        finalUrl.includes('tripo3d.ai')) {
      // For signed URLs with Policy and Signature
      if (finalUrl.includes('Policy=') && finalUrl.includes('Signature=')) {
        console.log('🔑 [model-proxy] Using signed URL headers');
        
        // Use minimal headers for signed URLs (too many headers can cause issues)
        // Strip all headers and just use essential ones 
        headers = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        };
      } else {
        // For API urls
        const TRIPO_API_KEY = process.env.TRIPO_API_KEY || "tsk_mJ1s2uXtjEes3y0JrYbL3cObVcL5sBbdTdRjQUB_4dJ";
        Object.assign(headers, {
          'Authorization': `Bearer ${TRIPO_API_KEY}`,
          'Origin': 'https://magic.taiyaki.ai',
          'Referer': 'https://magic.taiyaki.ai/',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9'
        });
      }
    }

    // For signed Tripo URLs, try to load the legacy.webp image first
    // This is more reliable than trying to load the 3D model
    if (finalUrl.includes('Policy=') && finalUrl.includes('Signature=') && !forceImageRedirect) {
      if (finalUrl.includes('mesh.glb')) {
        console.log('🔄 [model-proxy] Trying to use legacy.webp for signed URL first');
        const webpUrl = finalUrl.replace('mesh.glb', 'legacy.webp');
        
        try {
          // First check if the webp image exists
          const webpResponse = await fetch(webpUrl, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': '*/*'
            }
          });
          
          if (webpResponse.ok) {
            console.log('🎯 [model-proxy] Found legacy.webp, using it instead');
            finalUrl = webpUrl;
            forceImageRedirect = true;
          }
        } catch (webpError) {
          console.warn('🔶 [model-proxy] Could not check legacy.webp:', webpError);
          // Continue with the original path
        }
      }
    }
    
    // Determine the target format - prefer STL over GLB
    let targetFormat = 'stl';
    if (finalUrl.endsWith('.glb') && !searchParams.has('forceGLB') && !forceImageRedirect) {
      console.log('🔄 [model-proxy] Attempting to use STL instead of GLB');
      const stlUrl = finalUrl.replace('.glb', '.stl');
      finalUrl = stlUrl;
    }
    
    console.log(`🔄 [model-proxy] Fetching from: ${finalUrl}`);

    // Make multiple attempts with different strategies
    let response;
    let responseBuffer;
    let attempts = 0;
    const maxAttempts = 3;
    let fallbackUsed = false;
    
    while (!response && attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`🔄 [model-proxy] Attempt ${attempts} of ${maxAttempts}`);
        // Fetch with extended timeout
        response = await fetch(finalUrl, {
          method: 'GET',
          headers,
          redirect: 'follow',
          // 30 second timeout
          timeout: 30000
        });
        
        if (!response.ok) {
          console.log(`❌ [model-proxy] Fetch failed with status: ${response.status}`);
          
          // Special handling for STL to GLB fallback
          if (response.status === 403 && finalUrl.endsWith('.stl')) {
            console.log('🔄 [model-proxy] STL failed with 403, trying GLB instead');
            const glbUrl = finalUrl.replace('.stl', '.glb');
            finalUrl = glbUrl;
            response = null; // Force retry with new URL
            continue;
          }
          
          // Special handling for GLB to image fallback
          if (response.status === 403 && finalUrl.endsWith('.glb')) {
            console.log('🔄 [model-proxy] GLB failed with 403, trying image instead');
            const imageUrl = finalUrl.replace('.glb', '.webp');
            if (imageUrl !== finalUrl) {
              finalUrl = imageUrl;
              response = null; // Force retry with image URL
              fallbackUsed = true;
              continue;
            }
          }
          
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        
        // Get the data
        const arrayBuffer = await response.arrayBuffer();
        responseBuffer = Buffer.from(arrayBuffer);
        console.log(`✅ [model-proxy] Successfully fetched ${responseBuffer.length} bytes`);
        
        // Cache the response data
        try {
          fs.writeFileSync(cacheFilePath, responseBuffer);
          console.log(`✅ [model-proxy] Cached to ${cacheKey}`);
        } catch (cacheError) {
          console.error(`❌ [model-proxy] Error caching file:`, cacheError);
          // Continue even if caching fails
        }
      } catch (error) {
        console.error(`❌ [model-proxy] Fetch attempt ${attempts} failed:`, error);
        
        // Try different strategy on next attempt
        if (attempts < maxAttempts) {
          // Add a slight delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Special handling for STL to GLB fallback
          if (finalUrl.endsWith('.stl') && !fallbackUsed) {
            const glbUrl = finalUrl.replace('.stl', '.glb');
            if (glbUrl !== finalUrl) {
              console.log('🔄 [model-proxy] STL fetch failed, trying GLB instead');
              finalUrl = glbUrl;
              fallbackUsed = true;
            }
          }
          // Special handling for GLB to webp fallback
          else if (finalUrl.endsWith('.glb') && !fallbackUsed) {
            const imageUrl = finalUrl.replace('.glb', '.webp');
            if (imageUrl !== finalUrl) {
              console.log('🔄 [model-proxy] GLB fetch failed, trying webp instead');
              finalUrl = imageUrl;
              fallbackUsed = true;
            }
          }
        }
      }
    }
    
    // If all attempts failed
    if (!response || !responseBuffer) {
      console.error(`❌ [model-proxy] All fetch attempts failed for ${finalUrl}`);
      return NextResponse.json(
        { error: "Failed to fetch model after multiple attempts" },
        { status: 502, headers: corsHeaders }
      );
    }
    
    // Determine content type - either from the response or inferred from URL
    let contentType = response.headers.get('content-type') || getContentType(finalUrl);
    
    // Handle specific content types
    if (fallbackUsed && finalUrl.endsWith('.webp')) {
      contentType = 'image/webp';
    } else if (finalUrl.endsWith('.stl')) {
      contentType = 'model/stl';
    } else if (finalUrl.endsWith('.glb')) {
      contentType = 'model/gltf-binary';
    }
    
    // Override for forced image redirects
    if (forceImageRedirect) {
      if (finalUrl.endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (finalUrl.endsWith('.jpg') || finalUrl.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (finalUrl.endsWith('.png')) {
        contentType = 'image/png';
      }
    }
    
    console.log(`✅ [model-proxy] Returning ${responseBuffer.length} bytes as ${contentType}`);
    
    // Return the response
    return new NextResponse(responseBuffer, {
      headers: getModelResponseHeaders(contentType, responseBuffer.length)
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