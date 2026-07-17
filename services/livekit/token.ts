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

/**
 * Gera um token JWT local para o LiveKit.
 * Nota: O token gerado aqui não tem assinatura criptográfica válida.
 * Use o backend (`/api/livekit/chat-token`) para obter tokens assinados com as permissões corretas.
 */
export function generateLocalToken(roomId: string, identity: string, isPublisher: boolean): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: identity,
    room: roomId,
    iss: 'local-client',
    exp: Math.floor(Date.now() / 1000) + 3600,
    video: { roomJoin: true, publisher: isPublisher }
  }));
  // Token sem assinatura real — sempre usar /api/livekit/chat-token em produção
  const signature = btoa(JSON.stringify({ type: 'local-dev', generated_at: Date.now() }));
  return `${header}.${payload}.${signature}`;
}
