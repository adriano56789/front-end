// Formata o horário de uma mensagem com hora + data, deixando claro
// EXATAMENTE quando cada mensagem foi enviada (cada uma com seu próprio horário).
export function formatMessageTime(timestamp?: string | number | Date | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const isSameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    if (isSameDay) return time;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate();
    if (isYesterday) return `ontem ${time}`;

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    if (date.getFullYear() === now.getFullYear()) return `${dd}/${mm} ${time}`;
    return `${dd}/${mm}/${date.getFullYear()} ${time}`;
}
