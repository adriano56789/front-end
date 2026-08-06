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
  // Categoria: Popular
  'Pirulito': '/uploads/animations/pirulito.webm',
  'Rosa': '/animations/rosa_cristal.mp4',
  'Champanhe': '/animations/champanhe_dourado.mp4',
  'Anel': '/animations/anel_de_ouro.mp4',

  // Categoria: Efeito
  'Explosão de Confete': '/uploads/animations/explosao_confete.webm',
  'Coração Gigante': '/uploads/animations/coracao_gigante.webm',
  'Portal Galáctico': '/uploads/animations/portal_galactico.webm',
  'Show de Luzes': '/uploads/animations/show_de_luzes.webm',
  'Chuva de Rosas': '/uploads/animations/chuva_de_rosas.webm',
};

/**
 * Durações customizadas para cada animação (milissegundos).
 * Usado como fallback quando `gift.duration` não está definido.
 */
export const GIFT_ANIMATION_DURATIONS: Record<string, number> = {
  'Pirulito': 4000,
  'Rosa': 5500,
  'Champanhe': 4500,
  'Anel': 4500,
  'Explosão de Confete': 5000,
  'Coração Gigante': 5000,
  'Portal Galáctico': 5000,
  'Show de Luzes': 5000,
  'Chuva de Rosas': 5000,
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
