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
  // (formato alpha-strip: máscara de transparência + cores no mesmo frame).
  // Servidos estaticamente por nginx a partir de /var/www/livego.store/animations.
  'Coração': '/animations/coracao.mp4',
  'Rosa': '/animations/rosa_cristal.mp4',
  'Pirulito': '/animations/pirulito.mp4',
  'Planta': '/animations/planta.mp4',
  'Sorvete': '/animations/sorvete.mp4',
  'Anel': '/animations/anel_de_ouro.mp4',
  'Champanhe': '/animations/champanhe_dourado.mp4',
  'Caixa de Presente Rosa': '/animations/caixa_de_presente_rosa.mp4',
  'Meu coração palpita por você': '/animations/meu_coracao_palpita_por_voce.mp4',
  'Caixa de Música': '/animations/musicbox.mp4',
  'Foguete': '/animations/foguete.mp4',
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
 * Primeiro verifica se o gift já tem animationUrl, senão busca no mapa local.
 */
export function getAnimationUrl(gift: { name: string; animationUrl?: string }): string | undefined {
  if (gift.animationUrl) return gift.animationUrl;
  return GIFT_ANIMATION_URLS[gift.name];
}

/**
 * Retorna a duração da animação para um gift pelo nome.
 */
export function getAnimationDuration(gift: { name: string; duration?: number }): number | undefined {
  if (gift.duration) return gift.duration;
  return GIFT_ANIMATION_DURATIONS[gift.name];
}
