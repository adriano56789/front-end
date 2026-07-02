/**
 * Componente de teste para validar o sistema de conversão Base64
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { base64ConversionService, processUserImages, isValidImageUrl } from '../../services/base64ConversionService';
import { useImageCache } from '../../hooks/useImageCache';

const Base64ConversionTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { getCachedUrl, invalidateUrl, getCacheStats, processObject } = useImageCache() as any;

  // Test data com Base64
  const testUser = {
    id: '12345678',
    name: 'Test User',
    avatarUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZmYiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJhc2U2NDwvdGV4dD48L3N2Zz4=',
    obras: [
      { id: 'obra1', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' },
      { id: 'obra2', url: 'data:image/avif;base64,AAAAFGZ0eXBhdmlmAAAAAG1lZ2V0AAABabraFfpZAAAAA==' },
      { id: 'obra3', url: 'http://72.60.249.175/uploads/photos/test.jpg' }
    ]
  };

  const addResult = (test: string, status: 'success' | 'error' | 'pending', message: string, details?: any) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Teste 1: Detecção de Base64
  const testBase64Detection = async () => {
    addResult('Detecção Base64', 'pending', 'Iniciando teste de detecção...');
    
    try {
      const detected = await base64ConversionService.detectBase64InObject(testUser);
      
      if (detected.length >= 2) {
        addResult('Detecção Base64', 'success', `Detectadas ${detected.length} imagens Base64`, detected);
      } else {
        addResult('Detecção Base64', 'error', 'Número insuficiente de imagens detectadas', detected);
      }
    } catch (error: any) {
      addResult('Detecção Base64', 'error', `Erro: ${error.message}`);
    }
  };

  // Teste 2: Conversão individual
  const testSingleConversion = async () => {
    addResult('Conversão Individual', 'pending', 'Convertendo imagem Base64 individual...');
    
    try {
      const result = await base64ConversionService.convertBase64Image(
        testUser.avatarUrl,
        'test-avatar.svg'
      );
      
      if (result.success && result.url) {
        addResult('Conversão Individual', 'success', 'Imagem convertida com sucesso', {
          originalSize: result.originalSize,
          mimeType: result.mimeType,
          newUrl: result.url
        });
      } else {
        addResult('Conversão Individual', 'error', result.error || 'Falha na conversão');
      }
    } catch (error: any) {
      addResult('Conversão Individual', 'error', `Erro: ${error.message}`);
    }
  };

  // Teste 3: Processamento de usuário completo
  const testUserProcessing = async () => {
    addResult('Processamento Usuário', 'pending', 'Processando usuário completo...');
    
    try {
      const processedUser = await processUserImages(testUser);
      
      const hasValidUrls = processedUser.avatarUrl && !processedUser.avatarUrl.startsWith('data:') &&
                          processedUser.obras.every((obra: any) => !obra.url.startsWith('data:'));
      
      if (hasValidUrls) {
        addResult('Processamento Usuário', 'success', 'Usuário processado com sucesso', {
          originalAvatar: testUser.avatarUrl.substring(0, 50) + '...',
          newAvatar: processedUser.avatarUrl,
          obrasCount: processedUser.obras.length
        });
        setCurrentUser(processedUser);
      } else {
        addResult('Processamento Usuário', 'error', 'URLs inválidas após processamento');
      }
    } catch (error: any) {
      addResult('Processamento Usuário', 'error', `Erro: ${error.message}`);
    }
  };

  // Teste 4: Cache e invalidação
  const testCacheInvalidation = async () => {
    addResult('Cache/Invalidação', 'pending', 'Testando sistema de cache...');
    
    try {
      const base64Url = testUser.obras[0].url;
      
      // Verificar se está em cache
      const initiallyCached = getCachedUrl(base64Url);
      addResult('Cache/Invalidação', 'pending', `URL inicial: ${initiallyCached.substring(0, 50)}...`);
      
      // Invalidar (converter)
      await invalidateUrl(base64Url);
      
      // Aguardar um pouco e verificar novamente
      setTimeout(() => {
        const cachedUrl = getCachedUrl(base64Url);
        const stats = getCacheStats();
        
        if (cachedUrl !== base64Url && isValidImageUrl(cachedUrl)) {
          addResult('Cache/Invalidação', 'success', 'Cache funcionando corretamente', {
            originalUrl: base64Url.substring(0, 50) + '...',
            cachedUrl,
            stats
          });
        } else {
          addResult('Cache/Invalidação', 'error', 'Cache não atualizou corretamente');
        }
      }, 2000);
      
    } catch (error: any) {
      addResult('Cache/Invalidação', 'error', `Erro: ${error.message}`);
    }
  };

  // Teste 5: Suporte AVIF
  const testAvifSupport = async () => {
    addResult('Suporte AVIF', 'pending', 'Testando conversão de arquivo AVIF...');
    
    try {
      const avifBase64 = 'data:image/avif;base64,AAAAFGZ0eXBhdmlmAAAAAG1lZ2V0AAABabraFfpZAAAAA==';
      
      const result = await base64ConversionService.convertBase64Image(
        avifBase64,
        'test-avif.avif'
      );
      
      if (result.success && result.url) {
        addResult('Suporte AVIF', 'success', 'Arquivo AVIF convertido com sucesso', {
          originalSize: result.originalSize,
          mimeType: result.mimeType,
          newUrl: result.url
        });
      } else {
        addResult('Suporte AVIF', 'error', result.error || 'Falha na conversão AVIF');
      }
    } catch (error: any) {
      addResult('Suporte AVIF', 'error', `Erro: ${error.message}`);
    }
  };

  // Teste 6: Processamento com hook
  const testHookProcessing = async () => {
    addResult('Processamento Hook', 'pending', 'Testando processamento com hook...');
    
    try {
      const processed = await processObject(testUser);
      
      const base64Count = JSON.stringify(testUser).match(/data:image\/[^;]+;base64/g)?.length || 0;
      const processedBase64Count = JSON.stringify(processed).match(/data:image\/[^;]+;base64/g)?.length || 0;
      
      if (processedBase64Count < base64Count) {
        addResult('Processamento Hook', 'success', `Reduzido ${base64Count - processedBase64Count} URLs Base64`, {
          originalCount: base64Count,
          processedCount: processedBase64Count
        });
      } else {
        addResult('Processamento Hook', 'error', 'Nenhuma conversão realizada pelo hook');
      }
    } catch (error: any) {
      addResult('Processamento Hook', 'error', `Erro: ${error.message}`);
    }
  };

  // Executar todos os testes
  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();
    
    addResult('Suite de Testes', 'pending', 'Iniciando suite completa de testes...');
    
    await testBase64Detection();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testSingleConversion();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testUserProcessing();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testCacheInvalidation();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await testAvifSupport();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testHookProcessing();
    
    const successCount = testResults.filter(r => r.status === 'success').length;
    const totalCount = testResults.filter(r => r.test !== 'Suite de Testes').length;
    
    addResult('Suite de Testes', successCount === totalCount ? 'success' : 'error', 
              `Concluído: ${successCount}/${totalCount} testes aprovados`);
    
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Teste: Sistema Base64 → URL</h1>
          <div className="flex space-x-3">
            <Button onClick={clearResults} variant="ghost" disabled={isRunning}>
              Limpar Resultados
            </Button>
            <Button onClick={runAllTests} disabled={isRunning}>
              {isRunning ? 'Executando...' : 'Executar Todos os Testes'}
            </Button>
          </div>
        </div>

        {/* Cards de testes individuais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4">
              <h3 className="font-medium mb-2">Detecção Base64</h3>
              <p className="text-sm text-gray-400 mb-3">Verifica detecção de imagens Base64</p>
              <Button onClick={testBase64Detection} disabled={isRunning} size="sm">
                Executar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <h3 className="font-medium mb-2">Conversão Individual</h3>
              <p className="text-sm text-gray-400 mb-3">Testa conversão de uma imagem</p>
              <Button onClick={testSingleConversion} disabled={isRunning} size="sm">
                Executar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <h3 className="font-medium mb-2">Processamento Usuário</h3>
              <p className="text-sm text-gray-400 mb-3">Processa usuário completo</p>
              <Button onClick={testUserProcessing} disabled={isRunning} size="sm">
                Executar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <h3 className="font-medium mb-2">Cache/Invalidação</h3>
              <p className="text-sm text-gray-400 mb-3">Testa sistema de cache</p>
              <Button onClick={testCacheInvalidation} disabled={isRunning} size="sm">
                Executar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <h3 className="font-medium mb-2">Suporte AVIF</h3>
              <p className="text-sm text-gray-400 mb-3">Testa conversão de arquivos AVIF</p>
              <Button onClick={testAvifSupport} disabled={isRunning} size="sm">
                Executar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <h3 className="font-medium mb-2">Processamento Hook</h3>
              <p className="text-sm text-gray-400 mb-3">Testa hook useImageCache</p>
              <Button onClick={testHookProcessing} disabled={isRunning} size="sm">
                Executar
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resultados */}
        {testResults.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <h3 className="font-medium mb-4">Resultados dos Testes</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {testResults.map(result => (
                  <div key={result.id} className={`p-3 rounded-lg border ${
                    result.status === 'success' ? 'bg-green-900/20 border-green-700' :
                    result.status === 'error' ? 'bg-red-900/20 border-red-700' :
                    'bg-blue-900/20 border-blue-700'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{result.test}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.status === 'success' ? 'bg-green-600 text-white' :
                        result.status === 'error' ? 'bg-red-600 text-white' :
                        'bg-blue-600 text-white'
                      }`}>
                        {result.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{result.message}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-400 cursor-pointer">Detalhes</summary>
                        <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visualização do usuário processado */}
        {currentUser && (
          <Card>
            <CardContent className="py-4">
              <h3 className="font-medium mb-4">Usuário Processado (Visualização)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Avatar</h4>
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-800">
                    <img 
                      src={isValidImageUrl(currentUser.avatarUrl) ? currentUser.avatarUrl : '/placeholders/avatar-placeholder.svg'} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate">{currentUser.avatarUrl}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Obras</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {currentUser.obras.map((obra: any, index: number) => (
                      <div key={index} className="aspect-square bg-gray-800 rounded overflow-hidden">
                        <img 
                          src={isValidImageUrl(obra.url) ? obra.url : '/placeholders/avatar-placeholder.svg'} 
                          alt={`Obra ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Base64ConversionTest;
