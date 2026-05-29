#!/bin/bash

echo "=== CORRIGINDO ERRO SSL ==="

# Corrigir erro de cipher
sed -i 's|ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;|ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256;|' /etc/nginx/sites-available/livego

# Testar e recarregar Nginx
nginx -t && systemctl reload nginx

echo "✅ SSL corrigido!"
