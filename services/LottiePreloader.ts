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

const warmed = new Set<string>();

/**
 * Pré-aquece as imagens externas do JSON (ex.: musicbox.json → 212 webps em
 * /animations/musicbox/). O fetch em background popula o cache HTTP do
 * navegador, então quando o presente chega o lottie-web encontra as imagens
 * já em cache e a animação aparece INSTANTANEAMENTE (sem esperar download).
 * Segue a MESMA resolução de path do lottie-web: assetsPath + asset.p
 * (o prefixo "images/" é removido quando o assetsPath está setado).
 */
function warmImages(url: string, data: any): void {
    const base = url.replace(/\.json$/, '') + '/';
    const assets: any[] = (data && data.assets) || [];
    assets.forEach((a) => {
        if (!a || a.e || typeof a.p !== 'string' || a.p.indexOf('data:') === 0) return;
        let p = a.p;
        if (p.indexOf('images/') !== -1) p = p.split('/')[1];
        if (!p) return;
        const imgUrl = base + p;
        if (warmed.has(imgUrl)) return;
        warmed.add(imgUrl);
        try {
            fetch(imgUrl).catch(() => { /* cache falhou — lottie baixa na hora */ });
        } catch { /* ignore */ }
    });
}

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
            warmImages(url, data);
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
