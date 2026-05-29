# Sistema de Upload de Imagens - LiveGo

Este sistema completo de upload de imagens foi integrado ao aplicativo LiveGo para proporcionar uma experiência moderna e intuitiva para upload e gerenciamento de imagens de perfil.

## 🎯 Funcionalidades Principais

### 1. **Fluxo Completo de Upload**
- **Seleção de Imagem**: Câmera, galeria ou drag & drop
- **Preview e Edição**: Ajustes de brilho, contraste, saturação e rotação
- **Status em Tempo Real**: Barra de progresso com etapas detalhadas
- **Confirmação de Sucesso**: URL gerada e opções de compartilhamento

### 2. **Integração com Perfil**
- Upload automático para avatar quando é a primeira imagem
- Atualização imediata na interface do perfil
- Validação de tamanho e formato de arquivo
- Suporte para vídeos (até 30 segundos)

### 3. **Design System**
- Componentes reutilizáveis (Button, Card, Progress)
- Interface responsiva e moderna
- Feedback visual em todas as etapas
- Acessibilidade e navegação por teclado

## 🏗️ Estrutura dos Componentes

```
components/upload/
├── ui/                          # Design System
│   ├── Button.tsx                # Botões reutilizáveis
│   ├── Card.tsx                  # Cards com variações
│   └── Progress.tsx              # Barras de progresso lineares e circulares
├── ImageGallery.tsx              # Galeria de imagens (dashboard)
├── ImageSelector.tsx             # Seleção de imagem (câmera/galeria/arrastar)
├── ImagePreview.tsx              # Preview e edição de imagem
├── UploadStatus.tsx              # Status do upload com progresso
├── UploadSuccess.tsx             # Tela de sucesso com compartilhamento
├── ProfileImageUpload.tsx         # Integração específica para avatar
├── ImageUploadFlow.tsx           # Orquestrador do fluxo completo
└── README.md                     # Esta documentação
```

## 🚀 Como Usar

### 1. **Upload de Avatar (Integrado ao Perfil)**

O sistema já está integrado ao `EditProfileScreen.tsx`. Quando o usuário clica no botão "+" para adicionar a primeira imagem, o novo sistema é ativado automaticamente.

```tsx
// O botão já foi modificado para usar o novo sistema
<button
  onClick={() => {
    if ((formData.obras?.length || 0) === 0) {
      handleAvatarUpload(); // Usa novo sistema
    } else {
      fileInputRef.current?.click(); // Sistema antigo para outras fotos
    }
  }}
>
  <PlusIcon className="w-8 h-8 text-gray-500" />
</button>
```

### 2. **Sistema Completo (Standalone)**

Para usar o fluxo completo em outras partes do app:

```tsx
import ImageUploadFlow from './components/upload/ImageUploadFlow';

function App() {
  return <ImageUploadFlow />;
}
```

### 3. **Componentes Individuais**

```tsx
// Apenas o seletor de imagem
import { ImageSelector } from './components/upload/ImageSelector';

<ImageSelector
  onImageSelected={(file) => console.log(file)}
  onBack={() => console.log('voltar')}
  maxSize={5 * 1024 * 1024} // 5MB
  acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
/>

// Apenas o upload de avatar
import ProfileImageUpload from './components/upload/ProfileImageUpload';

<ProfileImageUpload
  userId="user123"
  currentAvatarUrl="https://example.com/avatar.jpg"
  onAvatarUpdated={(url) => console.log('Novo avatar:', url)}
  onClose={() => console.log('fechar')}
/>
```

## 📋 Especificações Técnicas

### **Formatos Suportados**
- Imagens: JPEG, PNG, WebP, GIF
- Vídeos: MP4, WebM (até 30 segundos)
- Tamanho máximo: 5MB para avatar, 10MB para galeria

### **Etapas do Upload**
1. **Validação**: Verificação de formato e tamanho
2. **Upload**: Envio do arquivo para o servidor
3. **Processamento**: Otimização e geração de thumbnails
4. **Geração de URL**: Criação de URL pública

### **API Integration**
```typescript
// Upload de avatar
const uploadResp = await api.uploadAvatar(userId, file);
// Retorna: { success: boolean, avatarUrl: string }

// Atualização do perfil
const updateResp = await api.updateProfile(userId, { 
  avatarUrl: newAvatarUrl 
});
// Retorna: { success: boolean, user: User }
```

## 🎨 Design System

### **Button Component**
```tsx
<Button variant="primary" size="md" loading={false}>
  Enviar
</Button>
```
- **Variants**: primary, secondary, outline, ghost
- **Sizes**: sm, md, lg
- **States**: loading, disabled

### **Card Component**
```tsx
<Card padding="md" shadow="md" rounded="lg">
  <CardHeader>
    <h3>Título</h3>
  </CardHeader>
  <CardContent>
    Conteúdo
  </CardContent>
  <CardFooter>
    Ações
  </CardFooter>
</Card>
```

### **Progress Component**
```tsx
<Progress value={75} size="md" color="purple" showLabel />
<CircularProgress value={75} size="lg" showLabel />
```

## 🔧 Configuração

### **Variáveis de Ambiente**
```env
# URLs do servidor
VITE_API_BASE_URL=http://72.60.249.175:3000
VITE_UPLOAD_MAX_SIZE=10485760  # 10MB
VITE_ALLOWED_TYPES=image/jpeg,image/png,image/webp
```

### **Customização**
```tsx
// Personalizar limite de tamanho
<ImageSelector maxSize={20 * 1024 * 1024} /> // 20MB

// Personalizar tipos aceitos
<ImageSelector acceptedTypes={['image/svg+xml']} />

// Personalizar cor do tema
<Progress color="green" /> // primary, green, blue, red
```

## 🚀 Fluxo de Navegação

```
EditProfileScreen
    ↓ (clicar no + para primeira foto)
ProfileImageUpload
    ↓ (selecionar imagem)
ImageSelector
    ↓ (confirmar seleção)
ImagePreview
    ↓ (ajustar e confirmar)
UploadStatus
    ↓ (upload concluído)
UploadSuccess
    ↓ (voltar ao perfil)
EditProfileScreen (com avatar atualizado)
```

## 📱 Responsividade

- **Mobile**: Layout em coluna, botões grandes, swipe para navegar
- **Tablet**: Grid adaptativo, tooltips otimizados
- **Desktop**: Grid em múltiplas colunas, drag & drop avançado

## 🔒 Segurança

- Validação de tipo de arquivo no cliente e servidor
- Sanitização de metadados
- Limitação de tamanho para evitar DoS
- URLs temporárias com expiração

## 🎯 Próximos Passos

1. **Upload em Lote**: Selecionar múltiplas imagens
2. **Edição Avançada**: Filtros, stickers, texto
3. **Cloud Storage**: Integração com AWS S3/CloudFront
4. **CDN**: Distribuição global de imagens
5. **WebP/AVIF**: Formatos modernos otimizados

## 🐛 Troubleshooting

### **Upload Falha**
- Verificar conexão de rede
- Validar formato e tamanho do arquivo
- Consultar logs do servidor

### **Imagem Não Aparece**
- Verificar se o avatar foi atualizado no banco
- Limpar cache do navegador
- Validar URL da imagem

### **Performance Lenta**
- Otimizar tamanho das imagens
- Configurar CDN adequadamente
- Revisar configurações do servidor

---

**Desenvolvido com ❤️ para o LiveGo**
