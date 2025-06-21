import {
  type TextGenerationRequest,
  type ImageGenerationRequest,
  type AudioGenerationRequest,
  type VideoGenerationRequest,
  type ImageApiResponse,
  type AudioApiResponse,
  type VideoApiResponse,
} from "./types";

export async function generateText(
  request: TextGenerationRequest,
): Promise<string> {
  const response = await fetch("/api/generate/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Handle streaming response
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let result = "";

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }
  }

  return result;
}

export async function generateImage(
  request: ImageGenerationRequest,
): Promise<ImageApiResponse> {
  try {
    let response: Response;

    // Check if this is a Replicate model that needs FormData
    if (request.model.includes("black-forest-labs")) {
      // Use FormData for Replicate models
      const formData = new FormData();
      formData.append("model", request.model);
      formData.append("prompt", request.inputs.prompt);

      // Add input image if provided
      if (request.inputs.input_image) {
        formData.append("input_image", request.inputs.input_image);
      }

      if (request.key) {
        formData.append("key", request.key);
      }

      response = await fetch("/api/generate/image", {
        method: "POST",
        body: formData,
      });
    } else {
      // Use JSON for OpenAI models
      response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
    }

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Both OpenAI and Replicate now return blob directly
    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);

    return {
      success: true,
      url: imageUrl,
      revised_prompt: request.inputs.prompt, // Backend no longer returns revised prompt
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function generateAudio(
  request: AudioGenerationRequest,
): Promise<AudioApiResponse> {
  try {
    const response = await fetch("/api/generate/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Audio endpoint returns blob directly, not JSON
    const audioBlob = await response.blob();
    return {
      success: true,
      audio: audioBlob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function generateVideo(
  request: VideoGenerationRequest,
): Promise<VideoApiResponse> {
  try {
    const formData = new FormData();
    formData.append("image", request.inputs.image, "image.png");
    formData.append("audio", request.inputs.audio, "audio.mp3");
    formData.append("model", request.model);
    if (request.key) {
      formData.append("key", request.key);
    }

    const response = await fetch("/api/generate/video", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Video endpoint now returns blob directly
    const videoBlob = await response.blob();
    return {
      success: true,
      video_blob: videoBlob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
