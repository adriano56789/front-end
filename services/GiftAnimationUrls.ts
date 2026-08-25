/**
 * Mapa local de URLs de animação para presentes.
 * 
 * Este mapa serve como fallback quando a API do backend não retorna
 * o campo `animationUrl` para os gifts (porque o banco de dados
 * ainda não foi populado com essas URLs).
 * 
 * As URLs apontam para arquivos .webm servidos estaticamente pelo backend
 * em /uploads/animations/.
 */
export const GIFT_ANIMATION_URLS: Record<string, string> = {
  // Categoria: Popular — TODOS os 9 presentes têm vídeo de animação mp4
  // (formato VAP side-by-side 1500×1624: conteúdo + máscara alfa no mesmo frame).
  // ?v=2 quebra o cache do browser após a troca dos mp4 para o formato novo.
  // Servidos estaticamente por nginx a partir de /var/www/livego.store/animations.
  'Rosa': '/animations/rosa_cristal.mp4?v=2',
  'Pirulito': '/animations/pirulito.mp4?v=2',
  'Planta': '/animations/planta.mp4?v=2',
  'Sorvete': '/animations/sorvete.mp4?v=2',
  'Anel': '/animations/anel_de_ouro.mp4?v=2',
  'Champanhe': '/animations/champanhe_dourado.mp4?v=2',
  'Caixa de Presente Rosa': '/animations/caixa_de_presente_rosa.mp4?v=2',
  'Meu coração palpita por você': '/animations/meu_coracao_palpita_por_voce.mp4?v=2',
  // 🎵 Caixa de Música: VAP ZEGO original do pacote 6756 (video.mp4 752×304,
  // 15fps, 5s — conteúdo 750×200 + máscara alfa 375×100; transparência REAL).
  'Caixa de Música': '/animations/musicbox.mp4?v=2',
  'Foguete': '/animations/foguete.mp4?v=2',
  // 🪽 Asas de Anjo (pacote 翅膀 NO.102834): VAP dual-channel 1136×1632,
  // conteúdo 750×1624 à esquerda + alfa 375×812 no topo-direita, 30fps, 8.0s.
  'Asas de Anjo': '/animations/asas_de_anjo.mp4?v=1',
};

/**
 * Durações customizadas para cada animação (milissegundos).
 * Usado como fallback quando `gift.duration` não está definido.
 */
export const GIFT_ANIMATION_DURATIONS: Record<string, number> = {
  'Rosa': 5000,
  'Pirulito': 4967,
  'Planta': 6033,
  'Sorvete': 10042,
  'Anel': 4367,
  'Champanhe': 4033,
  'Caixa de Presente Rosa': 5042,
  'Meu coração palpita por você': 7208,
  'Caixa de Música': 5000,
  'Foguete': 4000,
  'Asas de Anjo': 8000,
};

/**
 * 🔒 NUNCA buscar mídia externa — sempre usar URLs locais.
 * são sempre locais (nginx). Se o banco ou um evento socket trouxer uma URL do
 * URLs de storage antigo, converte para o caminho LOCAL equivalente (mesmo path) —
 * o arquivo existe localmente se o path bater; senão a animação cai no fallback.
 * URL antiga de storage: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media...
 */
export function sanitizeMediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.includes('firebasestorage.googleapis.com')) {
    try {
      const m = url.match(/\/o\/([^?]+)/);
      if (m) {
        const p = decodeURIComponent(m[1]);
        return p.startsWith('/') ? p : '/' + p;
      }
    } catch {
      /* URL inválida — ignora */
    }
    return undefined;
  }
  return url;
}

/**
 * Retorna a URL de animação para um gift pelo nome.
 * O mapa local tem PRIORIDADE para os presentes com arquivo controlado no
 * repo (o banco ainda pode apontar um arquivo antigo, ex.: musicbox.mp4);
 * o `animationUrl` da API vale apenas para gifts fora desse mapa
 * (ex.: /uploads/animations/*.webm). Sempre sanitizada.
 */
export function getAnimationUrl(gift: { name: string; animationUrl?: string }): string | undefined {
  if (GIFT_ANIMATION_URLS[gift.name]) return GIFT_ANIMATION_URLS[gift.name];
  return sanitizeMediaUrl(gift.animationUrl);
}

/**
 * Retorna a duração da animação para um gift pelo nome.
 */
export function getAnimationDuration(gift: { name: string; duration?: number }): number | undefined {
  if (gift.duration) return gift.duration;
  return GIFT_ANIMATION_DURATIONS[gift.name];
}
