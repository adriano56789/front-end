#!/bin/sh
# Fix StreamLifecycleManager.ts - remover propriedade streamStatus duplicada
sed -i 's/isPrivate: streamData.isPrivate || false,.*streamStatus: .preparing.,/isPrivate: streamData.isPrivate || false,/' /app/backend/src/services/StreamLifecycleManager.ts
echo "StreamLifecycleManager fixed"
