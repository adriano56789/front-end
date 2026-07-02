export function decodeTokenIdentity(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || decoded.identity || null;
  } catch {
    return null;
  }
}

export function generateLocalToken(roomId: string, identity: string, isPublisher: boolean): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: identity,
    room: roomId,
    iss: 'livekit-server',
    exp: Math.floor(Date.now() / 1000) + 3600,
    video: { roomJoin: true, publisher: isPublisher }
  }));
  const signature = 'simulated_signature_hash_data';
  return `${header}.${payload}.${signature}`;
}
