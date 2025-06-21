import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { getModelsByCategory, getModelById, getProviderById } from '~/utils/providers';
import type { Model } from '~/utils/providers';

interface ModelSelectorProps {
  category: Model['category'];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export default function ModelSelector({ category, value, onValueChange, className }: ModelSelectorProps) {
  const models = getModelsByCategory(category);
  const selectedModel = getModelById(value);
  const selectedProvider = selectedModel ? getProviderById(selectedModel.providerId) : null;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`border-2 border-gray-900 ${className}`}>
        <div className="flex items-center gap-2">
          {selectedProvider && (
            <Avatar className="w-5 h-5">
              <AvatarImage src={selectedProvider.logo} alt={selectedProvider.name} />
              <AvatarFallback className="text-xs bg-gray-100">
                {selectedProvider.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <SelectValue>
            {selectedModel ? (
              <span className="flex items-center gap-2">
                <span className="font-medium">{selectedProvider?.name}</span>
                <span className="text-gray-600">{selectedModel.displayName}</span>
              </span>
            ) : (
              'Select a model...'
            )}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => {
          const provider = getProviderById(model.providerId);
          return (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-3 py-1">
                {provider && (
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={provider.logo} alt={provider.name} />
                    <AvatarFallback className="text-xs bg-gray-100">
                      {provider.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider?.name}</span>
                    <span className="text-gray-700">{model.displayName}</span>
                  </div>
                  {model.description && (
                    <span className="text-xs text-gray-500 mt-0.5">
                      {model.description}
                    </span>
                  )}
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}