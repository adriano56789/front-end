// ═══════════════════════════════════════════════════════════════════════
// REMOVIDO: Polling via setInterval
// Toda comunicação em tempo real agora é feita exclusivamente via 
// LiveKit WebSocket (DataChannel). Sem polling.
//
// - user_status_updated → LiveKit DataChannel
// - diamonds_updated → LiveKit DataChannel
// - earnings_updated → LiveKit DataChannel
// - stream list → API (carregada manualmente, sem polling automático)
// ═══════════════════════════════════════════════════════════════════════
export {};
