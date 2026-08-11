// ⏰ Relógio do SERVIDOR: calcula um offset entre o relógio do celular e o do
// servidor a partir de um timestamp do servidor que representa "agora" (ex.:
// resposta de envio de mensagem ou mensagem recebida em tempo real via socket).
// Assim o chat mostra hora/data SEMPRE pelo horário do servidor, sem depender
// do relógio do aparelho. Se nada for sincronizado, usa o relógio local.

let offsetMs = 0;

export function syncServerTime(serverTimestamp?: string | number | Date | null): void {
    if (!serverTimestamp) return;
    try {
        const date = new Date(serverTimestamp as any);
        if (isNaN(date.getTime())) return;
        offsetMs = date.getTime() - Date.now();
    } catch {
        // ignora timestamp inválido
    }
}

export function getServerNow(): Date {
    return new Date(Date.now() + offsetMs);
}
