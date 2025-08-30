import VideoGenPipeline from '~/components/VideoGenPipeline';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header with API Keys button */}

        <VideoGenPipeline />
      </div>
    </main>
  );
}
