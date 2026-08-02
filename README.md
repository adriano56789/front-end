# LiveGo - Frontend

Aplicação frontend do LiveGo, uma plataforma de live streaming com chat em tempo real, sistema de presentes virtuais, batalhas PK, filtros de beleza em WebGL e integração com SRS (WebRTC) para transmissão ao vivo.

## Tecnologias

- **React** + **TypeScript**
- **Vite** para build
- **Tailwind CSS** para estilização
- **SRS** (Simple Realtime Server) para streaming de vídeo (WebRTC publish via WebSocket + WHEP play)
- **WebGL** para filtros de beleza em tempo real
- **REST API** para chat, presença e eventos complementares
- **i18n** com suporte a português e inglês

## Estrutura

```
├── components/       # Componentes React da interface
│   ├── icons/        # Ícones SVG personalizados
│   ├── live/         # Componentes da sala de live
│   ├── ui/           # Componentes de UI reutilizáveis
│   └── upload/       # Componentes de upload
├── hooks/            # Hooks personalizados
├── services/         # Serviços (API, socket, WebRTC, etc.)
│   └── srs/          # Integração com SRS
├── src/              # Código-fonte adicional
│   ├── components/   # Componentes auxiliares
│   ├── services/     # Serviços auxiliares (Protobuf, etc.)
│   └── utils/        # Utilitários
├── i18n/             # Arquivos de tradução
├── docker/           # Configurações Docker
├── scripts/          # Scripts de build e deploy
└── public/           # Arquivos estáticos
```

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev

# Build de produção
npm run build
```

## Deploy

O deploy é feito via Docker. Consulte `docker-compose.yml` e os scripts em `scripts/` para mais detalhes.
