// Formata o horário da ÚLTIMA MENSAGEM na lista de conversas com informação
// completa (mesmo formato exato das mensagens dentro do chat):
//   agora (< 60s)  → "Agora"
//   hoje           → "14:32:45"   (com segundos, para não repetir)
//   ontem          → "Ontem 14:32:45"
//   dias antes     → "12/08/2026 14:32:45"   (data completa + hora exata)
// Aceita ISO string, número, Date ou objeto MongoDB ({ $date } / { date } /
// { createdAt }). Nunca exibe lixo por timestamp inválido.
// Usa o relógio do SERVIDOR (getServerNow), não o do celular.
import { formatMessageTime } from './formatMessageTime';

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
        return formatMessageTime(dateVal);
    } catch {
        return '';
    }
}
