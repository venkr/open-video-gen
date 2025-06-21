'use client';

import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { generateText, generateImage as apiGenerateImage, generateAudio as apiGenerateAudio, generateVideo as apiGenerateVideo } from '~/utils/api';
import { getModelById, defaultModels } from '~/utils/providers';
import { storage, storeImageFromUrl, storeAudioBlob, createBlobUrl, generateAssetId } from '~/utils/storage';
import ModelSelector from './ModelSelector';
import AssetGallery from './AssetGallery';

export default function VideoGenPipeline() {
  const [script, setScript] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Asset IDs for IndexedDB storage
  const [imageAssetId, setImageAssetId] = useState<string | null>(null);
  const [audioAssetId, setAudioAssetId] = useState<string | null>(null);
  const [videoAssetId, setVideoAssetId] = useState<string | null>(null);

  // Refresh triggers for galleries
  const [imageRefreshTrigger, setImageRefreshTrigger] = useState(0);
  const [audioRefreshTrigger, setAudioRefreshTrigger] = useState(0);
  const [videoRefreshTrigger, setVideoRefreshTrigger] = useState(0);

  // User input fields
  const [scriptPrompt, setScriptPrompt] = useState('Generate a short, engaging script for a 30-second video about AI technology. Keep it conversational and exciting.');
  const [imagePrompt, setImagePrompt] = useState('A professional portrait of a person speaking to camera');

  // Model selections
  const [selectedTextModel, setSelectedTextModel] = useState(defaultModels.text);
  const [selectedImageModel, setSelectedImageModel] = useState(defaultModels.image);
  const [selectedAudioModel, setSelectedAudioModel] = useState(defaultModels.audio);
  const [selectedVideoModel, setSelectedVideoModel] = useState(defaultModels.video);

  // Upload handlers
  const handleImageUpload = (assetId: string) => {
    setImageRefreshTrigger(prev => prev + 1);
  };

  const handleAudioUpload = (assetId: string) => {
    setAudioRefreshTrigger(prev => prev + 1);
  };

  // Initialize storage and load newest assets on component mount
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        await storage.init();

        // Load and auto-select newest assets
        const allAssets = await storage.getAllAssets();

        // Find newest image asset
        const imageAssets = allAssets
          .filter(asset => asset.type === 'image')
          .sort((a, b) => b.createdAt - a.createdAt);

        if (imageAssets.length > 0) {
          const newestImage = imageAssets[0];
          if (newestImage) {
            setImageAssetId(newestImage.id);
            const blobUrl = await createBlobUrl(newestImage.id);
            if (blobUrl) {
              setImageUrl(blobUrl);
            }
          }
        }

        // Find newest audio asset
        const audioAssets = allAssets
          .filter(asset => asset.type === 'audio')
          .sort((a, b) => b.createdAt - a.createdAt);

        if (audioAssets.length > 0) {
          const newestAudio = audioAssets[0];
          if (newestAudio) {
            setAudioAssetId(newestAudio.id);
            const blobUrl = await createBlobUrl(newestAudio.id);
            if (blobUrl) {
              setAudioUrl(blobUrl);
            }
          }
        }

        // Find newest video asset
        const videoAssets = allAssets
          .filter(asset => asset.type === 'video')
          .sort((a, b) => b.createdAt - a.createdAt);

        if (videoAssets.length > 0) {
          const newestVideo = videoAssets[0];
          if (newestVideo) {
            setVideoAssetId(newestVideo.id);
            const blobUrl = await createBlobUrl(newestVideo.id);
            if (blobUrl) {
              setVideoUrl(blobUrl);
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize storage:', error);
      }
    };

    void initializeStorage();
  }, []);

  const generateScript = async () => {
    setIsGenerating('script');
    try {
      const textModel = getModelById(selectedTextModel);
      const result = await generateText({
        model: textModel?.name ?? 'gpt-4o',
        inputs: { prompt: scriptPrompt }
      });
      setScript(result);
    } catch (error) {
      console.error('Script generation failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const generateImage = async () => {
    setIsGenerating('image');
    try {
      const imageModel = getModelById(selectedImageModel);

      // Prepare the request inputs
      const inputs: { prompt: string; input_image?: File } = { prompt: imagePrompt };

      // If Flux Kontext is selected and we have a current image, pass it as input
      if (imageModel?.name?.includes('flux-kontext') && imageAssetId) {
        try {
          const currentImageAsset = await storage.getAsset(imageAssetId);
          if (currentImageAsset) {
            // Convert blob to File for the API
            const imageFile = new File([currentImageAsset.blob], 'input.jpg', { type: 'image/jpeg' });
            inputs.input_image = imageFile;
          }
        } catch (error) {
          console.warn('Could not load current image for Flux Kontext:', error);
        }
      }

      const response = await apiGenerateImage({
        model: imageModel?.name ?? 'dall-e-3',
        inputs
      });

      if (response.success) {
        // Store image in IndexedDB and get asset ID
        const assetId = await storeImageFromUrl(response.url, {
          name: `Generated Image - ${new Date().toLocaleString()}`,
          prompt: imagePrompt,
          model: imageModel?.name ?? 'dall-e-3'
        });

        // Auto-select the newly generated image
        setImageAssetId(assetId);

        // Create blob URL for display
        const blobUrl = await createBlobUrl(assetId);
        if (blobUrl) {
          setImageUrl(blobUrl);
        }

        // Trigger gallery refresh
        setImageRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Image generation failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const generateAudio = async () => {
    if (!script) return;

    setIsGenerating('audio');
    try {
      const audioModel = getModelById(selectedAudioModel);
      const response = await apiGenerateAudio({
        model: audioModel?.name ?? 'eleven_multilingual_v2',
        inputs: { text: script }
      });

      if (response.success) {
        // Store audio in IndexedDB and get asset ID
        const assetId = await storeAudioBlob(response.audio, {
          name: `Generated Audio - ${new Date().toLocaleString()}`,
          prompt: script.substring(0, 100) + '...',
          model: audioModel?.name ?? 'eleven_multilingual_v2'
        });

        // Auto-select the newly generated audio
        setAudioAssetId(assetId);

        // Create blob URL for display
        const blobUrl = await createBlobUrl(assetId);
        if (blobUrl) {
          setAudioUrl(blobUrl);
        }

        // Trigger gallery refresh
        setAudioRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Audio generation failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const generateVideo = async () => {
    if (!imageAssetId || !audioAssetId) return;

    setIsGenerating('video');
    try {
      // Get image and audio blobs directly from IndexedDB
      const [imageAsset, audioAsset] = await Promise.all([
        storage.getAsset(imageAssetId),
        storage.getAsset(audioAssetId)
      ]);

      if (!imageAsset || !audioAsset) {
        throw new Error('Required assets not found in storage');
      }

      // Convert to File objects
      const imageFile = new File([imageAsset.blob], 'image.png', { type: 'image/png' });
      const audioFile = new File([audioAsset.blob], 'audio.mp3', { type: 'audio/mpeg' });

      const videoModel = getModelById(selectedVideoModel);
      const response = await apiGenerateVideo({
        model: videoModel?.name ?? 'zsxkib/sonic',
        inputs: { image: imageFile, audio: audioFile }
      });

      if (response.success) {
        // Store video blob directly in IndexedDB and get asset ID
        const videoPrompt = `Image: ${imageAssetId}, Audio: ${audioAssetId}`;
        const assetId = generateAssetId('video', videoPrompt);

        await storage.storeAsset(assetId, response.video_blob, {
          type: 'video',
          name: `Generated Video - ${new Date().toLocaleString()}`,
          prompt: videoPrompt,
          model: videoModel?.name ?? 'zsxkib/sonic'
        });

        // Auto-select the newly generated video
        setVideoAssetId(assetId);

        // Create blob URL for display
        const blobUrl = await createBlobUrl(assetId);
        if (blobUrl) {
          setVideoUrl(blobUrl);
        }

        // Trigger gallery refresh
        setVideoRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Video generation failed:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Main Title Card */}
      <div className="mb-8">
        <Card className="p-6 border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <h1 className="text-4xl font-black text-center text-gray-900 tracking-wider">
            OPENVIDEOGEN
          </h1>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Script Generation */}
          <div>
            <div className="mb-4">
              <Card className="p-3 border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-gray-900">
                <h2 className="text-xl font-black text-white tracking-wide">1. SCRIPT</h2>
              </Card>
            </div>
            <Card className="p-6 border-3 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <ModelSelector
                category="text"
                value={selectedTextModel}
                onValueChange={setSelectedTextModel}
                className="w-full mb-4"
              />

              <Textarea
                value={scriptPrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScriptPrompt(e.target.value)}
                placeholder="What should the script be about?"
                className="min-h-[80px] border-2 border-gray-900 mb-4"
              />
              <Button
                onClick={generateScript}
                disabled={isGenerating === 'script' || !scriptPrompt.trim()}
                className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {isGenerating === 'script' ? 'Generating...' : 'Generate Script'}
              </Button>
              <Textarea
                value={script}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScript(e.target.value)}
                placeholder="Generated script will appear here..."
                className="min-h-[120px] border-2 border-gray-900"
              />
            </Card>
          </div>

          {/* Audio Generation */}
          <div>
            <div className="mb-4">
              <Card className="p-3 border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-gray-900">
                <h2 className="text-xl font-black text-white tracking-wide">2. AUDIO</h2>
              </Card>
            </div>
            <Card className="p-6 border-3 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <ModelSelector
                category="audio"
                value={selectedAudioModel}
                onValueChange={setSelectedAudioModel}
                className="w-full mb-4"
              />

              <Button
                onClick={generateAudio}
                disabled={!script || isGenerating === 'audio'}
                className="w-full mb-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {isGenerating === 'audio' ? 'Generating...' : 'Generate Audio'}
              </Button>

              {/* Audio Gallery */}
              <AssetGallery
                type="audio"
                selectedAssetId={audioAssetId}
                onAssetSelect={setAudioAssetId}
                onAssetUrlChange={setAudioUrl}
                refreshTrigger={audioRefreshTrigger}
                onUpload={handleAudioUpload}
              />
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Generation */}
          <div>
            <div className="mb-4">
              <Card className="p-3 border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-gray-900">
                <h2 className="text-xl font-black text-white tracking-wide">3. IMAGE</h2>
              </Card>
            </div>
            <Card className="p-6 border-3 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <ModelSelector
                category="image"
                value={selectedImageModel}
                onValueChange={setSelectedImageModel}
                className="w-full mb-4"
              />

              <Textarea
                value={imagePrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setImagePrompt(e.target.value)}
                placeholder="Describe the image you want..."
                className="min-h-[80px] border-2 border-gray-900 mb-4"
              />
              <Button
                onClick={generateImage}
                disabled={isGenerating === 'image' || !imagePrompt.trim()}
                className="w-full mb-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {isGenerating === 'image' ? 'Generating...' : 'Generate Image'}
              </Button>

              {/* Image Gallery */}
              <AssetGallery
                type="image"
                selectedAssetId={imageAssetId}
                onAssetSelect={setImageAssetId}
                onAssetUrlChange={setImageUrl}
                refreshTrigger={imageRefreshTrigger}
                onUpload={handleImageUpload}
              />
            </Card>
          </div>

          {/* Video Generation */}
          <div>
            <div className="mb-4">
              <Card className="p-3 border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-gray-900">
                <h2 className="text-xl font-black text-white tracking-wide">4. VIDEO</h2>
              </Card>
            </div>
            <Card className="p-6 border-3 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <ModelSelector
                category="video"
                value={selectedVideoModel}
                onValueChange={setSelectedVideoModel}
                className="w-full mb-4"
              />

              <Button
                onClick={generateVideo}
                disabled={!imageAssetId || !audioAssetId || isGenerating === 'video'}
                className="w-full mb-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {isGenerating === 'video' ? 'Generating...' : 'Generate Video'}
              </Button>

              {/* Video Gallery */}
              <AssetGallery
                type="video"
                selectedAssetId={videoAssetId}
                onAssetSelect={setVideoAssetId}
                onAssetUrlChange={setVideoUrl}
                refreshTrigger={videoRefreshTrigger}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}