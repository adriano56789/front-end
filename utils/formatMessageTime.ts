// Formata o horário de uma mensagem privada:
//   hoje            → "14:32"            (só a hora)
//   outro dia       → "12/08 14:32"      (data + hora)
//   outro ano       → "12/08/2026 14:32" (data completa + hora)
// A data aparece sempre que a mensagem NÃO é de hoje — ou seja, quando foi
// enviada há mais de 1 dia (dia anterior ou antes) OU em um dia seguinte
// (mensagem com data futura). Usa o relógio do SERVIDOR (serverTime).
import { getServerNow } from './serverTime';

export function formatMessageTime(timestamp?: string | number | Date | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = getServerNow();
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const isSameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    if (isSameDay) return time;

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    if (date.getFullYear() === now.getFullYear()) return `${dd}/${mm} ${time}`;
    return `${dd}/${mm}/${date.getFullYear()} ${time}`;
}
