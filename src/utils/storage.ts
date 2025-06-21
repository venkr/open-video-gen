export interface AssetMetadata {
  id: string;
  type: "image" | "audio" | "video" | "script";
  name: string;
  prompt?: string;
  model?: string;
  createdAt: number;
  size: number;
}

export interface StorageManifest {
  version: number;
  assets: AssetMetadata[];
  lastUpdated: number;
}

const DB_NAME = "OpenVideoGenStorage";
const DB_VERSION = 1;
const ASSETS_STORE = "assets";
const MANIFEST_STORE = "manifest";
const MANIFEST_KEY = "main";

class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create assets store for blobs
        if (!db.objectStoreNames.contains(ASSETS_STORE)) {
          db.createObjectStore(ASSETS_STORE, { keyPath: "id" });
        }

        // Create manifest store for metadata
        if (!db.objectStoreNames.contains(MANIFEST_STORE)) {
          db.createObjectStore(MANIFEST_STORE, { keyPath: "key" });
        }
      };
    });
  }

  async getManifest(): Promise<StorageManifest> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MANIFEST_STORE], "readonly");
      const store = transaction.objectStore(MANIFEST_STORE);
      const request = store.get(MANIFEST_KEY);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result.manifest);
        } else {
          // Return empty manifest if none exists
          resolve({
            version: 1,
            assets: [],
            lastUpdated: Date.now(),
          });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async updateManifest(manifest: StorageManifest): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MANIFEST_STORE], "readwrite");
      const store = transaction.objectStore(MANIFEST_STORE);
      const request = store.put({ key: MANIFEST_KEY, manifest });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async storeAsset(
    id: string,
    blob: Blob,
    metadata: Omit<AssetMetadata, "id" | "size" | "createdAt">,
  ): Promise<void> {
    if (!this.db) await this.init();

    const assetData = {
      id,
      blob,
      metadata: {
        ...metadata,
        id,
        size: blob.size,
        createdAt: Date.now(),
      },
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ASSETS_STORE], "readwrite");
      const store = transaction.objectStore(ASSETS_STORE);
      const request = store.put(assetData);

      request.onsuccess = async () => {
        // Update manifest
        const manifest = await this.getManifest();
        const existingIndex = manifest.assets.findIndex((a) => a.id === id);

        if (existingIndex >= 0) {
          manifest.assets[existingIndex] = assetData.metadata;
        } else {
          manifest.assets.push(assetData.metadata);
        }

        manifest.lastUpdated = Date.now();
        await this.updateManifest(manifest);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAsset(
    id: string,
  ): Promise<{ blob: Blob; metadata: AssetMetadata } | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ASSETS_STORE], "readonly");
      const store = transaction.objectStore(ASSETS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            blob: result.blob,
            metadata: result.metadata,
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteAsset(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ASSETS_STORE], "readwrite");
      const store = transaction.objectStore(ASSETS_STORE);
      const request = store.delete(id);

      request.onsuccess = async () => {
        // Update manifest
        const manifest = await this.getManifest();
        manifest.assets = manifest.assets.filter((a) => a.id !== id);
        manifest.lastUpdated = Date.now();
        await this.updateManifest(manifest);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAllAssets(): Promise<AssetMetadata[]> {
    const manifest = await this.getManifest();
    return manifest.assets;
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [ASSETS_STORE, MANIFEST_STORE],
        "readwrite",
      );

      const assetsStore = transaction.objectStore(ASSETS_STORE);
      const manifestStore = transaction.objectStore(MANIFEST_STORE);

      const clearAssets = assetsStore.clear();
      const clearManifest = manifestStore.clear();

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) resolve();
      };

      clearAssets.onsuccess = checkComplete;
      clearManifest.onsuccess = checkComplete;

      clearAssets.onerror = () => reject(clearAssets.error);
      clearManifest.onerror = () => reject(clearManifest.error);
    });
  }
}

// Export singleton instance
export const storage = new IndexedDBStorage();

// Utility functions
export function generateAssetId(
  type: AssetMetadata["type"],
  prompt?: string,
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const promptHash = prompt ? btoa(prompt).substring(0, 8) : "";
  return `${type}_${timestamp}_${promptHash}_${randomSuffix}`;
}

export async function storeImageFromUrl(
  url: string,
  metadata: Omit<AssetMetadata, "id" | "size" | "createdAt" | "type">,
): Promise<string> {
  // Fetch the blob URL directly (no proxy needed since blobs are local)
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();
  const id = generateAssetId("image", metadata.prompt);

  await storage.storeAsset(id, blob, {
    ...metadata,
    type: "image",
  });

  return id;
}

export async function storeAudioBlob(
  blob: Blob,
  metadata: Omit<AssetMetadata, "id" | "size" | "createdAt" | "type">,
): Promise<string> {
  const id = generateAssetId("audio", metadata.prompt);

  await storage.storeAsset(id, blob, {
    ...metadata,
    type: "audio",
  });

  return id;
}

export async function createBlobUrl(assetId: string): Promise<string | null> {
  const asset = await storage.getAsset(assetId);
  if (!asset) return null;

  return URL.createObjectURL(asset.blob);
}
