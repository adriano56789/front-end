import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Progress, CircularProgress } from '../ui/Progress';
import { api } from '../../services/api';

interface UploadStatusProps {
  userId: string;
  file: File;
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
  };
  onComplete: (result: UploadResult) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface UploadResult {
  success: boolean;
  imageUrl?: string;
  fileId?: string;
  error?: string;
}

interface UploadStep {
  id: string;
  name: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export const UploadStatus: React.FC<UploadStatusProps> = ({
  userId,
  file,
  metadata,
  onComplete,
  onError,
  onCancel
}) => {
  const [steps, setSteps] = useState<UploadStep[]>([
    { id: 'validation', name: 'Validando arquivo', status: 'pending', progress: 0 },
    { id: 'upload', name: 'Enviando arquivo', status: 'pending', progress: 0 },
    { id: 'processing', name: 'Processando imagem', status: 'pending', progress: 0 },
    { id: 'generating', name: 'Gerando URL', status: 'pending', progress: 0 }
  ]);
  
  const [overallProgress, setOverallProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [canCancel, setCanCancel] = useState(true);
  const [uploadStartTime, setUploadStartTime] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);

  useEffect(() => {
    startUpload();
  }, []);

  useEffect(() => {
    // Calculate overall progress
    const totalSteps = steps.length;
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const currentStepProgress = steps.find(step => step.status === 'uploading' || step.status === 'processing')?.progress || 0;
    
    const progress = (completedSteps * 100 + currentStepProgress) / totalSteps;
    setOverallProgress(progress);

    // Update estimated time
    if (isUploading && uploadStartTime > 0) {
      const elapsed = Date.now() - uploadStartTime;
      const remaining = (elapsed / progress) * (100 - progress);
      setEstimatedTime(remaining);
    }
  }, [steps, isUploading, uploadStartTime]);

  const updateStep = useCallback((stepId: string, updates: Partial<UploadStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  }, []);

  const startUpload = async () => {
    setIsUploading(true);
    setUploadStartTime(Date.now());

    try {
      // Step 1: Validation
      await updateStep('validation', { status: 'uploading', progress: 0 });
      await simulateProgress('validation', 1000);
      await updateStep('validation', { status: 'completed', progress: 100 });

      // Step 2: Upload
      await updateStep('upload', { status: 'uploading', progress: 0 });
      setCanCancel(false);
      
      const uploadResult = await uploadFile(file);
      
      if (!uploadResult.success) {
        await updateStep('upload', { status: 'error', error: uploadResult.error });
        onError(uploadResult.error || 'Erro no upload');
        return;
      }
      
      await updateStep('upload', { status: 'completed', progress: 100 });

      // Step 3: Processing
      await updateStep('processing', { status: 'uploading', progress: 0 });
      await simulateProgress('processing', 2000);
      await updateStep('processing', { status: 'completed', progress: 100 });

      // Step 4: Generate URL
      await updateStep('generating', { status: 'uploading', progress: 0 });
      await simulateProgress('generating', 500);
      
      const finalResult: UploadResult = {
        success: true,
        imageUrl: uploadResult.imageUrl,
        fileId: uploadResult.fileId
      };
      
      await updateStep('generating', { status: 'completed', progress: 100 });
      
      setIsUploading(false);
      onComplete(finalResult);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const currentStep = steps.find(step => step.status === 'uploading' || step.status === 'processing');
      
      if (currentStep) {
        await updateStep(currentStep.id, { status: 'error', error: errorMessage });
      }
      
      onError(errorMessage);
      setIsUploading(false);
    }
  };

  const uploadFile = async (file: File): Promise<UploadResult> => {
    try {
      // Usar API real de upload de avatar
      const uploadResponse = await api.uploadAvatar(userId, file);
      
      if (uploadResponse.success) {
        return {
          success: true,
          imageUrl: uploadResponse.avatarUrl,
          fileId: `file_${Date.now()}`
        };
      } else {
        throw new Error('Falha no upload');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const simulateProgress = async (stepId: string, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        updateStep(stepId, { progress });
        
        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, duration / 10);
    });
  };

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStepIcon = (step: UploadStep) => {
    switch (step.status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'uploading':
      case 'processing':
        return (
          <CircularProgress value={step.progress} size="sm" showLabel={false} />
        );
      default:
        return (
          <div className="w-5 h-5 border-2 border-gray-600 rounded-full" />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Enviando Imagem</h1>
                <p className="text-sm text-gray-400">
                  {isUploading ? 'Processando...' : overallProgress === 100 ? 'Concluído!' : 'Aguardando...'}
                </p>
              </div>
            </div>
            
            {canCancel && (
              <Button variant="ghost" onClick={onCancel}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overall Progress */}
            <Card>
              <CardContent className="py-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Progresso Geral</h3>
                    <span className="text-2xl font-bold text-purple-600">
                      {Math.round(overallProgress)}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={overallProgress} 
                    size="lg" 
                    color="purple" 
                    showLabel={false}
                  />
                  
                  {isUploading && estimatedTime > 0 && (
                    <p className="text-sm text-gray-400">
                      Tempo estimado: {formatTime(estimatedTime)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Steps */}
            <Card>
              <CardContent className="py-6">
                <h3 className="text-lg font-medium mb-4">Etapas do Processo</h3>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getStepIcon(step)}
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium ${
                            step.status === 'error' ? 'text-red-400' : 
                            step.status === 'completed' ? 'text-green-400' : 
                            step.status === 'uploading' || step.status === 'processing' ? 'text-white' : 
                            'text-gray-400'
                          }`}>
                            {step.name}
                          </p>
                          
                          {(step.status === 'uploading' || step.status === 'processing') && (
                            <span className="text-sm text-gray-400">
                              {Math.round(step.progress)}%
                            </span>
                          )}
                        </div>
                        
                        {step.error && (
                          <p className="text-sm text-red-400 mt-1">{step.error}</p>
                        )}
                        
                        {(step.status === 'uploading' || step.status === 'processing') && (
                          <Progress 
                            value={step.progress} 
                            size="sm" 
                            showLabel={false}
                            className="mt-2"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* File Info Sidebar */}
          <div className="space-y-6">
            {/* File Preview */}
            <Card>
              <CardContent className="py-4">
                <h3 className="font-medium text-white mb-3">Arquivo</h3>
                <div className="space-y-3">
                  <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nome:</span>
                      <span className="text-white truncate ml-2">{file.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tamanho:</span>
                      <span className="text-white">{formatFileSize(file.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tipo:</span>
                      <span className="text-white">{file.type}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            {metadata && (
              <Card>
                <CardContent className="py-4">
                  <h3 className="font-medium text-white mb-3">Metadados</h3>
                  <div className="space-y-3 text-sm">
                    {metadata.title && (
                      <div>
                        <span className="text-gray-400">Título:</span>
                        <p className="text-white mt-1">{metadata.title}</p>
                      </div>
                    )}
                    
                    {metadata.description && (
                      <div>
                        <span className="text-gray-400">Descrição:</span>
                        <p className="text-white mt-1">{metadata.description}</p>
                      </div>
                    )}
                    
                    {metadata.tags && metadata.tags.length > 0 && (
                      <div>
                        <span className="text-gray-400">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {metadata.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
