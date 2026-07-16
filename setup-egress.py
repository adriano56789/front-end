#!/usr/bin/env python3
"""
setup-egress.py - Adiciona o serviço LiveKit Egress ao docker-compose.yml

Uso: python3 setup-egress.py
"""

import os

COMPOSE_FILE = "/app/docker-compose.yml"
EGRESS_CONFIG = "/opt/livekit/egress.yaml"
BACKUP_FILE = "/app/docker-compose.yml.bak-egress"

# Read current docker-compose.yml
with open(COMPOSE_FILE, 'r') as f:
    content = f.read()

# Check if egress already exists
if 'egress:' in content or 'app-egress' in content:
    print("[EGRESS] Serviço egress já existe no docker-compose.yml")
    # Still ensure config file exists
    if not os.path.exists(EGRESS_CONFIG):
        print(f"[EGRESS] AVISO: {EGRESS_CONFIG} não encontrado!")
    else:
        print(f"[EGRESS] {EGRESS_CONFIG} está presente")
else:
    # Backup
    with open(BACKUP_FILE, 'w') as f:
        f.write(content)
    print(f"[EGRESS] Backup criado: {BACKUP_FILE}")

    # Find the position before 'networks:' at the end of file
    # The egress service should be added before the networks definition
    networks_pos = content.find('\nnetworks:')
    
    if networks_pos == -1:
        print("[EGRESS] ERRO: Não encontrou 'networks:' no docker-compose.yml")
        exit(1)

    # Create the egress service block
    egress_block = """
  egress:
    image: livekit/egress:latest
    container_name: app-egress
    restart: unless-stopped
    networks:
      - livego-net
    extra_hosts:
      - "host.docker.internal:host-gateway"
    cap_add:
      - SYS_ADMIN
    volumes:
      - /opt/livekit/egress.yaml:/out/egress.yaml:ro
    environment:
      - EGRESS_CONFIG_FILE=/out/egress.yaml
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
"""

    # Insert egress block before 'networks:'
    new_content = content[:networks_pos] + egress_block + content[networks_pos:]

    with open(COMPOSE_FILE, 'w') as f:
        f.write(new_content)
    print(f"[EGRESS] Serviço egress adicionado ao {COMPOSE_FILE}")

# Ensure egress config directory exists
os.makedirs(os.path.dirname(EGRESS_CONFIG) if os.path.dirname(EGRESS_CONFIG) else '.', exist_ok=True)

# Create egress config if not exists
if not os.path.exists(EGRESS_CONFIG):
    import shutil
    # Copy from current directory if available
    if os.path.exists('/tmp/egress.yaml'):
        shutil.copy('/tmp/egress.yaml', EGRESS_CONFIG)
        print(f"[EGRESS] Config copiada de /tmp/egress.yaml para {EGRESS_CONFIG}")
    else:
        print(f"[EGRESS] AVISO: {EGRESS_CONFIG} não encontrado. Copie o arquivo manualmente.")
else:
    print(f"[EGRESS] {EGRESS_CONFIG} já existe")

print("[EGRESS] Setup concluído!")
print("[EGRESS] Execute 'docker compose -f /app/docker-compose.yml up -d egress' para iniciar")
