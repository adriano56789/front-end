# Documentacao da API de Upload - LiveGo

## Visao geral

Esta documentacao cobre os endpoints de upload expostos pelo backend do LiveGo sob o prefixo:

- `POST /api/upload/*`

Arquivos enviados ficam servidos publicamente em:

- `GET /uploads/<pasta>/<arquivo>`

## Base URL

Exemplos:
- Producao: `https://livego.store`
- Local: `http://localhost:3000`

## Dados reais para teste (producao)

Para executar teste real (sem mock), use:

- **API real:** `https://livego.store`
- **Conta real existente:** email/senha de usuario real ja cadastrado
- **Token real:** obtido via login real em `POST /api/auth/login`
- **ID real de stream:** `id` de stream existente no banco/ambiente
- **Arquivos reais:** imagens/videos validos no seu disco local

### 0) Obter token real (obrigatorio para endpoints protegidos)

```bash
curl -X POST "https://livego.store/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"SEU_EMAIL_REAL\",\"password\":\"SUA_SENHA_REAL\"}"
```

Use o `token` retornado nas chamadas com auth.

## Autenticacao

Alguns endpoints exigem autenticacao via token no header:

```http
Authorization: Bearer <token>
```

Quando autenticado, o backend extrai o `userId` do proprio token.

---

## 1) Upload de Avatar (autenticado)

`POST /api/upload/avatar`

### Regras
- Auth obrigatoria (`protect`).
- Campo multipart: `avatar`.
- Tipo aceito: apenas `image/*`.
- Limite: 5 MB.
- Atualiza:
  - `User.avatarUrl`
  - registro em `ProfilePhoto` (tipo `avatar`)
  - avatar das streams do usuario (`Streamer`)
- Emite evento socket: `avatar_updated`.

### Request (curl)

```bash
curl -X POST "https://livego.store/api/upload/avatar" \
  -H "Authorization: Bearer TOKEN_REAL_OBTIDO_NO_LOGIN" \
  -F "avatar=@C:/Users/adria/Pictures/avatar-real.jpg"
```

### Response (200)

```json
{
  "success": true,
  "avatarUrl": "https://livego.store/uploads/avatars/avatar_123.jpg",
  "message": "Avatar atualizado com sucesso"
}
```

### Erros comuns
- `401`: token ausente/invalido.
- `400`: nenhum arquivo enviado.
- `500`: erro interno no upload/processamento.

---

## 2) Upload de Avatar por userId (sem auth explicita)

`POST /api/upload/avatar/:userId`

### Regras
- Campo multipart: `avatar`.
- Tipo aceito: apenas `image/*`.
- Limite: 5 MB.
- Atualiza `User.avatarUrl`.
- Atualiza/cria `ProfilePhoto` de avatar.
- Cria entrada de galeria associada ao avatar.

### Request (curl)

```bash
curl -X POST "https://livego.store/api/upload/avatar/USER_ID_REAL" \
  -F "avatar=@C:/Users/adria/Pictures/avatar-real.jpg"
```

### Response (200)

```json
{
  "success": true,
  "avatarUrl": "https://livego.store/uploads/avatars/avatar_123.jpg",
  "userId": "USER_123",
  "filename": "avatar_123.jpg",
  "obraId": "avatar_1710000000000_USER_123"
}
```

### Erros comuns
- `400`: arquivo ausente ou formato invalido.
- `404`: usuario nao encontrado.
- `500`: erro interno.

---

## 3) Upload de Capa de Stream

`POST /api/upload/cover/:id`

### Regras
- Campo multipart: `cover`.
- Tipo aceito: apenas `image/*`.
- Limite: 5 MB.
- Atualiza o campo `avatar` da stream (`Streamer`) com a URL da capa.

### Request (curl)

```bash
curl -X POST "https://livego.store/api/upload/cover/STREAM_ID_REAL" \
  -F "cover=@C:/Users/adria/Pictures/capa-real.png"
```

### Response (200)

```json
{
  "success": true,
  "stream": { "id": "STREAM_123" },
  "coverUrl": "https://livego.store/uploads/covers/cover_123.png"
}
```

### Erros comuns
- `400`: nenhum arquivo enviado.
- `404`: stream nao encontrada.
- `500`: erro interno.

---

## 4) Upload de Imagem para Chat (autenticado)

`POST /api/upload/chat`

### Regras
- Auth obrigatoria (`protect`).
- Campo multipart: `image`.
- Tipo aceito: apenas `image/*`.
- Limite: 10 MB.

### Request (curl)

```bash
curl -X POST "https://livego.store/api/upload/chat" \
  -H "Authorization: Bearer TOKEN_REAL_OBTIDO_NO_LOGIN" \
  -F "image=@C:/Users/adria/Pictures/chat-real.jpg"
```

### Response (200)

```json
{
  "success": true,
  "imageUrl": "https://livego.store/uploads/chat/chat_123.jpg",
  "filename": "chat_123.jpg",
  "originalName": "chat-image.jpg",
  "size": 204800,
  "mimeType": "image/jpeg",
  "message": "Imagem enviada com sucesso"
}
```

### Erros comuns
- `401`: token ausente/invalido.
- `400`: nenhum arquivo enviado.
- `500`: erro interno.

---

## 5) Upload de Imagem de Galeria (autenticado)

`POST /api/upload/gallery`

### Regras
- Auth obrigatoria (`protect`).
- Campo multipart: `image`.
- Tipo aceito: apenas `image/*`.
- Limite: 10 MB.
- Cria documento `ProfilePhoto` com `photoType: "gallery"`.

### Request (curl)

```bash
curl -X POST "https://livego.store/api/upload/gallery" \
  -H "Authorization: Bearer TOKEN_REAL_OBTIDO_NO_LOGIN" \
  -F "image=@C:/Users/adria/Pictures/obra-real.jpg"
```

### Response (200)

```json
{
  "success": true,
  "imageUrl": "https://api.livego.store/uploads/gallery/gallery_123.jpg",
  "photoId": "gallery_1710000000000_USER_123",
  "obraId": "gallery_1710000000000_USER_123",
  "filename": "gallery_123.jpg",
  "originalName": "obra.jpg",
  "size": 3145728,
  "mimeType": "image/jpeg",
  "message": "Imagem enviada para a galeria com sucesso"
}
```

### Erros comuns
- `401`: token ausente/invalido.
- `400`: nenhum arquivo enviado.
- `500`: erro interno.

---

## 6) Upload de Video (autenticado)

`POST /api/upload/video`

### Regras
- Auth obrigatoria (`protect`).
- Campo multipart: `video`.
- Tipo aceito: apenas `video/*`.
- Limite: 50 MB.
- Cria documento `ProfilePhoto` com `photoType: "video"`.

### Request (curl)

```bash
curl -X POST "https://livego.store/api/upload/video" \
  -H "Authorization: Bearer TOKEN_REAL_OBTIDO_NO_LOGIN" \
  -F "video=@C:/Users/adria/Videos/video-real.mp4"
```

### Response (200)

```json
{
  "success": true,
  "videoUrl": "https://api.livego.store/uploads/videos/video_123.mp4",
  "videoId": "video_1710000000000_USER_123",
  "obraId": "video_1710000000000_USER_123",
  "filename": "video_123.mp4",
  "originalName": "video.mp4",
  "size": 10485760,
  "mimeType": "video/mp4",
  "message": "Vídeo enviado com sucesso"
}
```

### Erros comuns
- `401`: token ausente/invalido.
- `400`: nenhum arquivo enviado ou tipo invalido.
- `500`: erro interno.

---

## Como validar se o upload esta funcionando de verdade

1. Fazer upload com endpoint correto e campo correto (`avatar`, `image`, `video`, `cover`).
2. Confirmar `success: true` no JSON de resposta.
3. Abrir a URL retornada (`avatarUrl`, `imageUrl`, `videoUrl`, `coverUrl`) no navegador.
4. Verificar no frontend se avatar/galeria/chat refletem a alteracao.
5. Repetir com:
   - arquivo acima do limite (deve falhar);
   - tipo invalido (deve falhar);
   - sem token nos endpoints protegidos (deve falhar com `401`).

## Suite de teste real (copiar e rodar)

Substitua apenas os valores sensiveis e execute na ordem:

```bash
# 1) Login real (capturar token)
curl -X POST "https://livego.store/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"SEU_EMAIL_REAL\",\"password\":\"SUA_SENHA_REAL\"}"

# 2) Avatar com auth
curl -X POST "https://livego.store/api/upload/avatar" -H "Authorization: Bearer TOKEN_REAL" -F "avatar=@C:/Users/adria/Pictures/avatar-real.jpg"

# 3) Chat com auth
curl -X POST "https://livego.store/api/upload/chat" -H "Authorization: Bearer TOKEN_REAL" -F "image=@C:/Users/adria/Pictures/chat-real.jpg"

# 4) Galeria com auth
curl -X POST "https://livego.store/api/upload/gallery" -H "Authorization: Bearer TOKEN_REAL" -F "image=@C:/Users/adria/Pictures/obra-real.jpg"

# 5) Video com auth
curl -X POST "https://livego.store/api/upload/video" -H "Authorization: Bearer TOKEN_REAL" -F "video=@C:/Users/adria/Videos/video-real.mp4"

# 6) Capa com stream real
curl -X POST "https://livego.store/api/upload/cover/STREAM_ID_REAL" -F "cover=@C:/Users/adria/Pictures/capa-real.png"
```

---

## Tabela rapida de endpoints

- `POST /api/upload/avatar` -> avatar autenticado (campo `avatar`, 5 MB, imagem)
- `POST /api/upload/avatar/:userId` -> avatar por id (campo `avatar`, 5 MB, imagem)
- `POST /api/upload/cover/:id` -> capa de stream (campo `cover`, 5 MB, imagem)
- `POST /api/upload/chat` -> imagem de chat autenticado (campo `image`, 10 MB, imagem)
- `POST /api/upload/gallery` -> galeria autenticado (campo `image`, 10 MB, imagem)
- `POST /api/upload/video` -> video autenticado (campo `video`, 50 MB, video)
