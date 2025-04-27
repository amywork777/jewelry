import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, type } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Instruction for ChatGPT
    const instruction = `
    You are a jewelry design expert. Your task is to enhance the user's prompt
    to ensure it describes a SINGLE object with proper characteristics for manufacturability.
    
    Guidelines:
    1. Focus on a SINGLE object only - if multiple objects are mentioned, pick the main one.
    2. Add details for manufacturability (minimum thickness of 0.8mm-1mm, avoid ultra-thin sections).
    3. Ensure the object has proper structural integrity.
    4. Incorporate design elements that work well for manufacturing (smooth transitions, avoid ultra-fine details).
    5. Maintain the essence and style of the original prompt.
    6. Keep the enhanced prompt concise but descriptive.
    7. Do not include any explanations in your response - ONLY return the enhanced prompt.
    
    Original prompt: "${prompt}"
    
    Enhanced prompt:
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a 3D modeling expert that helps enhance prompts for 3D model generation."
        },
        {
          role: "user",
          content: instruction
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const enhancedPrompt = completion.choices[0].message.content?.trim() || prompt;

    return NextResponse.json({
      enhancedPrompt,
    });
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return NextResponse.json(
      { 
        error: "Failed to enhance prompt",
        enhancedPrompt: null
      },
      { status: 500 }
    );
  }
} 