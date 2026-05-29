import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

interface ImageSelectorProps {
  onImageSelected: (file: File) => void;
  onBack: () => void;
  maxSize?: number; // em bytes
  acceptedTypes?: string[];
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  onImageSelected,
  onBack,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Verificar tipo
    if (!acceptedTypes.includes(file.type)) {
      setError(`Tipo de arquivo não suportado. Tipos aceitos: ${acceptedTypes.join(', ')}`);
      return false;
    }

    // Verificar tamanho
    if (file.size > maxSize) {
      setError(`Arquivo muito grande. Tamanho máximo: ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [acceptedTypes, maxSize]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    fileInputRef.current?.click();
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onImageSelected(selectedFile);
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={onBack}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </Button>
            
            <h1 className="text-xl font-bold">Selecionar Imagem</h1>
            
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedFile ? (
          <div className="space-y-6">
            {/* Drag & Drop Area */}
            <Card
              className={`border-2 border-dashed transition-all duration-200 ${
                isDragging
                  ? 'border-purple-600 bg-purple-600/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  
                  <h3 className="text-lg font-medium text-white mb-2">
                    Arraste uma imagem para cá
                  </h3>
                  <p className="text-gray-400 mb-6">
                    ou escolha uma das opções abaixo
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={handleGallerySelect}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Galeria
                    </Button>
                    
                    <Button variant="outline" onClick={handleCameraCapture}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Câmera
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Info */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <p className="text-gray-400">
                      <span className="text-white">Formatos aceitos:</span> JPEG, PNG, WebP, GIF
                    </p>
                    <p className="text-gray-400">
                      <span className="text-white">Tamanho máximo:</span> {formatFileSize(maxSize)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
              <Card className="border-red-600 bg-red-600/10">
                <CardContent className="py-4">
                  <div className="flex items-center text-red-400">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Preview */
          <div className="space-y-6">
            <Card>
              <CardContent className="py-6">
                <div className="space-y-4">
                  {/* Preview Image */}
                  <div className="relative max-w-2xl mx-auto">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-auto max-h-96 object-contain rounded-lg bg-gray-800"
                      />
                    ) : (
                      <div className="w-full h-96 bg-gray-800 rounded-lg flex items-center justify-center">
                        <p className="text-gray-400">No image preview</p>
                      </div>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>

                  {/* File Info */}
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-white">{selectedFile.name}</h4>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>Tamanho: {formatFileSize(selectedFile.size)}</p>
                      <p>Tipo: {selectedFile.type}</p>
                      <p>Modificado: {new Date(selectedFile.lastModified).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center">
                    <Button onClick={handleConfirm} size="lg">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirmar Seleção
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <input
          ref={cameraInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
