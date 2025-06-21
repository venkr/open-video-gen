'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import ApiKeysModal from './ApiKeysModal';

export default function ApiKeysButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] tracking-wider"
            >
                🔑 API KEYS
            </Button>

            <ApiKeysModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </>
    );
} 