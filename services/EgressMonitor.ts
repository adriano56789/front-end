// ═══════════════════════════════════════════════════════════════════════
// REMOVIDO: EgressMonitor — polling de estado do Egress RTMP
// 
// Toda comunicação em tempo real agora é feita exclusivamente via 
// LiveKit WebSocket. O player HLS tenta conectar diretamente sem 
// precisar de monitor de Egress.
// ═══════════════════════════════════════════════════════════════════════
export {};
