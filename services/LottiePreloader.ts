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

// ─────────────────────────────────────────────────────────────────────────────
// 🖼️ PRÉ-AQUECIMENTO DOS FRAMES (webp) — resolve o bug "animação só aparece na
// 2ª vez": o lottie-web baixa as imagens sob demanda NO MOMENTO do presente,
// então o 1º envio ficava em branco/enquanto os frames baixavam; no 2º envio
// eles vinham do cache HTTP e a animação aparecia na hora.
//
// Aqui baixamos os frames ANTES (quando a sala abre), com FILA de concorrência
// limitada (3 por vez) para NÃO repetir a enxurrada de requisições que gerava
// erros 408 no servidor.
// ─────────────────────────────────────────────────────────────────────────────

const warmedImages = new Set<string>();
const IMAGE_CONCURRENCY = 3;
let activeImageJobs = 0;
const imageQueue: Array<() => void> = [];

function pumpImageQueue(): void {
    while (activeImageJobs < IMAGE_CONCURRENCY && imageQueue.length > 0) {
        const job = imageQueue.shift();
        if (!job) break;
        activeImageJobs++;
        job();
    }
}

function fetchImageWarm(url: string): Promise<void> {
    return new Promise((resolve) => {
        const img = new Image();
        const done = () => {
            activeImageJobs--;
            pumpImageQueue();
            resolve();
        };
        img.onload = done;
        img.onerror = done; // erro não bloqueia a fila
        img.src = url;
    });
}

function enqueueImageWarm(url: string): Promise<void> {
    if (warmedImages.has(url)) return Promise.resolve();
    warmedImages.add(url);
    return new Promise((resolve) => {
        imageQueue.push(() => {
            fetchImageWarm(url).then(resolve);
        });
        pumpImageQueue();
    });
}

/** URL exata que o lottie-web vai pedir para cada asset do JSON. */
function lottieAssetUrl(jsonUrl: string, asset: any): string | null {
    // Assets embutidos (data URI / `e:1`) não precisam de rede.
    if (!asset?.p || asset.e === 1 || String(asset.p).startsWith('data:')) return null;
    const base = jsonUrl.replace(/\.json$/, '') + '/';
    const p = String(asset.p);
    if (/^https?:\/\//i.test(p)) return p;
    return base + (asset.u ? String(asset.u) : '') + p;
}

/**
 * Pré-aquece JSON + FRAMES + áudio externo de uma animação Lottie de presente.
 * Chame quando a sala de live/PK abrir (idempotente). Com tudo no cache, o
 * 1º envio do presente já toca a animação instantaneamente, em tela cheia.
 */
export function preloadLottieAssets(url: string): void {
    ensureLottieJson(url)
        .then((data) => {
            if (!data || !Array.isArray(data.assets)) return;
            data.assets.forEach((asset: any) => {
                const assetUrl = lottieAssetUrl(url, asset);
                if (assetUrl) enqueueImageWarm(assetUrl);
            });
        })
        .catch(() => { /* silencioso — fallback do player cobre */ });
}
