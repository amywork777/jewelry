import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 60;

// Add rate limiting with exponential backoff
async function callWithRetry(fn, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Add a delay that increases with each retry
      if (retries > 0) {
        const delay = Math.pow(2, retries) * 1000;
        console.log(`📋 [enhance-image] Retry ${retries}/${maxRetries} - waiting ${delay}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return await fn();
    } catch (error: any) {
      retries++;
      
      // Only retry on rate limit errors
      if (error.status === 429 && retries < maxRetries) {
        console.log(`📋 [enhance-image] Rate limit exceeded, will retry in ${Math.pow(2, retries) * 1000}ms`);
        continue;
      }
      
      // For other errors or if we've exhausted retries, throw the error
      throw error;
    }
  }
}

export async function POST(request: Request) {
  console.log("📋 [enhance-image] API route started");
  const startTime = Date.now();
  
  try {
    console.log("📋 [enhance-image] Parsing form data...");
    const formData = await request.formData();
    
    // Extract data from request
    const file = formData.get('file') as File | null;
    const prompt = formData.get('prompt') as string;

    // Use environment variable for API key
    const apiKey = process.env.OPENAI_API_KEY;
    const claudeApiKey = process.env.CLAUDE_API_KEY || '';

    // Log for debugging (don't log API key)
    console.log("📋 [enhance-image] API Key configured:", !!apiKey);
    console.log("📋 [enhance-image] Claude API Key configured:", !!claudeApiKey);
    console.log("📋 [enhance-image] File present:", !!file);
    if (file) {
      console.log("📋 [enhance-image] File type:", file.type);
      console.log("📋 [enhance-image] File size:", file.size, "bytes");
    }

    // Validate inputs
    if (!file) {
      console.log("❌ [enhance-image] Error: Missing file");
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 }
      );
    }

    // If OpenAI API key is not provided or invalid, use Claude for text description
    if (!apiKey || apiKey === "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx") {
      console.log("⚠️ [enhance-image] Using Claude for text description due to missing OpenAI API key");
      
      // Convert the file to buffer for Claude
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      return await fallbackToClaudeVision(claudeApiKey, buffer, file.type, prompt || "Describe this image as a minimalist charm.");
    }

    // Initialize the OpenAI client
    console.log("📋 [enhance-image] Initializing OpenAI client...");
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Convert the file to buffer
    console.log("📋 [enhance-image] Converting file to buffer...");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("📋 [enhance-image] Starting image generation with gpt-image-1 model");
    
    // Create an enhanced version of the charm prompt
    const promptLength = prompt?.length || 0;
    console.log(`📋 [enhance-image] Using prompt of length ${promptLength} characters`);
    const enhancedPrompt = prompt || 
      "Create a 2.5D gray charm based on the input image. The charm should have a clearly raised, low-relief appearance with smooth matte finish and simplified elegant features. Preserve the subject's recognizable form in a clean, refined style. Focus on the main subject only - no background elements. Use deeper grooves, softly padded surfaces, and clean flowing curves for a strong 3D feel. Simplify all textures and prioritize maximum readability. Show the design on a white background.";

    try {
      console.log("📋 [enhance-image] Creating Blob and File object from buffer...");
      const imageBlob = new Blob([buffer], { type: file.type });
      const imageFile = new File([imageBlob], file.name, { type: file.type });
      
      console.log("📋 [enhance-image] Calling OpenAI GPT-Image-1 API with rate limiting protection...");
      console.log("📋 [enhance-image] API call started at:", new Date().toISOString());
      
      const result = await callWithRetry(async () => {
        return await openai.images.generate({
          model: "gpt-image-1",
          prompt: enhancedPrompt,
          n: 1,
          size: "1024x1024",
          quality: "high"
        });
      });
      
      const apiCallDuration = (Date.now() - startTime) / 1000;
      console.log(`📋 [enhance-image] OpenAI API call completed in ${apiCallDuration.toFixed(2)} seconds`);
      
      // Check if there's a valid image URL in the response
      if (!result.data || !result.data[0] || !result.data[0].url) {
        console.error("❌ [enhance-image] Invalid response format from OpenAI");
        console.log("❌ [enhance-image] Response data structure:", JSON.stringify(result, null, 2).substring(0, 200) + "...");
        
        // Fallback to Claude Vision
        console.log("📋 [enhance-image] Falling back to Claude Vision for text description");
        return await fallbackToClaudeVision(claudeApiKey, buffer, file.type, enhancedPrompt);
      }
      
      // Get the image URL from the response
      const imageUrl = result.data[0].url;
      console.log(`📋 [enhance-image] Received image URL: ${imageUrl.substring(0, 50)}...`);
      
      const totalDuration = (Date.now() - startTime) / 1000;
      console.log(`✅ [enhance-image] Successfully generated enhanced image in ${totalDuration.toFixed(2)} seconds`);
      return NextResponse.json({
        enhancedImageUrl: imageUrl,
        processingTime: totalDuration
      });
    } catch (error: any) {
      console.error("❌ [enhance-image] Error calling OpenAI:", error);
      
      // Handle rate limiting specifically
      if (error.status === 429) {
        console.error("❌ [enhance-image] Rate limit exceeded even after retries");
        
        // Fallback to Claude Vision
        console.log("📋 [enhance-image] Falling back to Claude Vision for text description due to rate limit");
        return await fallbackToClaudeVision(claudeApiKey, buffer, file.type, enhancedPrompt);
      }
      
      // For any other error, fallback to Claude Vision
      console.log("⚠️ [enhance-image] Falling back to Claude Vision due to API error");
      return await fallbackToClaudeVision(claudeApiKey, buffer, file.type, enhancedPrompt);
    }
  } catch (error: any) {
    console.error("❌ [enhance-image] Error processing request:", error);
    const totalDuration = (Date.now() - startTime) / 1000;
    console.error(`❌ [enhance-image] Request failed after ${totalDuration.toFixed(2)} seconds`);
    return NextResponse.json(
      { 
        useTextOnly: true,
        textDescription: "Error processing the charm: " + (error.message || String(error)),
        error: "Failed to process request: " + (error.message || String(error))
      },
      { status: 500 }
    );
  }
}

// Function to fallback to Claude Vision for text description
async function fallbackToClaudeVision(claudeApiKey: string, imageBuffer: Buffer, mimeType: string, originalPrompt: string) {
  try {
    console.log("📋 [enhance-image] Attempting to generate text description with Claude Vision");
    
    // Convert buffer to base64 for the API call
    const base64Image = imageBuffer.toString('base64');
    
    // STEP 1: Get a clear description of what's in the image
    console.log("📋 [enhance-image] Step 1: Getting accurate image description from Claude");
    const identifyPrompt = `Describe exactly what's in this image in detail. 
Be specific about the main subject(s).
For people, specify gender (man, woman, boy, girl, etc.) and approximate age (child, teen, adult, elderly).
For people, describe their appearance (hair color/style, clothing, facial features).
Examples: "two adult women with glasses in a kitchen", "adult man with beard holding coffee mug", "teenage girl with blonde hair", "elderly man with glasses"`;
    
    const identifyRequestBody = {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 150, // Allow for more detailed identification
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: base64Image
              }
            },
            {
              type: "text",
              text: identifyPrompt
            }
          ]
        }
      ]
    };
    
    // Call Claude API for identification
    console.log("📋 [enhance-image] Calling Claude API for identification...");
    const identifyResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify(identifyRequestBody)
    });
    
    if (!identifyResponse.ok) {
      throw new Error(`Claude API error: ${identifyResponse.status} ${identifyResponse.statusText}`);
    }
    
    const identifyResult = await identifyResponse.json();
    
    if (!identifyResult.content || !identifyResult.content[0] || !identifyResult.content[0].text) {
      throw new Error("Invalid response format from Claude API");
    }
    
    // Get the raw identification from Claude
    const identification = identifyResult.content[0].text.trim()
      .replace(/["']/g, '')
      .replace(/^(here's|this is|i would describe this as|i can see|the image shows)/gi, '')
      .trim();
    
    console.log(`📋 [enhance-image] Claude identified: "${identification}"`);
    
    // STEP 2: Use a second AI call to create a clear medallion description
    console.log("📋 [enhance-image] Step 2: Creating flat circle description using identification");
    
    // Use Claude API again to create a medallion description
    const formatPrompt = `Create a focused flat circle design description based on: "${identification}"

Format as "Flat circle with [specific description of main subjects]"

Guidelines:
- Remember this will be engraved on a FLAT CIRCULAR PENDANT
- For people: Make them cartoonish/simplified and include gender, age range (child, teen, adult, elderly), and distinctive features
- For animals: Include species, breed if clear, and distinctive pose or feature
- For objects: Include key distinguishing characteristics that define it
- Focus ONLY on the main subjects, not background elements
- Include 1-3 specific details that make the subject recognizable and unique
- Keep description clear and concise while capturing essential visual elements
- Use descriptive, specific terms rather than generic ones

Examples of good descriptions:
- "Flat circle with cartoon elderly bearded man in profile"
- "Flat circle with cartoon woman with ponytail reading"
- "Flat circle with spotted dalmatian puppy sitting"
- "Flat circle with mountain peak reflecting in lake"
- "Flat circle with pair of ballet shoes with ribbons"`;
    
    const formatRequestBody = {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: formatPrompt
        }
      ]
    };
    
    // Call Claude API for formatting
    console.log("📋 [enhance-image] Calling Claude API for formatting...");
    const formatResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify(formatRequestBody)
    });
    
    if (!formatResponse.ok) {
      throw new Error(`Claude API error: ${formatResponse.status} ${formatResponse.statusText}`);
    }
    
    const formatResult = await formatResponse.json();
    
    if (!formatResult.content || !formatResult.content[0] || !formatResult.content[0].text) {
      throw new Error("Invalid response format from Claude API");
    }
    
    // Get the final medallion description
    let medallionDescription = formatResult.content[0].text.trim()
      .replace(/["']/g, '')
      .replace(/^(here's|this is|i'd create:|i would create:|this would be)/gi, '')
      .trim();
    
    // Ensure it starts with "Flat circle with"
    if (!medallionDescription.toLowerCase().startsWith("flat circle with")) {
      console.log(`📋 [enhance-image] Adding prefix to description`);
      medallionDescription = `Flat circle with ${medallionDescription}`;
    }
    
    console.log(`📋 [enhance-image] Final description: "${medallionDescription}"`);
    console.log(`📋 [enhance-image] Description length: ${medallionDescription.length} characters`);
    
    // Return text-only mode response with the medallion description
    return NextResponse.json({
      useTextOnly: true,
      textDescription: medallionDescription
    });
  } catch (error: any) {
    console.error("❌ [enhance-image] Error generating text description with Claude:", error);
    
    // Fallback to generic text if Claude API fails
    return NextResponse.json({
      useTextOnly: true,
      textDescription: "Flat circle with simple design",
      error: "Failed to generate text description: " + (error.message || String(error))
    });
  }
}

// Simplified fallback function to get medallion type
function getMedallionFallback(identification: string): string {
  // Convert to lowercase for easier matching
  const text = identification.toLowerCase();
  
  // Check for people-related terms
  if (/person|people|face|profile|selfie|woman|man|girl|boy|human|glasses|portrait/i.test(text)) {
    return "Flat circle with cartoon profile";
  }
  
  // Check for common subjects
  if (/heart|love/i.test(text)) return "Flat circle with heart";
  if (/flower|plant|petal|rose/i.test(text)) return "Flat circle with flower";
  if (/animal|cat|dog|bird|pet/i.test(text)) return "Flat circle with animal";
  if (/symbol|sign|logo|star/i.test(text)) return "Flat circle with symbol";
  if (/shape|pattern|geometric/i.test(text)) return "Flat circle with shape";
  if (/food|fruit|meal|drink/i.test(text)) return "Flat circle with food";
  if (/nature|landscape|sky/i.test(text)) return "Flat circle with nature";
  if (/building|house|structure/i.test(text)) return "Flat circle with building";
  
  // Default fallback
  return "Flat circle with design";
} 