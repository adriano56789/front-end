/**
 * Hook para gerenciar imagens - APENAS BANCO DE DADOS
 * ELIMINADO TODO CACHE LOCAL
 */

import { useState, useEffect, useCallback } from 'react';
import { callApi } from '../services/api';

interface UseImageOptions {
  // Sem opções de cache - tudo vem do banco
}

export const useImageCache = (options: UseImageOptions = {}) => {
  // Sem estado de cache local - tudo é buscado do banco
  const [isLoading, setIsLoading] = useState(false);

  // Obter URL direta do banco - sem cache
  const getImageUrl = useCallback((url: string): string => {
    if (!url) return url;
    
    // Se for Base64, converter via API do banco
    if (url.startsWith('data:')) {
      console.warn('⚠️ Base64 detectado - use API de upload do banco');
      return url; // Retornar original enquanto converte
    }
    
    return url;
  }, []);

  // Processar objeto via API do banco
  const processObject = useCallback(async <T = any>(data: T): Promise<T> => {
    try {
      setIsLoading(true);
      
      // Enviar para API do banco para processamento
      const response = await callApi('POST', '/api/images/process', data);
      
      if (response.ok) {
        const processed = await response.json();
        return processed;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao processar objeto no banco:', error);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload de imagem para o banco
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await callApi('POST', '/api/images/upload', formData, {
        'Content-Type': 'multipart/form-data'
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.url;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao fazer upload para o banco:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Estado
    isLoading,
    
    // Ações - APENAS BANCO DE DADOS
    getImageUrl,
    processObject,
    uploadImage,
    
    // Métodos removidos (sem cache local)
    // addToCache, invalidateUrl, clearCache, etc.
  };
};
