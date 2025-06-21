import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import Replicate from "replicate";
import { NextResponse, NextRequest } from "next/server";
import type { AudioGenerationRequest } from "~/utils/types";

function getApiKey(modelName: string, userKey?: string) {
  if (modelName.includes("eleven")) {
    return process.env.ELEVEN_LABS_KEY ?? userKey;
  } else if (modelName.includes("resemble-ai")) {
    return process.env.REPLICATE_API_TOKEN ?? userKey;
  } else {
    // Default to ElevenLabs
    return process.env.ELEVEN_LABS_KEY ?? userKey;
  }
}

async function generateElevenLabsAudio(
  model: string,
  text: string,
  apiKey: string,
) {
  const elevenlabs = new ElevenLabsClient({ apiKey });

  const audio = await elevenlabs.textToSpeech.convert("Fxt4GZnlXkUGMtWSYIcm", {
    text,
    modelId: model || "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
  });

  const reader = audio.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

async function generateReplicateAudio(
  model: string,
  text: string,
  apiKey: string,
) {
  const replicate = new Replicate({ auth: apiKey });

  const input = {
    prompt: text,
  };

  console.log("Replicate audio input:", { model, input });

  const output = await replicate.run(model, { input });

  console.log("Replicate audio output type:", typeof output, output);

  // Handle Replicate FileOutput using the .blob() method (similar to video)
  let fileOutput;

  if (Array.isArray(output) && output.length > 0) {
    fileOutput = output[0];
  } else {
    fileOutput = output;
  }

  console.log("Getting audio blob from FileOutput...");

  // Use Replicate's FileOutput.blob() method to get the binary content
  const audioBlob = await fileOutput.blob();
  const audioBuffer = await audioBlob.arrayBuffer();

  return Buffer.from(audioBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const { model, inputs, key } = (await req.json()) as AudioGenerationRequest;

    // Get the appropriate API key based on the model
    const apiKey = getApiKey(model || "eleven_multilingual_v2", key);

    if (!apiKey) {
      return Response.json(
        { success: false, error: "API key required" },
        { status: 400 },
      );
    }

    const { text } = inputs;
    let audioBuffer: Buffer;

    // Route to appropriate provider based on model
    if (model && model.includes("resemble-ai")) {
      // Use Replicate for Chatterbox
      audioBuffer = await generateReplicateAudio(model, text, apiKey);
    } else {
      // Use ElevenLabs for eleven_ models
      audioBuffer = await generateElevenLabsAudio(model, text, apiKey);
    }

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Audio generation error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
