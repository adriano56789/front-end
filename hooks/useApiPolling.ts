// ═══════════════════════════════════════════════════════════════════════
// REMOVIDO: Polling via setInterval
// Toda comunicação em tempo real agora é feita exclusivamente via 
// Arquitetura SRS-only: eventos em tempo real via REST API + polling.
//
// - user_status_updated → REST API
// - diamonds_updated → REST API
// - earnings_updated → REST API
// - stream list → API (carregada manualmente, sem polling automático)
// ═══════════════════════════════════════════════════════════════════════
export {};
