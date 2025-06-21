'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { storage, createBlobUrl, generateAssetId } from '~/utils/storage';
import type { AssetMetadata } from '~/utils/storage';
import AssetViewerModal from './AssetViewerModal';

interface AssetGalleryProps {
  type: 'image' | 'audio' | 'video';
  selectedAssetId: string | null;
  onAssetSelect: (assetId: string | null) => void;
  onAssetUrlChange: (url: string) => void;
  refreshTrigger?: number; // Add refresh trigger prop
  onUpload?: (assetId: string) => void; // Add upload callback
}

interface AssetWithUrl extends AssetMetadata {
  blobUrl?: string;
}

export default function AssetGallery({ type, selectedAssetId, onAssetSelect, onAssetUrlChange, refreshTrigger, onUpload }: AssetGalleryProps) {
  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAsset, setViewerAsset] = useState<AssetMetadata | null>(null);
  const [viewerBlobUrl, setViewerBlobUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadAssets();
  }, [type, refreshTrigger]); // Include refreshTrigger in dependencies

  const loadAssets = async () => {
    try {
      setLoading(true);
      const allAssets = await storage.getAllAssets();
      const filteredAssets = allAssets.filter(asset => asset.type === type);

      // Load blob URLs for display
      const assetsWithUrls = await Promise.all(
        filteredAssets.map(async (asset) => {
          const blobUrl = await createBlobUrl(asset.id);
          return {
            ...asset,
            blobUrl: blobUrl ?? undefined
          };
        })
      );

      setAssets(assetsWithUrls.reverse()); // Show newest first
    } catch (error) {
      console.error(`Failed to load ${type} assets:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetSelect = async (asset: AssetWithUrl) => {
    if (selectedAssetId === asset.id) {
      // Deselect if clicking the same asset
      onAssetSelect(null);
      onAssetUrlChange('');
    } else {
      // Select new asset
      onAssetSelect(asset.id);
      if (asset.blobUrl) {
        onAssetUrlChange(asset.blobUrl);
      }
    }
  };

  const handleAssetView = async (asset: AssetWithUrl) => {
    // Only allow viewing for image and video assets
    if (asset.type !== 'image' && asset.type !== 'video') return;

    setViewerAsset(asset);
    setViewerBlobUrl(asset.blobUrl ?? null);
    setViewerOpen(true);
  };

  const handleDelete = async (assetId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      await storage.deleteAsset(assetId);

      // If deleted asset was selected, clear selection
      if (selectedAssetId === assetId) {
        onAssetSelect(null);
        onAssetUrlChange('');
      }

      // Reload assets
      await loadAssets();
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (type === 'audio' && !file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }

    setUploading(true);
    try {
      // Generate asset ID and store the file
      const assetId = generateAssetId(type, file.name);

      await storage.storeAsset(assetId, file, {
        type,
        name: `Uploaded ${type} - ${file.name}`,
        prompt: `User uploaded: ${file.name}`,
        model: 'user-upload'
      });

      // Auto-select the uploaded asset
      onAssetSelect(assetId);
      const blobUrl = await createBlobUrl(assetId);
      if (blobUrl) {
        onAssetUrlChange(blobUrl);
      }

      // Notify parent component about the upload
      if (onUpload) {
        onUpload(assetId);
      }

      // Reload assets to show the new upload
      await loadAssets();
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      // Clear the input so the same file can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <Card className="p-4 border-2 border-gray-900">
        <div className="text-center text-gray-500">Loading {type} assets...</div>
      </Card>
    );
  }

  if (assets.length === 0) {
    return (
      <Card className="p-4 border-2 border-gray-900">
        <div className="text-center text-gray-500">
          No {type} assets yet. Generate some to see them here!
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-2 border-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-gray-900 tracking-wide">
          {type === 'image' ? 'IMAGE GALLERY' : type === 'audio' ? 'AUDIO LIBRARY' : 'VIDEO GALLERY'}
        </h3>

        {/* Upload button for image and audio only */}
        {(type === 'image' || type === 'audio') && (
          <Button
            onClick={handleUploadClick}
            disabled={uploading}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            {uploading ? 'Uploading...' : `Upload ${type}`}
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={type === 'image' ? 'image/*' : type === 'audio' ? 'audio/*' : undefined}
        onChange={handleFileUpload}
        className="hidden"
      />

      <div
        className={`max-h-80 overflow-y-auto gallery-scrollbar grid gap-3 ${type === 'image' ? 'grid-cols-2 sm:grid-cols-3' : type === 'video' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}
      >
        {assets.map((asset) => (
          <div
            key={asset.id}
            className={`relative border-2 transition-all duration-200 ${selectedAssetId === asset.id
              ? 'border-blue-500 bg-blue-50 shadow-[4px_4px_0px_0px_rgba(59,130,246,1)]'
              : 'border-gray-300 hover:border-gray-400 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
              }`}
          >
            {/* Selection indicator */}
            <div
              className={`absolute top-2 left-2 w-5 h-5 border-2 z-10 cursor-pointer ${selectedAssetId === asset.id
                ? 'bg-blue-500 border-blue-500'
                : 'bg-white border-gray-300'
                }`}
              onClick={() => handleAssetSelect(asset)}
              title="Select asset"
            >
              {selectedAssetId === asset.id && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white"></div>
                </div>
              )}
            </div>

            {/* Delete button */}
            <Button
              onClick={(e) => handleDelete(asset.id, e)}
              className="absolute top-2 right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 text-white text-xs z-10 border border-black"
              title="Delete asset"
            >
              ×
            </Button>

            {type === 'image' ? (
              <div
                className="aspect-square cursor-pointer"
                onClick={() => handleAssetView(asset)}
                title="Click to view full size"
              >
                {asset.blobUrl ? (
                  <img
                    src={asset.blobUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Loading...</span>
                  </div>
                )}
              </div>
            ) : type === 'video' ? (
              <div
                className="aspect-video cursor-pointer"
                onClick={() => handleAssetView(asset)}
                title="Click to view full size"
              >
                {asset.blobUrl ? (
                  <video
                    controls
                    src={asset.blobUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Loading...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3">
                {asset.blobUrl ? (
                  <audio
                    controls
                    src={asset.blobUrl}
                    className="w-full"
                    preload="metadata"
                  />
                ) : (
                  <div className="h-12 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Loading...</span>
                  </div>
                )}
              </div>
            )}

            {/* Asset info */}
            <div className="p-2 border-t">
              <div className="text-xs font-medium text-gray-700 truncate">
                {asset.name}
              </div>
              {asset.prompt && (
                <div className="text-xs text-gray-500 truncate mt-1">
                  {asset.prompt.length > 40 ? asset.prompt.substring(0, 40) + '...' : asset.prompt}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {new Date(asset.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Asset Viewer Modal */}
      <AssetViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        asset={viewerAsset}
        blobUrl={viewerBlobUrl}
      />
    </Card>
  );
}