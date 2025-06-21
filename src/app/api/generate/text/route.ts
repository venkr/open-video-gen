import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { replicate } from "@ai-sdk/replicate";
import type { NextRequest } from "next/server";
import type { TextGenerationRequest } from "~/utils/types";

function getModelProvider(modelName: string) {
  if (modelName.startsWith("gpt-")) {
    return openai(modelName);
  } else if (modelName.startsWith("claude-")) {
    return anthropic(modelName);
  } else if (modelName.includes("meta-llama")) {
    return replicate.languageModel(modelName);
  } else {
    // Default to OpenAI for unknown models
    return openai(modelName);
  }
}

function getApiKey(modelName: string, userKey?: string) {
  if (modelName.startsWith("gpt-")) {
    return process.env.OPENAI_API_KEY ?? userKey;
  } else if (modelName.startsWith("claude-")) {
    return process.env.ANTHROPIC_API_KEY ?? userKey;
  } else if (modelName.includes("meta-llama")) {
    return process.env.REPLICATE_API_TOKEN ?? userKey;
  } else {
    return process.env.OPENAI_API_KEY ?? userKey;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { model, inputs, key } = (await req.json()) as TextGenerationRequest;

    // Get the appropriate API key based on the model
    const apiKey = getApiKey(model || "gpt-4o", key);

    if (!apiKey) {
      return Response.json(
        { success: false, error: "API key required" },
        { status: 400 },
      );
    }

    const { prompt } = inputs;

    const result = streamText({
      model: getModelProvider(model || "gpt-4o"),
      system:
        "You are a creative scriptwriter for short-form videos. Generate concise, engaging scripts that can be spoken in 30 seconds or less. Focus on clear, conversational language that works well for video content. Keep it punchy and memorable. Don't include any background cues - these will be vertbatim spoken by one person. Ensure they're extremely short.",
      messages: [{ role: "user", content: prompt }],
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Text generation error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
