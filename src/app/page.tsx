import VideoGenPipeline from '~/components/VideoGenPipeline';
import ApiKeysButton from '~/components/ApiKeysButton';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header with API Keys button */}
        <div className="flex justify-end mb-6">
          <ApiKeysButton />
        </div>

        <VideoGenPipeline />
      </div>
    </main>
  );
}
