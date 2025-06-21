// Provider definitions with logos and branding
export interface Provider {
  id: string;
  name: string;
  logo: string; // URL to logo image
  website: string;
}

export interface Model {
  id: string;
  name: string;
  displayName: string;
  providerId: string;
  category: "text" | "image" | "audio" | "video";
  description?: string;
}

// Helper function to generate favicon URL
function getFaviconUrl(domain: string, size = 32): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

// Provider configurations
export const providers: Record<string, Provider> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    logo: getFaviconUrl("openai.com"),
    website: "https://openai.com",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    logo: getFaviconUrl("anthropic.com"),
    website: "https://anthropic.com",
  },
  elevenlabs: {
    id: "elevenlabs",
    name: "ElevenLabs",
    logo: getFaviconUrl("elevenlabs.io"),
    website: "https://elevenlabs.io",
  },
  replicate: {
    id: "replicate",
    name: "Replicate",
    logo: getFaviconUrl("replicate.com"),
    website: "https://replicate.com",
  },
  resemble: {
    id: "resemble",
    name: "Resemble AI",
    logo: getFaviconUrl("resemble.ai"),
    website: "https://resemble.ai",
  },
  blackforest: {
    id: "blackforest",
    name: "Black Forest Labs",
    logo: getFaviconUrl("blackforestlabs.ai"),
    website: "https://blackforestlabs.ai",
  },
};

// Model definitions organized by category
export const models: Model[] = [
  // Text Generation Models
  {
    id: "gpt-4o",
    name: "gpt-4o",
    displayName: "GPT-4o",
    providerId: "openai",
    category: "text",
    description: "Most capable model for complex reasoning and creative tasks",
  },
  {
    id: "claude-4-sonnet",
    name: "claude-sonnet-4-20250514",
    displayName: "Claude 4 Sonnet",
    providerId: "anthropic",
    category: "text",
    description:
      "Latest high-performance model with exceptional reasoning and efficiency",
  },
  {
    id: "llama-3-70b",
    name: "meta/meta-llama-3-70b-instruct",
    displayName: "Llama 3 70B",
    providerId: "replicate",
    category: "text",
    description: "Open-source large language model with 70 billion parameters",
  },

  // Image Generation Models
  {
    id: "dall-e-3",
    name: "dall-e-3",
    displayName: "gpt-image-1",
    providerId: "openai",
    category: "image",
    description: "Latest image generation model with improved prompt adherence",
  },
  {
    id: "flux-kontext",
    name: "black-forest-labs/flux-kontext-pro",
    displayName: "Flux Kontext Pro",
    providerId: "blackforest",
    category: "image",
    description: "Context-aware image editing and generation model",
  },
  {
    id: "flux-kontext",
    name: "black-forest-labs/flux-kontext-max",
    displayName: "Flux Kontext Max",
    providerId: "blackforest",
    category: "image",
    description:
      "Delivers maximum performance for improved typography & transformation",
  },
  // Audio Generation Models
  {
    id: "eleven_multilingual_v2",
    name: "eleven_multilingual_v2",
    displayName: "Multilingual v2",
    providerId: "elevenlabs",
    category: "audio",
    description: "High-quality voices across 32 languages",
  },
  {
    id: "chatterbox",
    name: "resemble-ai/chatterbox",
    displayName: "Chatterbox",
    providerId: "resemble",
    category: "audio",
    description:
      "Open-source TTS with emotion control and natural speech quality",
  },

  // Video Generation Models
  {
    id: "zsxkib/sonic",
    name: "zsxkib/sonic:a2aad29ea95f19747a5ea22ab14fc6594654506e5815f7f5ba4293e888d3e20f",
    displayName: "Sonic",
    providerId: "replicate",
    category: "video",
    description: "Realistic talking face animations with expressive movements",
  },
];

// Helper functions to get models by category
export function getModelsByCategory(category: Model["category"]): Model[] {
  return models.filter((model) => model.category === category);
}

export function getModelById(id: string): Model | undefined {
  return models.find((model) => model.id === id);
}

export function getProviderById(id: string): Provider | undefined {
  return providers[id];
}

export function getModelWithProvider(
  modelId: string,
): { model: Model; provider: Provider } | null {
  const model = getModelById(modelId);
  if (!model) return null;

  const provider = getProviderById(model.providerId);
  if (!provider) return null;

  return { model, provider };
}

// Default model selections
export const defaultModels = {
  text: "gpt-4o",
  image: "dall-e-3",
  audio: "eleven_multilingual_v2",
  video: "zsxkib/sonic",
};

// Helper to get display name for a model
export function getModelDisplayName(modelId: string): string {
  const model = getModelById(modelId);
  if (!model) return modelId;

  const provider = getProviderById(model.providerId);
  if (!provider) return model.displayName;

  return `${provider.name} ${model.displayName}`;
}
