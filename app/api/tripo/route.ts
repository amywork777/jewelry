import { NextRequest, NextResponse } from 'next/server'

// Tripo API key with server-side security
const TRIPO_API_KEY = process.env.TRIPO_API_KEY || "tsk_mJ1s2uXtjEes3y0JrYbL3cObVcL5sBbdTdRjQUB_4dJ"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body
    
    console.log("🔍 [generate-model] Received model generation request");
    console.log(`🔍 [generate-model] Prompt: "${prompt}"`);
    
    // Create request body for Tripo API
    const requestBody = {
      type: "text_to_model",
      prompt: `Jewelry design: ${prompt}`,
      model_version: "v2.5-20250123",
      texture: false, // Disable textures for faster generation and better metal appearance
      auto_size: true // Enable auto-sizing for better proportions
    }
    
    console.log(`🔍 [generate-model] Sending request to Tripo API:`, requestBody);
    
    // Call Tripo API to start model generation
    const tripoResponse = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TRIPO_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log(`🔍 [generate-model] Tripo API response status: ${tripoResponse.status} ${tripoResponse.statusText}`);
    
    if (!tripoResponse.ok) {
      let errorText = "Unknown error";
      try {
        const errorData = await tripoResponse.json();
        console.error(`❌ [generate-model] Tripo API error:`, errorData);
        errorText = JSON.stringify(errorData);
      } catch (e) {
        console.error(`❌ [generate-model] Could not parse error response`);
      }
      
      return NextResponse.json({ 
        error: `API error: ${tripoResponse.status} ${tripoResponse.statusText}`, 
        details: errorText 
      }, { status: tripoResponse.status })
    }
    
    const data = await tripoResponse.json()
    console.log(`✅ [generate-model] Tripo API success response:`, data);
    
    let responseData;
    
    if (data.data?.task_id) {
      responseData = { taskId: data.data.task_id };
      console.log(`✅ [generate-model] Task created with ID: ${data.data.task_id}`);
    } else {
      console.error(`❌ [generate-model] No task ID in response:`, data);
      return NextResponse.json({ error: "No task ID returned from Tripo API" }, { status: 500 })
    }
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error(`❌ [generate-model] Error generating model:`, error);
    return NextResponse.json({ 
      error: `Failed to create model with Tripo API: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("taskId")
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }
    
    console.log(`🔍 [task-status] Checking status for task ID: ${taskId}`);
    
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
      
      return NextResponse.json(
        { error: `API error: ${tripoResponse.status} ${tripoResponse.statusText}`, details: errorData },
        { status: tripoResponse.status }
      )
    }
    
    const data = await tripoResponse.json();
    
    if (!data || !data.data) {
      console.error(`❌ [task-status] Unexpected response format from Tripo API:`, data);
      return NextResponse.json(
        { error: "Unexpected API response format" },
        { status: 500 }
      );
    }
    
    const taskData = data.data
    
    console.log(`🔍 [task-status] Task status: ${taskData.status}, progress: ${taskData.progress || 0}%`);
    
    // Extract model URLs for completed tasks
    let finalModelUrl = null;
    let baseModelUrl = null;
    let renderedImage = null;
    
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
          console.log(`✅ [generate-model] Trying to use STL model URL: ${potentialSTLUrl}`);
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
    
    return NextResponse.json(response);
  } catch (error) {
    console.error(`❌ [task-status] Error getting task status:`, error);
    return NextResponse.json(
      { error: `Failed to check model status with Tripo API: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}