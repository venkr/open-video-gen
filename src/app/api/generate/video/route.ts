import Replicate from "replicate";
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const imageFile = formData.get("image") as File;
    const audioFile = formData.get("audio") as File;
    const model = formData.get("model") as string;
    const key = formData.get("key") as string;

    // Use server-side key for now, will switch to user-provided key later
    const apiKey = process.env.REPLICATE_API_KEY ?? key;

    if (!apiKey) {
      return Response.json(
        { success: false, error: "API key required" },
        { status: 400 },
      );
    }

    if (!imageFile || !audioFile) {
      return Response.json(
        { success: false, error: "Image and audio files required" },
        { status: 400 },
      );
    }

    const replicate = new Replicate({ auth: apiKey });

    // Convert files to buffers
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    const output = await replicate.run(
      "zsxkib/sonic:a2aad29ea95f19747a5ea22ab14fc6594654506e5815f7f5ba4293e888d3e20f",
      {
        input: {
          image: imageBuffer,
          audio: audioBuffer,
          keep_resolution: true,
        },
      },
    );

    console.log("Sonic API output type:", typeof output, output);

    // Handle Replicate FileOutput using the .blob() method
    let fileOutput;

    if (Array.isArray(output) && output.length > 0) {
      // If multiple outputs, take the first one
      fileOutput = output[0];
    } else {
      // Single output
      fileOutput = output;
    }

    console.log("Getting blob from FileOutput...");

    // Use Replicate's FileOutput.blob() method to get the binary content
    const videoBlob = await fileOutput.blob();
    const videoData = await videoBlob.arrayBuffer();

    // Return the video file directly as a blob response
    return new Response(videoData, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": videoData.byteLength.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
