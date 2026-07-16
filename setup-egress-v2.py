#!/usr/bin/env python3
"""
setup-egress-v2.py - Adiciona o serviço LiveKit Egress ao docker-compose.yml
Uso: python3 setup-egress-v2.py
"""

import os

COMPOSE_FILE = "/app/docker-compose.yml"
EGRESS_CONFIG_SRC = "/tmp/egress.yaml"
EGRESS_CONFIG_DST = "/opt/livekit/egress.yaml"

# Read current docker-compose.yml
with open(COMPOSE_FILE, 'r') as f:
    lines = f.readlines()

# Find the LAST occurrence of 'networks:' at the start of a line (top-level)
# Top-level blocks start at column 0
last_top_level_networks = -1
for i, line in enumerate(lines):
    if line.rstrip() == 'networks:':
        # Check if this is a top-level key (no leading whitespace)
        indent = len(line) - len(line.lstrip())
        if indent == 0:
            last_top_level_networks = i

if last_top_level_networks == -1:
    print("[EGRESS] ERRO: Não encontrou 'networks:' top-level no docker-compose.yml")
    exit(1)

print(f"[EGRESS] Top-level 'networks:' encontrado na linha {last_top_level_networks + 1}")

# Build the egress service block (indented by 2 spaces for YAML)
egress_block = """  egress:
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

# Insert before top-level networks:
new_lines = lines[:last_top_level_networks] + [egress_block] + lines[last_top_level_networks:]

# Backup
backup = COMPOSE_FILE + ".bak2"
with open(backup, 'w') as f:
    f.writelines(lines)
print(f"[EGRESS] Backup criado: {backup}")

# Write new file
with open(COMPOSE_FILE, 'w') as f:
    f.writelines(new_lines)
print(f"[EGRESS] Serviço egress adicionado ao {COMPOSE_FILE}")

# Copy egress config
os.makedirs('/opt/livekit', exist_ok=True)
if os.path.exists(EGRESS_CONFIG_SRC):
    import shutil
    shutil.copy(EGRESS_CONFIG_SRC, EGRESS_CONFIG_DST)
    print(f"[EGRESS] Config copiada: {EGRESS_CONFIG_SRC} -> {EGRESS_CONFIG_DST}")

print("[EGRESS] Setup concluído!")
