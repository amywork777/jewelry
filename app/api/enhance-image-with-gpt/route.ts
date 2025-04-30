import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { join } from "path";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Tripo API key
const TRIPO_API_KEY = process.env.TRIPO_API_KEY;

// Determine upload directory based on environment
const isProd = process.env.NODE_ENV === "production";
const getUploadDir = () => {
  // In production (Vercel/AWS Lambda), use /tmp
  // In development, use public/uploads
  return isProd
    ? join(tmpdir(), "uploads")
    : join(process.cwd(), "public", "uploads");
};

// Get the URL path for a file
const getFileUrlPath = (filename: string) => {
  return isProd
    ? `data:image/png;base64,${filename}` // In prod, return the filename as is (it will be a base64 string)
    : `/uploads/${filename}`; // In dev, return the path to the file
};

// Default base prompt to generate a minimalist jewelry image
const DEFAULT_PROMPT = `Create a minimalist, elegant piece of jewelry. The image should have a clean background, preferably white or a light neutral color. The jewelry piece should be the central focus, with sleek lines and a modern aesthetic. Ideal for a high-end jewelry product catalog. The rendering should be photorealistic with good lighting to highlight the material's texture and shine.`;

// 2.5D charm specific prompt
const CHARM_PROMPT = `Create a 2.5D gray charm based on the input image.

The model must have a clearly raised, low-relief appearance — similar to a thick, softly domed coin or medallion — but with stronger 3D volume and sculptural contouring than a typical flat bas-relief. Use a smooth matte finish and highly simplified, elegant features. Preserve the subject's recognizable form, proportions, and key identifying elements in a clean, refined, timeless style.

Important Style Instructions:
Focus entirely on the main subject (people, animals, objects, food, plants, fantasy creatures, etc.).
No background elements, bases, scenery, or frames — only the subject.

For people and animals:
• Simplify faces into soft, minimal features (small eyes, subtle nose/mouth, no exaggerated expressions).
• Avoid cartoon exaggeration — aim for natural, serene, or affectionate emotion.

For objects/food/plants/buildings:
• Keep forms bold, simple, iconic, and easily recognizable.

Strongly emphasize smooth, rounded volumes and bold silhouettes:
• Use deeper grooves, softly padded surfaces, and clean flowing curves to enhance the 3D feel.

Simplify all textures:
• No fine patterns, tiny folds, or mechanical details — only large, clear shapes.

Prioritize maximum readability:
• Design must stay clean and recognizable when scaled to about 1 inch in size.

Medallion Rules:
If the subject has thin, fragile, or widely spread parts (e.g., arms, tails, wings), contain the design inside a soft organic circular or oval medallion for strength.
If the subject is naturally compact and sturdy, leave it free-floating and self-contained without a background frame.

Manufacturing Constraints:
No full 3D bodies:
• All parts must rise smoothly from a single, slightly curved back surface (true 2.5D relief).
No text, writing, or background scenery.
No rings, loops, or holes for attachments — design should be clean; attachment rings added manually later.
All outer edges must be softly rounded and thick enough to ensure durability.
Model must be watertight, sturdy, and printable at small scale (~1 inch) for resin or FDM 3D printing.

Render Instructions:
Render the charm against a neutral background.
Use soft, diffuse lighting to highlight the form, curvature, and dimensionality.
Prioritize showcasing the depth and sculptural quality of the 2.5D design.`;

// Helper function to save uploaded file
async function saveUploadedFile(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided");
  }

  // Validate file type
  const fileType = file.type;
  if (!fileType.startsWith("image/")) {
    throw new Error("Only image files are supported");
  }

  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File size exceeds the 10MB limit");
  }

  // Create uploads directory if it doesn't exist
  const uploadsDir = getUploadDir();
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  // Generate a unique filename
  const timestamp = Date.now();
  const fileName = `upload-${timestamp}${getFileExtension(file.name)}`;
  const filePath = join(uploadsDir, fileName);

  // Convert file to buffer and save
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  if (isProd) {
    // In production, we'll pass around the file path (not exposed publicly)
    // Later we'll read this file and convert to base64 when needed
    return filePath;
  } else {
    // In development, return the public URL path
    return `/uploads/${fileName}`;
  }
}

// Helper function to get file extension
function getFileExtension(filename: string): string {
  const ext = filename.split(".").pop();
  return ext ? `.${ext}` : "";
}

// Helper function to enhance image directly with GPT-image-1
async function enhanceImageWithGPTImage(imageUrl: string, userPrompt: string): Promise<string> {
  const baseUrl = process.env.NODE_ENV === "development" 
    ? `http://localhost:${process.env.PORT || 3000}` 
    : process.env.NEXT_PUBLIC_APP_URL || "";
  
  const fullImageUrl = imageUrl.startsWith("http") 
    ? imageUrl 
    : `${baseUrl}${imageUrl}`;

  // Use the specific 2.5D charm prompt
  const finalPrompt = userPrompt.trim() ? `${CHARM_PROMPT}\n\nAdditional instructions: ${userPrompt}` : CHARM_PROMPT;
  
  console.log("Final prompt for GPT-image-1:", finalPrompt.substring(0, 100) + "...");

  try {
    // Fetch the image as a blob
    console.log("Fetching image from:", fullImageUrl);
    const imageResponse = await fetch(fullImageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const imageBlob = await imageResponse.blob();
    console.log("Image blob size:", Math.round(imageBlob.size / 1024), "KB");
    
    const imageBase64 = await blobToBase64(imageBlob);
    console.log("Base64 image length:", imageBase64.length);

    console.log("Preparing GPT-image-1 API request...");
    
    // Construct request payload for image variations endpoint
    const requestPayload = {
      model: 'gpt-image-1',
      n: 1,
      size: '1024x1024',
      image: imageBase64,
    };
    
    // Log the prompt separately since we're not sending it in the payload
    console.log(`📝 Prompt (not sent to API): ${finalPrompt.substring(0, 50)}...`);
    console.log(`🚀 Sending GPT-image-1 API request with payload keys: ${Object.keys(requestPayload).join(', ')}`);
    
    // Generate image with GPT-image-1 through direct API call
    console.log("Sending request to OpenAI GPT-image-1 API...");
    const response = await fetch('https://api.openai.com/v1/images/variations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'gpt-image-1'
      },
      body: JSON.stringify(requestPayload)
    });

    console.log("OpenAI API response status:", response.status);
    
    const responseText = await response.text();
    console.log("Response text (first 200 chars):", responseText.substring(0, 200) + "...");
    
    if (!response.ok) {
      console.error("GPT-image-1 API error:", responseText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = JSON.parse(responseText);
    console.log("Parsed response data:", JSON.stringify(data, null, 2).substring(0, 200) + "...");
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      console.error("No image URL in response:", data);
      throw new Error("OpenAI API returned no image URL");
    }
    
    // Return enhanced image URL
    console.log("Image successfully generated with GPT-image-1, URL:", data.data[0].url.substring(0, 50) + "...");
    return data.data[0].url;
  } catch (error) {
    console.error("Error enhancing image with GPT-image-1:", error);
    throw new Error(`Image enhancement failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString('base64');
  
  // OpenAI API might need different formats for different endpoints
  // Let's try just the raw base64 string without the data URL prefix
  return base64Data;
}

// Helper function to send enhanced image to Tripo API for 3D generation
async function sendToTripoAPI(imageUrl: string, jewelryType: string = "charm"): Promise<string | null> {
  if (!TRIPO_API_KEY) {
    console.warn("Tripo API key not configured, skipping 3D generation");
    return null;
  }

  try {
    console.log("Preparing request to Tripo API with image URL:", imageUrl.substring(0, 50) + "...");
    
    // For 2.5D charms, we want to use the image-to-model endpoint
    // Direct payload for image URL
    const payload = {
      image_url: imageUrl,
      model_type: "charm",
      options: {
        background: "transparent",
        quality: "high",
      }
    };

    console.log("Tripo API payload:", JSON.stringify(payload, null, 2));

    // Send to Tripo API
    console.log("Sending to Tripo API...");
    const response = await fetch("https://api.tripo3d.ai/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TRIPO_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    console.log("Tripo API response status:", response.status);
    const responseText = await response.text();
    console.log("Tripo API response:", responseText.substring(0, 200) + "...");

    if (!response.ok) {
      console.error("Tripo API error:", responseText);
      return null;
    }

    const data = JSON.parse(responseText);
    console.log("Successfully sent to Tripo API, task ID:", data.task_id);
    return data.task_id || null;
  } catch (error) {
    console.error("Error sending to Tripo API:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  console.log("==== STARTING ENHANCE-IMAGE-WITH-GPT ROUTE ====");
  console.log("Time:", new Date().toISOString());
  
  try {
    // Check API keys
    // NOTE: Make sure this key is correctly set in your .env file
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.error("❌ OpenAI API key is missing");
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please add it to your environment variables." },
        { status: 500 }
      );
    }
    
    // Parse the incoming form data
    const formData = await request.formData();
    
    // Explicitly log what we received
    console.log("📥 Request form data keys:", Array.from(formData.keys()));
    
    // Get the file and prompt
    const file = formData.get("file") as File | null;
    const userPrompt = formData.get("prompt") as string || "";
    
    console.log(`📥 Received prompt: "${userPrompt}"`);
    console.log(`📥 Received file: ${file ? `${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)` : "MISSING"}`);
    
    if (!file) {
      console.error("❌ No file provided in request");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    // Save the uploaded file and get its public path
    const uploadedImagePath = await saveUploadedFile(formData);
    console.log(`📁 Image saved at: ${uploadedImagePath}`);
    
    // Create the full URL for the image in development
    // In production, we'll use the file path directly
    let fullImageUrl: string;
    let imageBlob: Blob;
    
    if (isProd) {
      // In production, read the file from the given path
      const fileBuffer = await readFile(uploadedImagePath);
      imageBlob = new Blob([fileBuffer], { type: 'image/png' });
      fullImageUrl = uploadedImagePath; // Just use the path reference, not exposed publicly
    } else {
      // In development, create a URL to the file
      const baseUrl = process.env.NODE_ENV === "development" 
        ? `http://localhost:${process.env.PORT || 3000}` 
        : process.env.NEXT_PUBLIC_APP_URL || "";
      
      fullImageUrl = `${baseUrl}${uploadedImagePath}`;
      console.log(`🔗 Full image URL: ${fullImageUrl}`);
      
      // Fetch the image for processing
      console.log(`🔍 Fetching image from: ${fullImageUrl}`);
      const imageResponse = await fetch(fullImageUrl);
      
      if (!imageResponse.ok) {
        console.error(`❌ Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      
      imageBlob = await imageResponse.blob();
    }
    
    console.log(`📊 Image blob size: ${Math.round(imageBlob.size / 1024)} KB`);
    
    const imageBase64 = await blobToBase64(imageBlob);
    console.log(`📊 Base64 image length: ${imageBase64.length} characters`);
    
    // Prepare the GPT-image-1 prompt
    const finalPrompt = userPrompt.trim() ? `${CHARM_PROMPT}\n\nAdditional instructions: ${userPrompt}` : CHARM_PROMPT;
    
    console.log(`📝 Using GPT-image-1 prompt (first 100 chars): ${finalPrompt.substring(0, 100)}...`);
    console.log(`📝 Prompt length: ${finalPrompt.length} characters`);
    
    // Create a FormData for the multipart upload to OpenAI
    const openAIFormData = new FormData();
    openAIFormData.append("model", "gpt-image-1");
    openAIFormData.append("prompt", finalPrompt);
    
    // Re-get the file from formData to avoid having to reread it from disk
    openAIFormData.append("image", file);
    
    openAIFormData.append("n", "1");
    openAIFormData.append("size", "1024x1024");
    // response_format is not supported on the /images/edits endpoint yet
    
    console.log(`🚀 Sending GPT-image-1 API request with image and prompt`);
    console.log(`📝 Using multipart form with fields: model, prompt, image, n, size`);
    
    // Make the API call to OpenAI
    console.log(`🚀 Calling OpenAI API at: https://api.openai.com/v1/images/edits`);
    
    // Validate API key (don't log full key)
    if (!openaiApiKey.startsWith('sk-')) {
      console.error(`❌ API key does not appear to be in correct format (should start with 'sk-')`);
    } else {
      console.log(`🔑 Using API key (first 5 chars): ${openaiApiKey.substring(0, 5)}...`);
    }
    
    const apiStartTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: openAIFormData
    });
    
    const apiDuration = (Date.now() - apiStartTime) / 1000;
    console.log(`📊 API response received in ${apiDuration.toFixed(2)} seconds`);
    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
      console.log(`📊 Response parsed as JSON:`, JSON.stringify(data, null, 2).substring(0, 300) + "...");
      
      if (data.error) {
        console.error(`❌ GPT-image-1 API error:`, data.error);
        throw new Error(`OpenAI GPT-image-1 API error: ${data.error.message || 'Unknown API error'}`);
      }
    } catch (error) {
      console.error(`❌ Error parsing GPT-image-1 response:`, error);
      console.log(`📊 Response text (first 200 chars): ${responseText.substring(0, 200)}...`);
      throw new Error(`Failed to parse GPT-image-1 API response: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (!response.ok) {
      console.error(`❌ GPT-image-1 API error: ${responseText}`);
      throw new Error(`OpenAI GPT-image-1 API error: ${response.status} ${response.statusText}`);
    }
    
    // Get the enhanced image URL
    if (!data.data || !data.data[0]) {
      console.error(`❌ No image data in GPT-image-1 response:`, data);
      throw new Error("OpenAI GPT-image-1 API returned no image data");
    }
    
    let enhancedImageUrl;
    
    // Handle both URL and base64 response formats
    if (data.data[0].url) {
      // For /images/generations endpoint which can return URLs
      enhancedImageUrl = data.data[0].url;
      console.log(`✅ Image successfully generated with GPT-image-1 (URL format)`);
    } else if (data.data[0].b64_json) {
      // For /images/edits endpoint which returns base64
      console.log(`✅ Image successfully generated with GPT-image-1 (base64 format)`);
      
      const b64Data = data.data[0].b64_json;
      
      if (isProd) {
        // In production, return the data URL directly to avoid file system operations
        enhancedImageUrl = `data:image/png;base64,${b64Data}`;
        console.log(`🔗 Created data URL for the image`);
      } else {
        // In development, save to the filesystem
        // Save the base64 data to a file in the public/uploads directory
        const timestamp = Date.now();
        const outputFileName = `enhanced-${timestamp}.png`;
        const outputDir = getUploadDir();
        const outputPath = join(outputDir, outputFileName);
        
        console.log(`📂 Saving base64 image to: ${outputPath}`);
        
        // Convert base64 to buffer and write to file
        const imageBuffer = Buffer.from(b64Data, "base64");
        await writeFile(outputPath, imageBuffer);
        
        // Construct a URL that points to the saved image
        enhancedImageUrl = `/uploads/${outputFileName}`;
        console.log(`🔗 Created local URL for the image: ${enhancedImageUrl}`);
      }
    } else {
      console.error(`❌ No image URL or base64 data in response:`, data.data[0]);
      throw new Error("OpenAI GPT-image-1 API returned image in unknown format");
    }
    
    console.log(`🔗 Enhanced image path: ${enhancedImageUrl}`);
    
    // Send to Tripo API if enabled
    let tripoTaskId: string | null = null;
    if (TRIPO_API_KEY) {
      console.log(`🚀 Sending to Tripo API for 3D generation...`);
      tripoTaskId = await sendToTripoAPI(enhancedImageUrl, "charm");
      console.log(`✅ Tripo task ID: ${tripoTaskId || "FAILED"}`);
    } else {
      console.log(`ℹ️ Skipping Tripo API - no API key configured`);
    }
    
    // Calculate processing time
    const processingTime = (Date.now() - startTime) / 1000;
    console.log(`⏱️ Total processing time: ${processingTime.toFixed(2)} seconds`);
    
    // Return the response with the enhanced image URL
    return NextResponse.json({
      success: true,
      enhancedImageUrl,
      tripoTaskId,
      jewelryType: "charm",
      processingTime
    });
  } catch (error) {
    const processingTime = (Date.now() - startTime) / 1000;
    console.error(`❌ Error after ${processingTime.toFixed(2)} seconds:`, error);
    
    // Return detailed error for better debugging
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unknown error occurred",
        processingTime
      },
      { status: 500 }
    );
  } finally {
    console.log("==== COMPLETED ENHANCE-IMAGE-WITH-GPT ROUTE ====");
  }
} 