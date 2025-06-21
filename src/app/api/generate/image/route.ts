import OpenAI from "openai";
import Replicate from "replicate";
import { NextResponse, NextRequest } from "next/server";

function getApiKey(modelName: string, userKey?: string) {
  if (modelName.startsWith("dall-e")) {
    return process.env.OPENAI_API_KEY ?? userKey;
  } else if (modelName.includes("black-forest-labs")) {
    return process.env.REPLICATE_API_TOKEN ?? userKey;
  } else {
    // Default to OpenAI
    return process.env.OPENAI_API_KEY ?? userKey;
  }
}

async function generateOpenAIImage(
  model: string,
  prompt: string,
  apiKey: string,
) {
  const openai = new OpenAI({ apiKey });

  const response = await openai.images.generate({
    model: model || "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    style: "vivid",
  });

  if (!response.data?.[0]?.url) {
    throw new Error("No image generated");
  }

  // Fetch the actual image data from the URL
  const imageUrl = response.data[0].url;
  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    throw new Error(
      `Failed to fetch generated image: ${imageResponse.statusText}`,
    );
  }

  const imageData = await imageResponse.arrayBuffer();

  // Return the image file directly as a blob response
  return new Response(imageData, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": imageData.byteLength.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
}

async function generateReplicateImage(
  model: string,
  prompt: string,
  inputImage: File | null,
  apiKey: string,
) {
  const replicate = new Replicate({ auth: apiKey });

  const input: Record<string, unknown> = {
    prompt,
    output_format: "jpg",
  };

  // Add input image if provided (for Flux Kontext)
  if (inputImage) {
    input.input_image = inputImage;
  }

  console.log("Replicate image input:", {
    model,
    input: { ...input, input_image: inputImage ? "File provided" : "None" },
  });

  const output = await replicate.run(model, { input });

  console.log("Replicate image output type:", typeof output, output);

  // Handle Replicate FileOutput using the .blob() method (similar to video)
  let fileOutput;

  if (Array.isArray(output) && output.length > 0) {
    fileOutput = output[0];
  } else {
    fileOutput = output;
  }

  console.log("Getting image blob from FileOutput...");

  // Use Replicate's FileOutput.blob() method to get the binary content
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const imageBlob = await fileOutput.blob();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const imageData = await imageBlob.arrayBuffer();

  // Return the image file directly as a blob response
  return new Response(imageData as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": (imageData as ArrayBuffer).byteLength.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let model: string;
    let prompt: string;
    let inputImage: File | null = null;
    let key: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData for Replicate models with optional input image
      const formData = await req.formData();
      model = formData.get("model") as string;
      prompt = formData.get("prompt") as string;
      inputImage = formData.get("input_image") as File | null;
      key = formData.get("key") as string | undefined;
    } else {
      // Handle JSON for OpenAI models
      const body = await req.json();
      model = body.model;
      prompt = body.inputs.prompt;
      key = body.key;
    }

    // Get the appropriate API key based on the model
    const apiKey = getApiKey(model || "dall-e-3", key);

    if (!apiKey) {
      return Response.json(
        { success: false, error: "API key required" },
        { status: 400 },
      );
    }

    // Route to appropriate provider based on model
    if (model && model.includes("black-forest-labs")) {
      // Use Replicate for Flux Kontext models
      return await generateReplicateImage(model, prompt, inputImage, apiKey);
    } else {
      // Use OpenAI for DALL-E models - now also returns blob directly
      return await generateOpenAIImage(model, prompt, apiKey);
    }
  } catch (error) {
    console.error("Image generation error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
