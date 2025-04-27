import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    console.log("📷 [analyze-image-for-prompt] Processing incoming image analysis request");
    
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      console.error("❌ [analyze-image-for-prompt] No image file provided in request");
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      );
    }

    console.log(`📷 [analyze-image-for-prompt] Received image: ${imageFile.name}, type: ${imageFile.type}, size: ${Math.round(imageFile.size / 1024)}KB`);

    // Validate image type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type)) {
      console.error(`❌ [analyze-image-for-prompt] Unsupported image type: ${imageFile.type}`);
      return NextResponse.json(
        { 
          error: "Unsupported image type. Please use JPEG, PNG, or WebP",
          enhancedPrompt: "Create a single 3D model with minimum thickness of 0.8mm-1mm, avoiding ultra-thin sections and fine details" 
        },
        { status: 400 }
      );
    }

    // Validate image size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      console.error(`❌ [analyze-image-for-prompt] Image too large: ${Math.round(imageFile.size / 1024 / 1024)}MB`);
      return NextResponse.json(
        { 
          error: "Image too large. Maximum size is 10MB", 
          enhancedPrompt: "Create a single 3D model with minimum thickness of 0.8mm-1mm, avoiding ultra-thin sections and fine details"
        },
        { status: 400 }
      );
    }

    // Convert the file to a base64 string
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    console.log(`📷 [analyze-image-for-prompt] Converted image to base64, length: ${Math.round(base64Image.length / 1024)}KB`);

    console.log(`📷 [analyze-image-for-prompt] Calling OpenAI Vision API with model: gpt-4o`);
    
    // Vision API call to analyze the image
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a 3D design expert specializing in digital manufacturing.
          Your goal is to identify the MAIN object in the image and create a prompt that will generate a 
          single, well-designed 3D model suitable for manufacturing.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and create a prompt for generating a 3D model. 
              Important guidelines:
              1. Identify only the MAIN object in the image - if multiple objects are present, pick the most prominent one.
              2. Create a prompt that emphasizes it's a SINGLE object with proper structure for manufacturing.
              3. Include details about minimum thickness (0.8mm-1mm) and avoiding ultra-thin sections.
              4. Specify that the design should avoid ultra-fine details to maintain clarity.
              5. Do NOT include any explanations, just provide the prompt text itself.
              6. Start with "Create a single 3D model..." and provide a detailed description.
              7. If you can't determine what's in the image or the image appears unsuitable, just respond with "Create a single 3D model based on this image with minimum thickness of 0.8mm-1mm, avoiding ultra-thin sections and fine details."`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/${imageFile.type};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    const enhancedPrompt = response.choices[0].message.content?.trim() || 
      "Create a single 3D model based on this image with minimum thickness of 0.8mm-1mm, avoiding ultra-thin sections and fine details";
    
    console.log(`✅ [analyze-image-for-prompt] Successfully generated prompt: "${enhancedPrompt.substring(0, 100)}${enhancedPrompt.length > 100 ? '...' : ''}"`);

    return NextResponse.json({
      enhancedPrompt,
    });
  } catch (error: any) {
    console.error("❌ [analyze-image-for-prompt] Error analyzing image:", error);
    
    // Provide more specific error messages based on common API errors
    let errorMessage = "Failed to analyze image";
    let fallbackPrompt = "Create a single 3D model based on this image with minimum thickness of 0.8mm-1mm, avoiding ultra-thin sections and fine details";
    
    if (error.status === 429) {
      errorMessage = "Rate limit exceeded. Please try again later.";
    } else if (error.status === 400) {
      errorMessage = "Invalid request to image analysis API.";
    } else if (error.status === 401) {
      errorMessage = "Authentication error with image analysis API.";
    }
    
    console.log(`⚠️ [analyze-image-for-prompt] Returning fallback prompt due to error: ${errorMessage}`);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        enhancedPrompt: fallbackPrompt
      },
      { status: 500 }
    );
  }
} 