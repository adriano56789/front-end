// ═══════════════════════════════════════════════════════════════════════
// Serviço de Tradução GRATUITO (sem solução paga / sem API key)
//
// Usa o endpoint público translate.googleapis.com (client=gtx) — o MESMO
// que alimenta a barra "Traduzir" do Google Chrome. Não exige chave, não
// cobra e funciona direto do navegador (CORS liberado).
//
// O idioma ALVO é o idioma configurado no perfil do usuário (useTranslation
// → language). Se a tradução falhar, a mensagem original é mantida intacta.
// ═══════════════════════════════════════════════════════════════════════

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

const cache = new Map<string, string>();

// Normaliza o idioma do perfil para um código compatível com o endpoint.
// ('pt-BR' → 'pt', 'en-US' → 'en', etc.)
function normalizeLang(lang: string): string {
  if (!lang) return 'pt';
  const base = lang.trim().split('-')[0].split('_')[0].toLowerCase();
  const aliases: Record<string, string> = {
    ptbr: 'pt', pbr: 'pt', ptpt: 'pt', 'pt-br': 'pt',
    eng: 'en', enus: 'en', engb: 'en',
    eses: 'es', esmx: 'es',
    frfr: 'fr', defr: 'de', ch: 'zh', 'zh-cn': 'zh', zhhans: 'zh',
  };
  return aliases[base] || base || 'pt';
}

export function getTranslateLang(lang: string): string {
  return normalizeLang(lang);
}

export async function translateText(text: string, targetLang: string): Promise<string | null> {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const target = normalizeLang(targetLang);
  const cacheKey = `${target}|${trimmed}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  // Se o texto já estiver no idioma alvo (detecção automática), retorna igual.
  try {
    const url = `${TRANSLATE_ENDPOINT}?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const segments: any[] = Array.isArray(data?.[0]) ? data[0] : [];
    const translated = segments
      .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
      .join('')
      .trim();

    if (!translated) return null;

    const detected = data?.[2] || '';
    const alreadyInTarget = detected && detected.toLowerCase() === target;
    const finalText = alreadyInTarget ? trimmed : translated;

    cache.set(cacheKey, finalText);
    return finalText;
  } catch (err) {
    console.warn('[Translate] Falha ao traduzir, mantendo original:', err);
    return null;
  }
}
