import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

interface UploadSuccessProps {
  imageUrl: string;
  fileId: string;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
  };
  onUploadNew: () => void;
  onViewGallery: () => void;
  onShare?: (url: string) => void;
}

export const UploadSuccess: React.FC<UploadSuccessProps> = ({
  imageUrl,
  fileId,
  metadata,
  onUploadNew,
  onViewGallery,
  onShare
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'embed'>('url');

  const copyToClipboard = async (text: string, type: 'url' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2000);
      }
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const getEmbedCode = (): string => {
    return `<img src="${imageUrl}" alt="${metadata?.title || 'Imagem'}" />`;
  };

  const getMarkdownCode = (): string => {
    return `![${metadata?.title || 'Imagem'}](${imageUrl})`;
  };

  const handleShare = () => {
    if (onShare) {
      onShare(imageUrl);
    } else if (navigator.share) {
      navigator.share({
        title: metadata?.title || 'Minha Imagem',
        text: metadata?.description || 'Confira minha imagem!',
        url: imageUrl
      });
    }
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = metadata?.title || `image_${fileId}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Upload Concluído!</h1>
                <p className="text-sm text-gray-400">Sua imagem foi enviada com sucesso</p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onUploadNew}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Imagem
              </Button>
              
              <Button onClick={onViewGallery}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Galeria
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="py-6">
                <div className="space-y-6">
                  {/* Main Image */}
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt={metadata?.title || 'Imagem enviada'}
                      className="w-full h-auto max-h-96 object-contain rounded-lg bg-gray-800"
                    />
                    
                    {/* Success Badge */}
                    <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Enviado</span>
                    </div>
                  </div>

                  {/* Metadata */}
                  {metadata && (
                    <div className="space-y-4">
                      {metadata.title && (
                        <div>
                          <h3 className="text-xl font-bold text-white">{metadata.title}</h3>
                        </div>
                      )}
                      
                      {metadata.description && (
                        <div>
                          <p className="text-gray-300">{metadata.description}</p>
                        </div>
                      )}
                      
                      {metadata.tags && metadata.tags.length > 0 && (
                        <div>
                          <div className="flex flex-wrap gap-2">
                            {metadata.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-block px-3 py-1 bg-purple-600/20 text-purple-400 text-sm rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleShare}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      Compartilhar
                    </Button>
                    
                    <Button variant="outline" onClick={downloadImage}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Baixar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Share Options */}
            <Card>
              <CardContent className="py-4">
                <h3 className="font-medium text-white mb-4">Compartilhar</h3>
                
                {/* Tabs */}
                <div className="flex space-x-1 mb-4">
                  <button
                    onClick={() => setActiveTab('url')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'url'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    URL
                  </button>
                  <button
                    onClick={() => setActiveTab('embed')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === 'embed'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Embed
                  </button>
                </div>

                {/* URL Tab */}
                {activeTab === 'url' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={imageUrl}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm pr-20"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-1 top-1"
                        onClick={() => copyToClipboard(imageUrl, 'url')}
                      >
                        {copiedUrl ? 'Copiado!' : 'Copiar'}
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={getMarkdownCode()}
                          readOnly
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm pr-20"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute right-1 top-1"
                          onClick={() => copyToClipboard(getMarkdownCode(), 'url')}
                        >
                          Markdown
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Embed Tab */}
                {activeTab === 'embed' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        value={getEmbedCode()}
                        readOnly
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-1 top-1"
                        onClick={() => copyToClipboard(getEmbedCode(), 'embed')}
                      >
                        {copiedEmbed ? 'Copiado!' : 'Copiar'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quick Share Buttons */}
                <div className="pt-4 border-t border-gray-800">
                  <p className="text-sm text-gray-400 mb-3">Compartilhar rapidamente:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(imageUrl)}&text=${encodeURIComponent(metadata?.title || 'Confira esta imagem!')}`, '_blank')}
                      className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 mx-auto text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(imageUrl)}`, '_blank')}
                      className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 mx-auto text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${metadata?.title || 'Confira esta imagem!'} ${imageUrl}`)}`, '_blank')}
                      className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 mx-auto text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Info */}
            <Card>
              <CardContent className="py-4">
                <h3 className="font-medium text-white mb-3">Informações</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID:</span>
                    <span className="text-white font-mono text-xs">{fileId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400">Publicado</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Data:</span>
                    <span className="text-white">{new Date().toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
