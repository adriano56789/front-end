#!/bin/sh
# Fix voice room route order in server.ts
cd /app

# Remove old lines
sed -i '/voiceRoomRoutes/d' src/server.ts

# Find liveRoutes line
N=$(grep -n "app.use.*liveRoutes" src/server.ts | head -1 | cut -d: -f1)
echo "liveRoutes at line: $N"

# Insert import + app.use BEFORE liveRoutes
sed -i "${N}i import voiceRoomRoutes from './routes/voiceRoomRoutes';
app.use('/api/voice-rooms', voiceRoomRoutes);
" src/server.ts

echo "=== Result ==="
grep -n voiceRoomRoutes src/server.ts
