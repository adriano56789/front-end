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
  'Coração': '/animations/coracao.mp4?v=2',
  'Rosa': '/animations/rosa_cristal.mp4?v=2',
  'Pirulito': '/animations/pirulito.mp4?v=2',
  'Planta': '/animations/planta.mp4?v=2',
  'Sorvete': '/animations/sorvete.mp4?v=2',
  'Anel': '/animations/anel_de_ouro.mp4?v=2',
  'Champanhe': '/animations/champanhe_dourado.mp4?v=2',
  'Caixa de Presente Rosa': '/animations/caixa_de_presente_rosa.mp4?v=2',
  'Meu coração palpita por você': '/animations/meu_coracao_palpita_por_voce.mp4?v=2',
  // 🎵 Caixa de Música: mp4 antigo substituído pelo webm ZEGO VAP
  // (musicbox.webm — mesmo pacote da animação lottie).
  'Caixa de Música': '/animations/musicbox.webm',
  'Foguete': '/animations/foguete.mp4?v=2',
};

/**
 * Durações customizadas para cada animação (milissegundos).
 * Usado como fallback quando `gift.duration` não está definido.
 */
export const GIFT_ANIMATION_DURATIONS: Record<string, number> = {
  'Coração': 5033,
  'Rosa': 5000,
  'Pirulito': 4967,
  'Planta': 6033,
  'Sorvete': 10042,
  'Anel': 4367,
  'Champanhe': 4033,
  'Caixa de Presente Rosa': 5042,
  'Meu coração palpita por você': 7208,
  'Caixa de Música': 7067,
  'Foguete': 4000,
};

/**
 * Retorna a URL de animação para um gift pelo nome.
 * O mapa local tem PRIORIDADE para os presentes com arquivo controlado no
 * repo (o banco ainda pode apontar um arquivo antigo, ex.: musicbox.mp4);
 * o `animationUrl` da API vale apenas para gifts fora desse mapa
 * (ex.: /uploads/animations/*.webm).
 */
export function getAnimationUrl(gift: { name: string; animationUrl?: string }): string | undefined {
  if (GIFT_ANIMATION_URLS[gift.name]) return GIFT_ANIMATION_URLS[gift.name];
  return gift.animationUrl;
}

/**
 * Retorna a duração da animação para um gift pelo nome.
 */
export function getAnimationDuration(gift: { name: string; duration?: number }): number | undefined {
  if (gift.duration) return gift.duration;
  return GIFT_ANIMATION_DURATIONS[gift.name];
}
