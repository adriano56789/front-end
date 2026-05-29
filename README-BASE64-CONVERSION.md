# Sistema de Conversão Base64 → URL

## Problema Resolvido

O sistema estava salvando imagens como Base64 inline (`data:image/svg+xml;base64,...`) em vez de URLs reais do servidor, causando:
- Tamanho incorreto das imagens
- MIME type errado
- Imagens inline muito grandes
- Componentes Image/avatar não suportam SVG inline
- URL não persistida no banco

## Solução Implementada

### 1. Detecção Automática (`utils/imageUtils.ts`)
- `isBase64Image()` - Detecta se uma string é Base64 de imagem
- `base64ToFile()` - Converte Base64 para File object
- `detectBase64InObject()` - Encontra Base64 em objetos complexos
- `replaceBase64WithUrls()` - Substitui Base64 por URLs reais

### 2. Backend API (`backend/src/routes/base64ConversionRoutes.ts`)
- `POST /api/convert/base64` - Converte imagem Base64 individual
- `POST /api/convert/batch` - Converte múltiplas imagens
- `POST /api/convert/detect` - Detecta Base64 em objetos
- Salva arquivos em `/uploads/photos/` ou `/uploads/videos/`
- Retorna URLs públicas válidas

### 3. Serviço Frontend (`services/base64ConversionService.ts`)
- `convertBase64Image()` - Conversão individual
- `convertBatch()` - Conversão em lote
- `processUser()` - Processa usuário completo
- Cache automático para evitar conversões duplicadas

### 4. Cache e Invalidação (`hooks/useImageCache.ts`)
- Cache inteligente com TTL de 5 minutos
- Invalidação automática de URLs Base64
- Re-renderização automática após conversão
- Limpeza periódica de cache antigo

### 5. Componentes Atualizados
- **EditProfileScreen.tsx** - Processamento automático ao carregar
- **BroadcasterProfileScreen.tsx** - Validação de URLs
- **UploadStatus.tsx** - Sistema de upload corrigido
- **ProfileImageUpload.tsx** - Upload via arquivo (não Base64)

## Como Funciona

### Fluxo Completo:
```
Frontend detecta Base64 → API converte → Arquivo salvo → URL pública → Cache → Re-render
```

### Exemplo de Uso:
```typescript
// 1. Processar usuário automaticamente
const processedUser = await processUserImages(user);

// 2. Validar URL antes de renderizar
<img src={isValidImageUrl(url) ? url : '/placeholders/avatar-placeholder.svg'} />

// 3. Usar cache para performance
const { getCachedUrl, invalidateUrl } = useImageCache();
const finalUrl = getCachedUrl(originalUrl);
```

## Endpoints da API

### POST /api/convert/base64
```json
{
  "base64Data": "data:image/svg+xml;base64,PHN2Zy4uLg==",
  "filename": "avatar_123.svg",
  "context": "frontend_conversion"
}
```

**Resposta:**
```json
{
  "success": true,
  "url": "http://72.60.249.175/uploads/photos/avatar_123_1234567890.svg",
  "originalSize": 1024,
  "mimeType": "image/svg+xml"
}
```

### POST /api/convert/batch
```json
{
  "images": [
    {
      "base64Data": "data:image/png;base64,iVBORw0KGgo...",
      "path": "obras[0].url",
      "filename": "obra_123.png"
    }
  ]
}
```

## URLs Esperadas

### ✅ Correto:
```
http://72.60.249.175/uploads/photos/photo_123456_1234567890.webp
http://72.60.249.175/uploads/videos/video_123456_1234567890.mp4
```

### ❌ Incorreto (será convertido):
```
data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI...
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ...
```

## Testes

Execute o componente de teste:
```tsx
<Base64ConversionTest />
```

Testes disponíveis:
1. **Detecção Base64** - Verifica identificação
2. **Conversão Individual** - Testa conversão única
3. **Processamento Usuário** - Processa usuário completo
4. **Cache/Invalidação** - Valida sistema de cache
5. **Processamento Hook** - Testa hook useImageCache

## Performance

- **Cache**: Evita conversões duplicadas
- **Batch**: Processa múltiplas imagens em uma requisição
- **Lazy Loading**: Converte apenas quando necessário
- **TTL**: Cache expira em 5 minutos para dados frescos

## Segurança

- Validação de MIME types suportados
- Limite de tamanho (10MB por imagem)
- Autenticação requerida em todos os endpoints
- Sanitização de nomes de arquivo

## Compatibilidade

- **Imagens**: JPEG, PNG, WebP, GIF, SVG
- **Vídeos**: MP4, WebM
- **Tamanhos**: Até 10MB por arquivo
- **Browsers**: Todos os browsers modernos

## Monitoramento

Logs automáticos para debugging:
```
🔄 [BASE64] Convertendo imagem para arquivo...
✅ [BASE64] Conversão concluída: http://72.60.249.175/uploads/photos/...
🧹 [IMAGE-CACHE] Cache limpo por tamanho
```

## Resolução de Problemas

### Base64 não converte:
1. Verificar se o formato é válido: `data:image/...;base64,...`
2. Confirmar que o MIME type é suportado
3. Verificar tamanho (< 10MB)
4. Autenticação do usuário

### Imagem não renderiza:
1. Verificar se URL é válida: `isValidImageUrl(url)`
2. Limpar cache: `clearCache()`
3. Forçar re-render: `forceRerender()`

### Performance lenta:
1. Ativar cache: `useImageCache()`
2. Usar batch para múltiplas imagens
3. Verificar se há conversões duplicadas

## Futuras Melhorias

- [ ] Compressão automática de imagens
- [ ] WebP conversion para otimização
- [ ] CDN integration
- [ ] Lazy loading avançado
- [ ] Progressive image loading
