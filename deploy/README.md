# Deploy configs (MediaMTX + SRS + Nginx)

Configs mínimos para Docker. Os repositórios completos `srs/` e `nginx/` (código-fonte upstream) podem ser removidos do projeto — use as imagens oficiais referenciadas em `docker-compose.yml`.

- `mediamtx.yml` — ingest RTMP, encaminha para SRS
- `srs-docker.conf` — SRS WebRTC + RTMP + callbacks backend
- `nginx-livego.conf` — reverse proxy produção
