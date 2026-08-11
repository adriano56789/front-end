// Formata o horário de uma mensagem privada:
//   agora (< 60s)  → "Agora"
//   hoje           → "14:32"
//   ontem          → "Ontem 14:32"
//   dias antes     → "12/08/2026 14:32"   (data completa + hora)
// Usa o relógio do SERVIDOR (getServerNow), nunca o do celular, para que a
// data/hora exibida seja idêntica para todos os usuários.
import { getServerNow } from './serverTime';

export function formatMessageTime(timestamp?: string | number | Date | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = getServerNow();
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Diferença em dias de calendário entre hoje (servidor) e o dia da mensagem
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMsgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round((startOfToday.getTime() - startOfMsgDay.getTime()) / 86400000);

    // Hoje
    if (dayDiff === 0) {
        const diffSec = (now.getTime() - date.getTime()) / 1000;
        if (diffSec >= 0 && diffSec < 60) return 'Agora';
        return time;
    }

    // Ontem
    if (dayDiff === 1) return `Ontem ${time}`;

    // Dias antes → data completa + hora (sempre com ano para não faltar informação)
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy} ${time}`;
}
