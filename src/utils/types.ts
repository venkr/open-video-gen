// API Request Types
export interface TextGenerationRequest {
  model: string;
  inputs: {
    prompt: string;
  };
  key?: string;
}

export interface ImageGenerationRequest {
  model: string;
  inputs: {
    prompt: string;
    input_image?: File; // Optional input image for context-aware models like Flux Kontext
  };
  key?: string;
}

export interface AudioGenerationRequest {
  model: string;
  inputs: {
    text: string;
  };
  key?: string;
}

export interface VideoGenerationRequest {
  model: string;
  inputs: {
    image: File;
    audio: File;
  };
  key?: string;
}

// API Response Types
export interface TextGenerationResponse {
  success: true;
  text: string;
}

export interface ImageGenerationResponse {
  success: true;
  url: string;
  revised_prompt?: string;
}

export interface AudioGenerationResponse {
  success: true;
  audio: Blob;
}

export interface VideoGenerationResponse {
  success: true;
  video_blob: Blob;
}

// Error Response Type
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// Union types for API responses
export type TextApiResponse = TextGenerationResponse | ApiErrorResponse;
export type ImageApiResponse = ImageGenerationResponse | ApiErrorResponse;
export type AudioApiResponse = AudioGenerationResponse | ApiErrorResponse;
export type VideoApiResponse = VideoGenerationResponse | ApiErrorResponse;

// Provider Types
export type TextProvider = "openai-gpt4o" | "openai-gpt35";
export type ImageProvider = "openai-dalle3" | "openai-dalle2";
export type AudioProvider = "elevenlabs-multilingual" | "elevenlabs-turbo";
export type VideoProvider = "replicate-sonic" | "replicate-sadtalker";

// Helper type guard functions
export function isSuccessResponse(response: {
  success: boolean;
}): response is { success: true } & Record<string, unknown> {
  return response.success;
}

export function isErrorResponse(response: {
  success: boolean;
}): response is ApiErrorResponse {
  return !response.success;
}
