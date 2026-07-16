import re

COMPOSE = "/app/docker-compose.yml"

with open(COMPOSE, "r") as f:
    content = f.read()

# Egress service block (service def must be under 'services:' key)
# We insert it before the 'volumes:' top-level key
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

# Find position of top-level 'volumes:' (at start of line, no indent)
match = re.search(r'\nvolumes:\s*\n', content)
if not match:
    print("ERRO: 'volumes:' top-level nao encontrado")
    exit(1)

pos = match.start() + 1  # +1 to keep the newline before 'volumes:'
new_content = content[:pos] + egress_block + "\n" + content[pos:]

# Verify it looks right - check the egress block is before volumes:
verify_before = new_content[:pos].strip().endswith('livego-net')
if not verify_before:
    # Try to find networks line
    pass

with open(COMPOSE + ".bak4", "w") as f:
    f.write(content)
print("Backup criado: " + COMPOSE + ".bak4")

with open(COMPOSE, "w") as f:
    f.write(new_content)
print("EGRESS adicionado ao docker-compose.yml")
