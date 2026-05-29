/**
 * Utilitários para detecção e conversão de imagens Base64
 */

import { callApi } from '../services/api';

// Detecta se uma string é Base64 de imagem
export const isBase64Image = (url?: string): boolean => {
  if (!url) return false;
  
  // Verificar padrões comuns de Base64
  const base64Patterns = [
    /^data:image\/[a-z]+;base64,/,
    /^data:video\/[a-z]+;base64,/
  ];
  
  return base64Patterns.some(pattern => pattern.test(url));
};

// Detecta se uma string é SVG em Base64
export const isBase64SVG = (url?: string): boolean => {
  if (!url) return false;
  return /^data:image\/svg\+xml;base64,/.test(url);
};

// Converte Base64 para File object
export const base64ToFile = (base64String: string, filename?: string): File | null => {
  try {
    // Extrair metadata e dados do Base64
    const matches = base64String.match(/^data:(.+?);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    
    // Converter Base64 para Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    // Gerar nome de arquivo baseado no tipo
    const extension = mimeType.split('/')[1] || 'png';
    const finalFilename = filename || `image_${Date.now()}.${extension}`;
    
    return new File([blob], finalFilename, { type: mimeType });
  } catch (error) {
    console.error('Erro ao converter Base64 para File:', error);
    return null;
  }
};

// Valida se uma URL é válida e acessível
export const isValidImageUrl = async (url: string): Promise<boolean> => {
  if (!url) return false;
  
  // Se for Base64, consideramos inválido para o propósito do sistema
  if (isBase64Image(url)) return false;
  
  try {
    // Para URLs HTTP/HTTPS, verificar se está acessível
    if (url.startsWith('http')) {
      const response = await callApi('HEAD', url);
      return response.ok;
    }
    
    // Para URLs relativas, consideramos válidas
    return url.startsWith('/uploads/') || url.startsWith('./uploads/');
  } catch (error) {
    return false;
  }
};

// Detecta automaticamente imagens Base64 em um objeto e retorna lista de caminhos
export const detectBase64InObject = (obj: any, path: string = ''): Array<{path: string, value: string}> => {
  const base64Images: Array<{path: string, value: string}> = [];
  
  if (!obj || typeof obj !== 'object') return base64Images;
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string' && isBase64Image(value)) {
      base64Images.push({ path: currentPath, value });
    } else if (typeof value === 'object' && value !== null) {
      base64Images.push(...detectBase64InObject(value, currentPath));
    }
  }
  
  return base64Images;
};

// Substitui imagens Base64 por URLs reais em um objeto
export const replaceBase64WithUrls = async (
  obj: any, 
  uploadFunction: (file: File) => Promise<string>
): Promise<any> => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const base64Images = detectBase64InObject(obj);
  
  if (base64Images.length === 0) return obj;
  
  console.log(`🔄 Detectadas ${base64Images.length} imagens Base64 para conversão`);
  
  // Processar cada imagem Base64
  for (const { path, value } of base64Images) {
    try {
      const file = base64ToFile(value);
      if (!file) continue;
      
      console.log(`📤 Convertendo Base64 para arquivo: ${path}`);
      const newUrl = await uploadFunction(file);
      
      // Atualizar o objeto com a nova URL
      setNestedProperty(obj, path, newUrl);
      
      console.log(`✅ Base64 convertido para URL: ${newUrl}`);
    } catch (error) {
      console.error(`❌ Erro ao converter Base64 em ${path}:`, error);
    }
  }
  
  return obj;
};

// Helper para setar propriedades aninhadas em objetos
const setNestedProperty = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
};

// Gera URL de placeholder padrão (sem Base64)
export const getPlaceholderUrl = (type: 'avatar' | 'image' = 'avatar'): string => {
  // Retornar URL relativa para placeholder SVG
  return `/placeholders/${type}-placeholder.svg`;
};

// Verifica se uma imagem precisa de conversão
export const needsConversion = (url?: string): boolean => {
  return isBase64Image(url);
};
