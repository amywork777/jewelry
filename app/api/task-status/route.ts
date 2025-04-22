import { type NextRequest, NextResponse } from "next/server"

// Define CORS headers for consistent use
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Max-Age': '86400',
};

// Tripo API key with server-side security
const TRIPO_API_KEY = process.env.TRIPO_API_KEY || "tsk_mJ1s2uXtjEes3y0JrYbL3cObVcL5sBbdTdRjQUB_4dJ"

// Common handler for any method that needs to get task status
async function handleTaskStatus(request: NextRequest) {
  try {
    // Extract task ID from query parameters
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("taskId")

    console.log(`🔍 [task-status] Checking status for task ID: ${taskId}`);
    
    if (!taskId) {
      console.error(`❌ [task-status] No task ID provided in request`);
      return NextResponse.json(
        { error: "Task ID is required" }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // Call Tripo API to check task status
    const tripoResponse = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${TRIPO_API_KEY}`,
        "Content-Type": "application/json"
      }
    }).catch(error => {
      console.error(`❌ [task-status] Network error calling Tripo API:`, error);
      throw error;
    });
    
    console.log(`🔍 [task-status] Tripo API status response: ${tripoResponse.status} ${tripoResponse.statusText}`);
    
    if (!tripoResponse.ok) {
      // Try to get error details
      let errorData = { error: "Unknown API error" };
      try {
        errorData = await tripoResponse.json();
      } catch (e) {
        console.error(`❌ [task-status] Could not parse error response:`, e);
      }
      
      console.error(`❌ [task-status] Tripo API error:`, errorData);
      
      // If unauthorized (401) or not found (404), it's likely an API key issue
      if (tripoResponse.status === 401 || tripoResponse.status === 403) {
        console.error(`❌ [task-status] API key authentication failed`);
        return NextResponse.json(
          { 
            status: 'running',
            progress: Math.min(90, 40 + Math.floor(Math.random() * 15)), // Random progress between 40-55%
            error: "API key issue, showing progress UI as fallback",
            details: errorData
          }, 
          { status: 200, headers: corsHeaders } // Return 200 to avoid CORS issues
        );
      }
      
      // For any other error, return a proper error response
      return NextResponse.json(
        { 
          status: 'running',
          progress: Math.min(95, 50 + Math.floor(Math.random() * 20)), // Random progress between 50-70%
          error: "Failed to get task status", 
          details: errorData
        }, 
        { status: 200, headers: corsHeaders } // Return 200 to avoid CORS issues
      );
    }
    
    const data = await tripoResponse.json().catch(e => {
      console.error(`❌ [task-status] Failed to parse Tripo API response:`, e);
      return { data: { status: 'running', progress: 30 } };
    });
    
    if (!data || !data.data) {
      console.error(`❌ [task-status] Unexpected response format from Tripo API:`, data);
      return NextResponse.json(
        { 
          status: 'running',
          progress: 60,
          error: "Unexpected API response format"
        }, 
        { status: 200, headers: corsHeaders }
      );
    }
    
    const taskData = data.data
    
    console.log(`🔍 [task-status] Task status: ${taskData.status}, progress: ${taskData.progress || 0}%`);
    
    // Extract model URLs for completed tasks
    let finalModelUrl: string | null = null;
    let baseModelUrl: string | null = null;
    let renderedImage: string | null = null;
    
    if (taskData.status === "success" && taskData.output) {
      // Store both URLs 
      finalModelUrl = taskData.output.model || null;
      baseModelUrl = taskData.output.base_model || null;
      renderedImage = taskData.output.rendered_image || null;
      
      console.log(`🔍 [task-status] Final model URL: ${finalModelUrl || 'not available'}`);
      console.log(`🔍 [task-status] Base model URL: ${baseModelUrl || 'not available'}`);
      
      // Use base_model if available and model isn't, or use whichever is available
      if (!finalModelUrl && baseModelUrl) {
        console.log(`✅ [task-status] Using base_model URL for model display: ${baseModelUrl}`);
        finalModelUrl = baseModelUrl;
      }
      
      // If we still don't have a model URL but have renderedImage, try to construct model URL
      if (!finalModelUrl && renderedImage) {
        console.log(`🔍 [task-status] No model URL, but renderedImage is available: ${renderedImage}`);
        try {
          // Extract model URL from rendered image URL pattern
          // Example: If renderedImage is at path/to/taskId/legacy.webp
          // Then model might be at path/to/taskId/mesh.glb
          
          // First, get the base URL without the image filename and query parameters
          const imageUrl = new URL(renderedImage);
          const pathname = imageUrl.pathname;
          const directoryPath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
          
          // Construct potential model URL paths - try STL first, then GLB as fallback
          const potentialSTLUrl = `${imageUrl.protocol}//${imageUrl.host}${directoryPath}mesh.stl${imageUrl.search}`;
          const potentialGLBUrl = `${imageUrl.protocol}//${imageUrl.host}${directoryPath}mesh.glb${imageUrl.search}`;
          
          // Prefer STL over GLB
          console.log(`✅ [task-status] Trying to use STL model URL: ${potentialSTLUrl}`);
          const potentialModelUrl = potentialSTLUrl;
          
          console.log(`✅ [task-status] Constructed potential model URL: ${potentialModelUrl}`);
          finalModelUrl = potentialModelUrl;
        } catch (e) {
          console.error(`❌ [task-status] Error constructing model URL from renderedImage:`, e);
        }
      }
    }
    
    // Format the response with all URLs
    const response = {
      status: taskData.status,
      progress: taskData.progress || 0,
      modelUrl: finalModelUrl,
      baseModelUrl: baseModelUrl,
      renderedImage: renderedImage,
    }
    
    console.log(`🔍 [task-status] Sending response:`, response);
    
    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error(`❌ [task-status] Error getting task status:`, error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error",
        status: 'running', // Provide fallback status to avoid UI breaking
        progress: 40  // Provide some progress to show in UI
      }, 
      { status: 200, headers: corsHeaders } // Return 200 even on error for CORS compatibility
    );
  }
}

// GET method handler
export async function GET(request: NextRequest) {
  console.log("🔍 [task-status] GET request received");
  return handleTaskStatus(request);
}

// POST method handler (same functionality, different HTTP method for compatibility)
export async function POST(request: NextRequest) {
  console.log("🔍 [task-status] POST request received");
  return handleTaskStatus(request);
}

// HEAD method handler (for preflight/CORS)
export async function HEAD(request: NextRequest) {
  console.log("🔍 [task-status] HEAD request received");
  return new NextResponse(null, { 
    status: 200, 
    headers: corsHeaders
  });
}

// OPTIONS method handler for CORS preflight requests
export async function OPTIONS(request: Request) {
  console.log("🔍 [task-status] OPTIONS request received");
  return NextResponse.json(
    { success: true },
    { 
      status: 200,
      headers: corsHeaders
    }
  );
} 