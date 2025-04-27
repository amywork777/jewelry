import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      );
    }

    // Convert the file to a base64 string
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

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
              6. Start with "Create a single 3D model..." and provide a detailed description.`
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

    return NextResponse.json({
      enhancedPrompt,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { 
        error: "Failed to analyze image",
        enhancedPrompt: "Create a single 3D model based on this image with minimum thickness of 0.8mm-1mm, avoiding ultra-thin sections and fine details"
      },
      { status: 500 }
    );
  }
} 