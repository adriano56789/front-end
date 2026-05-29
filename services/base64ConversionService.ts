/**
 * Serviço para conversão automática de imagens Base64 em URLs reais
 */

import { api, callApi } from './api';
import { isBase64Image, base64ToFile, detectBase64InObject, replaceBase64WithUrls } from '../utils/imageUtils';

export interface ConversionResult {
  success: boolean;
  url?: string;
  error?: string;
  originalSize?: number;
  mimeType?: string;
}

export interface BatchConversionResult {
  success: boolean;
  results: Array<{
    path: string;
    success: boolean;
    url?: string;
    error?: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
}

class Base64ConversionService {
  private static instance: Base64ConversionService;
  private conversionCache = new Map<string, string>();
  private authToken: string | null = null;

  static getInstance(): Base64ConversionService {
    if (!Base64ConversionService.instance) {
      Base64ConversionService.instance = new Base64ConversionService();
    }
    return Base64ConversionService.instance;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Converte uma imagem Base64 individual
   */
  async convertBase64Image(base64Data: string, filename?: string): Promise<ConversionResult> {
    try {
      // Verificar cache primeiro
      const cacheKey = base64Data.substring(0, 100); // Primeiros 100 chars como chave
      if (this.conversionCache.has(cacheKey)) {
        return {
          success: true,
          url: this.conversionCache.get(cacheKey)!
        };
      }

      console.log('🔄 [BASE64] Convertendo imagem para arquivo...');
      
      const response = await callApi('POST', '/convert/base64', {
        base64Data,
        filename,
        context: 'frontend_conversion'
      });

      if (response.success) {
        // Armazenar em cache
        this.conversionCache.set(cacheKey, response.url);
        
        console.log('✅ [BASE64] Conversão concluída:', response.url);
        return {
          success: true,
          url: response.url,
          originalSize: response.originalSize,
          mimeType: response.mimeType
        };
      } else {
        throw new Error(response.error || 'Falha na conversão');
      }

    } catch (error: any) {
      console.error('❌ [BASE64] Erro na conversão:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido na conversão'
      };
    }
  }

  /**
   * Converte múltiplas imagens Base64 em lote
   */
  async convertBatch(images: Array<{path: string, value: string, filename?: string}>): Promise<BatchConversionResult> {
    try {
      console.log(`🔄 [BASE64-BATCH] Convertendo ${images.length} imagens...`);

      const response = await callApi('POST', '/convert/batch', {
        images: images.map(img => ({
          base64Data: img.value,
          filename: img.filename,
          path: img.path
        }))
      });

      if (response.success) {
        // Armazenar URLs bem-sucedidas em cache
        response.results.forEach((result: any) => {
          if (result.success && result.url) {
            const originalImage = images.find(img => img.path === result.path);
            if (originalImage) {
              const cacheKey = originalImage.value.substring(0, 100);
              this.conversionCache.set(cacheKey, result.url);
            }
          }
        });

        console.log(`✅ [BASE64-BATCH] Concluído: ${response.successCount}/${response.totalProcessed}`);
        
        return {
          success: true,
          results: response.results,
          totalProcessed: response.totalProcessed,
          successCount: response.successCount,
          failedCount: response.failedCount
        };
      } else {
        throw new Error(response.error || 'Falha na conversão em lote');
      }

    } catch (error: any) {
      console.error('❌ [BASE64-BATCH] Erro na conversão:', error);
      return {
        success: false,
        results: images.map(img => ({
          path: img.path,
          success: false,
          error: error.message
        })),
        totalProcessed: images.length,
        successCount: 0,
        failedCount: images.length
      };
    }
  }

  /**
   * Detecta imagens Base64 em um objeto
   */
  async detectBase64InObject(data: any): Promise<Array<{path: string, value: string, type: string}>> {
    try {
      const response = await callApi('POST', '/convert/detect', { data });
      
      if (response.success) {
        return response.images || [];
      } else {
        console.warn('⚠️ [BASE64-DETECT] Falha na detecção:', response.error);
        return [];
      }
    } catch (error) {
      console.error('❌ [BASE64-DETECT] Erro na detecção:', error);
      return [];
    }
  }

  /**
   * Processa automaticamente um objeto para converter Base64 → URLs
   */
  async processObject<T = any>(data: T): Promise<T> {
    try {
      console.log('🔍 [BASE64-PROCESS] Analisando objeto para conversão...');
      
      // Usar a função replaceBase64WithUrls para processar o objeto
      return await replaceBase64WithUrls(data, async (file: File) => {
        // Função de upload que usa o serviço de conversão
        const result = await this.convertBase64Image(
          await this.fileToBase64(file),
          file.name
        );
        
        if (!result.success || !result.url) {
          throw new Error(result.error || 'Falha no upload da imagem');
        }
        
        return result.url;
      });

    } catch (error) {
      console.error('❌ [BASE64-PROCESS] Erro no processamento:', error);
      return data;
    }
  }

  /**
   * Converte File para Base64 (função auxiliar)
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Processa usuário para converter imagens Base64
   */
  async processUser(user: any): Promise<any> {
    try {
      console.log(`👤 [BASE64-USER] Processando usuário ${user?.id}...`);
      
      // Focar nos campos mais comuns
      const fieldsToCheck = {
        avatarUrl: user.avatarUrl,
        obras: user.obras,
        photoUrl: user.photoUrl
      };

      let processedUser = { ...user };

      // Processar avatarUrl
      if (isBase64Image(user.avatarUrl)) {
        console.log('🔄 [BASE64-USER] Convertendo avatar...');
        const result = await this.convertBase64Image(user.avatarUrl, `avatar_${user.id}`);
        
        if (result.success) {
          processedUser.avatarUrl = result.url;
          console.log('✅ [BASE64-USER] Avatar convertido');
        }
      }

      // Processar obras (galeria)
      if (Array.isArray(user.obras)) {
        console.log(`🔄 [BASE64-USER] Processando ${user.obras.length} obras...`);
        
        const obrasWithBase64 = user.obras
          .map((obra: any, index: number) => ({
            path: `obras[${index}].url`,
            value: obra.url,
            filename: `obra_${user.id}_${index}`
          }))
          .filter(obra => isBase64Image(obra.value));

        if (obrasWithBase64.length > 0) {
          const batchResult = await this.convertBatch(obrasWithBase64);
          
          if (batchResult.success) {
            for (const result of batchResult.results) {
              if (result.success && result.url) {
                // Extrair índice do path
                const match = result.path.match(/obras\[(\d+)\]/);
                if (match) {
                  const index = parseInt(match[1]);
                  processedUser.obras[index].url = result.url;
                }
              }
            }
            console.log(`✅ [BASE64-USER] ${batchResult.successCount}/${batchResult.totalProcessed} obras convertidas`);
          }
        }
      }

      return processedUser;

    } catch (error) {
      console.error('❌ [BASE64-USER] Erro ao processar usuário:', error);
      return user;
    }
  }

  /**
   * Valida se uma URL é uma imagem real (não Base64)
   */
  isValidImageUrl(url?: string): boolean {
    return !isBase64Image(url) && !!url;
  }

  /**
   * Limpa o cache de conversão
   */
  clearCache() {
    this.conversionCache.clear();
    console.log('🧹 [BASE64] Cache limpo');
  }

  /**
   * Helper para setar propriedades aninhadas
   */
  private setNestedProperty(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      // Lidar com arrays (ex: obras[0])
      const arrayMatch = keys[i].match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        if (!current[arrayName]) current[arrayName] = [];
        if (!current[arrayName][index]) current[arrayName][index] = {};
        current = current[arrayName][index];
      } else {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
    }
    
    // Lidar com o último elemento (pode ser array)
    const lastKey = keys[keys.length - 1];
    const arrayMatch = lastKey.match(/(\w+)\[(\d+)\]/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      if (!current[arrayName]) current[arrayName] = [];
      current[arrayName][index] = value;
    } else {
      current[lastKey] = value;
    }
  }
}

// Exportar singleton
export const base64ConversionService = Base64ConversionService.getInstance();

// Exportar funções de conveniência
export const convertBase64ToUrl = (base64Data: string, filename?: string) => 
  base64ConversionService.convertBase64Image(base64Data, filename);

export const processUserImages = (user: any) => 
  base64ConversionService.processUser(user);

export const isValidImageUrl = (url?: string) => 
  base64ConversionService.isValidImageUrl(url);
