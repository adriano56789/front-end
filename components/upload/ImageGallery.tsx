import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { api } from '../../services/api';

interface Image {
  id: string;
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
  type: string;
}

interface ImageGalleryProps {
  onUploadNew: () => void;
  onViewImage: (image: Image) => void;
  onEditImage: (image: Image) => void;
  onDeleteImage: (image: Image) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  onUploadNew,
  onViewImage,
  onEditImage,
  onDeleteImage
}) => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      // Simulação - substituir com chamada real à API
      const mockImages: Image[] = [
        {
          id: '1',
          url: 'https://picsum.photos/300/300?random=1',
          filename: 'image1.jpg',
          size: 1024000,
          uploadedAt: new Date().toISOString(),
          type: 'image/jpeg'
        },
        {
          id: '2',
          url: 'https://picsum.photos/300/300?random=2',
          filename: 'image2.png',
          size: 2048000,
          uploadedAt: new Date().toISOString(),
          type: 'image/png'
        }
      ];
      setImages(mockImages);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando imagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-bold text-white">Minhas Imagens</h1>
              <p className="text-sm text-gray-400">{images.length} imagens</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {selectedImages.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // Implementar exclusão em lote
                    console.log('Excluir imagens selecionadas:', selectedImages);
                  }}
                >
                  Excluir ({selectedImages.length})
                </Button>
              )}
              
              <Button onClick={onUploadNew}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Imagem
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {images.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Nenhuma imagem ainda</h3>
            <p className="text-gray-400 mb-6">Comece enviando sua primeira imagem</p>
            <Button onClick={onUploadNew}>
              Enviar Primeira Imagem
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map((image) => (
              <Card
                key={image.id}
                className={`group cursor-pointer transition-all duration-200 ${
                  selectedImages.includes(image.id) ? 'ring-2 ring-purple-600' : ''
                }`}
                onClick={() => onViewImage(image)}
              >
                <CardContent className="p-0">
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <input
                      type="checkbox"
                      checked={selectedImages.includes(image.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleImageSelection(image.id);
                      }}
                      className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                    />
                  </div>

                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditImage(image);
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteImage(image);
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>

                  {/* Image Info */}
                  <div className="p-3">
                    <h4 className="font-medium text-white text-sm truncate mb-1">
                      {image.filename}
                    </h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>{formatFileSize(image.size)}</p>
                      <p>{formatDate(image.uploadedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={onUploadNew}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 z-20"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
};
