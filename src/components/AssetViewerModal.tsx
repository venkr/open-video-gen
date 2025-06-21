'use client';

import { Dialog, DialogContent } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import type { AssetMetadata } from '~/utils/storage';

interface AssetViewerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset: AssetMetadata | null;
    blobUrl: string | null;
}

export default function AssetViewerModal({ open, onOpenChange, asset, blobUrl }: AssetViewerModalProps) {
    if (!asset || !blobUrl) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl max-h-[98vh] p-0 overflow-hidden">
                {/* Minimal Header - Just Close Button */}
                <div className="absolute top-4 right-4 z-10">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-2 border-2 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-lg"
                    >
                        ✕
                    </Button>
                </div>

                {/* Asset Display - Maximum Size */}
                <div className="flex items-center justify-center bg-black min-h-[98vh] p-4">
                    {asset.type === 'image' ? (
                        <img
                            src={blobUrl}
                            alt={asset.name}
                            className="max-w-full max-h-full object-contain border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                        />
                    ) : asset.type === 'video' ? (
                        <video
                            controls
                            autoPlay={false}
                            src={blobUrl}
                            className="max-w-full max-h-full border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                            preload="metadata"
                        />
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
} 