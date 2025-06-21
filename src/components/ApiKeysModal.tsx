'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { providers } from '~/utils/providers';

// Mock API key state - OpenAI, ElevenLabs, Replicate have keys, Anthropic doesn't
interface ApiKeyState {
    hasKey: boolean;
    isEditing: boolean;
    value: string;
}

type ApiKeysState = Record<string, ApiKeyState>;

const INITIAL_API_KEYS: ApiKeysState = {
    anthropic: { hasKey: false, isEditing: false, value: '' },
    elevenlabs: { hasKey: true, isEditing: false, value: 'sk-***************************abc' },
    openai: { hasKey: true, isEditing: false, value: 'sk-***************************xyz' },
    replicate: { hasKey: true, isEditing: false, value: 'r8_***************************123' },
};

interface ApiKeysModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ApiKeysModal({ open, onOpenChange }: ApiKeysModalProps) {
    const [apiKeys, setApiKeys] = useState<ApiKeysState>(INITIAL_API_KEYS);
    const [tempValues, setTempValues] = useState<Record<string, string>>({});

    // Filter and sort providers alphabetically
    const relevantProviders = ['anthropic', 'elevenlabs', 'openai', 'replicate']
        .map(id => providers[id])
        .filter((provider): provider is NonNullable<typeof provider> => Boolean(provider))
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleEdit = (providerId: string) => {
        setApiKeys(prev => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                isEditing: true,
                hasKey: prev[providerId]?.hasKey ?? false,
                value: prev[providerId]?.value ?? ''
            }
        }));
        setTempValues(prev => ({
            ...prev,
            [providerId]: apiKeys[providerId]?.hasKey ? '***NEW_KEY***' : ''
        }));
    };

    const handleSave = (providerId: string) => {
        const tempValue = tempValues[providerId];
        const currentKey = apiKeys[providerId];
        if (tempValue?.trim() && currentKey) {
            setApiKeys(prev => ({
                ...prev,
                [providerId]: {
                    hasKey: true,
                    isEditing: false,
                    value: tempValue.startsWith('***') ? currentKey.value : `${tempValue.slice(0, 8)}***${tempValue.slice(-3)}`
                }
            }));
        }
        setTempValues(prev => {
            const newState = { ...prev };
            delete newState[providerId];
            return newState;
        });
    };

    const handleCancel = (providerId: string) => {
        setApiKeys(prev => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                isEditing: false,
                hasKey: prev[providerId]?.hasKey ?? false,
                value: prev[providerId]?.value ?? ''
            }
        }));
        setTempValues(prev => {
            const newState = { ...prev };
            delete newState[providerId];
            return newState;
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>API KEYS</DialogTitle>
                    <p className="text-gray-600 font-bold">MANAGE YOUR PROVIDER CONNECTIONS</p>
                </DialogHeader>

                <div className="space-y-4">
                    {relevantProviders.map((provider) => {
                        const keyState = apiKeys[provider.id];
                        const isEditing = keyState?.isEditing ?? false;
                        const hasKey = keyState?.hasKey ?? false;

                        return (
                            <div
                                key={provider.id}
                                className="border-3 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={provider.logo}
                                            alt={`${provider.name} logo`}
                                            className="w-8 h-8 border-2 border-gray-900"
                                            style={{ imageRendering: 'pixelated' }}
                                        />
                                        <div>
                                            <h3 className="font-black text-gray-900 tracking-wide">
                                                {provider.name.toUpperCase()}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {hasKey && !isEditing ? (
                                                    <>
                                                        <span className="inline-block px-2 py-1 bg-green-500 text-white text-xs font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                            CONNECTED
                                                        </span>
                                                        <span className="text-sm font-mono text-gray-600">
                                                            {keyState?.value ?? ''}
                                                        </span>
                                                    </>
                                                ) : !hasKey && !isEditing ? (
                                                    <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                        NOT CONNECTED
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={tempValues[provider.id] ?? ''}
                                                    onChange={(e) => setTempValues(prev => ({
                                                        ...prev,
                                                        [provider.id]: e.target.value
                                                    }))}
                                                    placeholder="Enter API key..."
                                                    className="border-2 border-gray-900 font-mono text-sm"
                                                    autoFocus
                                                />
                                                <Button
                                                    onClick={() => handleSave(provider.id)}
                                                    disabled={!tempValues[provider.id]?.trim()}
                                                    className="bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-2"
                                                >
                                                    ✓
                                                </Button>
                                                <Button
                                                    onClick={() => handleCancel(provider.id)}
                                                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-2"
                                                >
                                                    ✗
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={() => handleEdit(provider.id)}
                                                className={`font-bold border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-2 ${hasKey
                                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                                    }`}
                                            >
                                                {hasKey ? '✏️' : '+'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 flex justify-end">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                        CLOSE
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
} 