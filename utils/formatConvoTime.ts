// Formata o horário da ÚLTIMA MENSAGEM na lista de conversas (estilo WhatsApp):
//   hoje       → "HH:mm"
//   ontem      → "Ontem"
//   < 7 dias   → dia da semana (Seg, Ter...)
//   mais velho → "dd/mm"
// Aceita ISO string, número, Date ou objeto MongoDB ({ $date } / { date } /
// { createdAt }). Fallback createdAt: se o horário da última mensagem não veio,
// usa a hora real de criação. Nunca exibe lixo por timestamp inválido.
// Usa o relógio do SERVIDOR (getServerNow), não o do celular.
import { getServerNow } from './serverTime';

export function formatConvoTime(timestamp?: any): string {
    if (!timestamp) return '';
    try {
        let dateVal = timestamp;
        if (timestamp instanceof Date) {
            dateVal = timestamp.getTime();
        } else if (timestamp && typeof timestamp === 'object') {
            if ('$date' in timestamp) {
                dateVal = timestamp.$date;
            } else if ('date' in timestamp) {
                dateVal = timestamp.date;
            } else if ('createdAt' in timestamp) {
                // 🕐 Fallback createdAt (mesmo modelo do chat): usa a hora real de criação.
                dateVal = timestamp.createdAt;
            } else {
                return '';
            }
        }
        const date = new Date(dateVal);
        if (isNaN(date.getTime())) return '';

        // 🕐 Lógica por dia do calendário (estilo WhatsApp): mensagem de ontem à
        // noite vista hoje de madrugada mostra "Ontem", não a hora de ontem.
        // Relógio do SERVIDOR para não depender do horário do celular.
        const now = getServerNow();
        const isSameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
        if (isSameDay) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate();
        if (isYesterday) return 'Ontem';
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            return dias[date.getDay()];
        }
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    } catch {
        return '';
    }
}
