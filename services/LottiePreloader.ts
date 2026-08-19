/**
 * LottiePreloader
 *
 * Pré-carrega os JSONs de animação Lottie (presentes) ANTES do presente
 * chegar, para a animação aparecer INSTANTANEAMENTE no evento do gift (sem o
 * atraso do fetch + parse do JSON — que pode ter centenas de KB).
 *
 * O áudio do efeito fica EMBUTIDO no próprio JSON (asset data URI + camada
 * ty:6), então pré-carregar o JSON já pré-carrega o som junto.
 */

const dataCache = new Map<string, any>();
const inflight = new Map<string, Promise<any>>();

/**
 * Pré-carrega SOMENTE o JSON da animação Lottie (presentes) ANTES do presente
 * chegar, para a animação aparecer quase instantaneamente no evento do gift.
 *
 * ⚠️ NÃO baixa as imagens webp do JSON em background (removido): pré-aquecer
 * centenas de webps por gift gerava uma enxurrada de requisições (centenas de
 * *.webp ao mesmo tempo → erros 408 no log). As imagens são baixadas pelo
 * lottie-web sob demanda, no momento do presente — sem flood no servidor.
 *
 * O áudio do efeito fica EMBUTIDO no próprio JSON (asset data URI + camada
 * ty:6), então pré-carregar o JSON já pré-carrega o som junto.
 */

/** Inicia o download do JSON em segundo plano (idempotente). */
export function preloadLottieJson(url: string): void {
    if (dataCache.has(url) || inflight.has(url)) return;

    const p = fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            dataCache.set(url, data);
            return data;
        })
        .finally(() => {
            inflight.delete(url);
        });

    inflight.set(url, p);
}

/** Retorna o JSON já em memória (undefined se ainda não foi carregado). */
export function getLottieJson(url: string): any | undefined {
    return dataCache.get(url);
}

/**
 * Garante o JSON carregado: usa o cache se pronto, entra no download já em
 * andamento (se houver) ou inicia um novo. Nunca faz dois downloads do mesmo URL.
 */
export function ensureLottieJson(url: string): Promise<any> {
    const cached = dataCache.get(url);
    if (cached) return Promise.resolve(cached);
    if (inflight.has(url)) return inflight.get(url)!;
    preloadLottieJson(url);
    return inflight.get(url)!;
}
