// Formata o horário de uma mensagem SEMPRE mostrando o DIA DA SEMANA + HORA
// + DATA (cada mensagem com o seu próprio horário):
//   hoje       → "Segunda-feira, 14:32"
//   outro dia  → "Segunda-feira, 12/08 14:32"
//   outro ano  → "Segunda-feira, 12/08/2026 14:32"
// Usa o relógio do SERVIDOR (serverTime) para decidir "hoje/outro dia".
import { getServerNow } from './serverTime';

export function formatMessageTime(timestamp?: string | number | Date | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = getServerNow();
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const isSameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    if (isSameDay) return `${weekdayCap}, ${time}`;

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    if (date.getFullYear() === now.getFullYear()) return `${weekdayCap}, ${dd}/${mm} ${time}`;
    return `${weekdayCap}, ${dd}/${mm}/${date.getFullYear()} ${time}`;
}
