import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * ⌨️ Composer de mensagem — BARRA PRINCIPAL FIXA + BARRA DE DIGITAÇÃO FLUTUANTE
 *
 * Comportamento (TikTok/PWA):
 *   - A BARRA PRINCIPAL fica TOTALMENTE FIXA no fundo (bottom:0 + safe-area).
 *     Não sobe, não mexe, nunca é reposicionada para acompanhar o teclado.
 *   - Ao tocar nela → o input ganha foco e o teclado abre.
 *   - Surge OUTRA barra de digitação "por cima do teclado" (position:fixed com
 *     bottom = altura do teclado medida) — é NELA que a pessoa escreve.
 *   - VirtualKeyboard API: overlaysContent=true → o teclado SOBREPÕE a parte
 *     inferior da tela em vez de redimensionar o viewport. Nada acima da barra
 *     sobe: sala, transmissão, botões e ícones permanecem parados.
 *   - A altura do teclado é usada SOMENTE para posicionar a barra flutuante.
 *     Jamais para mover a barra principal, a sala ou a transmissão.
 *
 * 🎬 FECHAMENTO (correção: barra desce JUNTO com o teclado, sem enganchar):
 *   1. `closeComposer()` NÃO desmonta a barra na hora. Ele:
 *      a) dá blur no input → o teclado começa a animação de descida AGORA;
 *      b) zera `keyboardBottom` (bottom → 0) com a MESMA duração/curva da
 *         animação nativa do teclado → a barra desce sincronizada com ele;
 *      c) agenda a desmontagem real (isComposerOpen=false) para DEPOIS da
 *         animação (~250ms). Sem isso a barra sumia instantâneo ou ficava
 *         "enganchada" parada no ar até o próximo measurement.
 *   2. O loop de medição (rAF) também zera `keyboardBottom` quando detecta
 *      teclado fechado durante o fechamento — tolerância a timing do SO.
 *   3. Clique fora fecha na hora via `pointerdown` → mesmo fluxo acima.
 */

// Altura da barra principal (input + enviar + presente + roleta + 3pts + padding).
export const MESSAGE_BAR_HEIGHT = 72;

// Mantido para compatibilidade de import existente.
export const COMPOSER_BAR_HEIGHT = MESSAGE_BAR_HEIGHT;

// Duração da animação de descida da barra ao fechar. Aproxima a curva da
// animação nativa do teclado Android/iOS (~250ms) para que a barra desça
// "junto" com ele, sem ficar parada flutuando.
const CLOSE_ANIM_MS = 240;

// 🔬 Sonda de teclado: div oculto `fixed bottom:0` que mede onde o navegador
//   coloca elementos fixos naquele aparelho. Funciona em TODO modo de teclado
//   (overlay, adjustResize, resizes-visual, iOS). Se o navegador auto-sobe
//   elementos fixos quando o teclado abre, a sonda termina acima do fundo
//   visível → sabemos que o teclado está sendo tratado pelo browser. Se não,
//   medimos a altura real.
let kbProbe: HTMLDivElement | null = null;
function getKeyboardProbeBottom(): number {
  if (!kbProbe) {
    kbProbe = document.createElement('div');
    kbProbe.style.cssText =
      'position:fixed;left:0;bottom:0;width:1px;height:1px;visibility:hidden;pointer-events:none;z-index:-1;';
    document.body.appendChild(kbProbe);
  }
  return kbProbe.getBoundingClientRect().bottom;
}

// Cache da ÚLTIMA altura conhecida do teclado — usada como chute inicial
// quando a medição em tempo real ainda não retornou (primeiros frames).
const LS_KEY = 'lastKnownKeyboardHeight';
let lastKnownKeyboardH = 0;
try { lastKnownKeyboardH = Number(localStorage.getItem(LS_KEY) || 0) || 0; } catch { /* */ }
function persistKeyboardHeight(h: number): void {
  if (h <= 0 || Math.abs(h - lastKnownKeyboardH) < 2) return;
  lastKnownKeyboardH = h;
  try { localStorage.setItem(LS_KEY, String(h)); } catch { /* */ }
}

export function useComposerKeyboard() {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [keyboardBottom, setKeyboardBottom] = useState(0);
  const composerInputRef = useRef<any>(null);

  // 🎬 Estado "fechando": a barra ainda está montada descendo (bottom→0), mas
  //   o teclado já está se recolhendo. isComposerOpen só vira false no fim.
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita duplo agendamento de fechamento (pointerdown fora + blur simultâneos).
  const closingRef = useRef(false);
  // Última altura de teclado conhecida (para o rAF poder detectar "fechou").
  const lastKbRef = useRef(0);
  // Ref para closeComposer — o rAF (montado antes de closeComposer existir)
  // dispara o fechamento sincronizado quando detecta o teclado fechado.
  const closeRef = useRef<(() => void) | null>(null);

  // 📐 Referência da altura de LAYOUT em tela cheia (SEM teclado). É o
  //   denominador para medir o teclado: keyboardBottom = baseline − visualViewport.height.
  //   No modo adjustResize, innerHeight/clientHeight encolhem com o teclado e
  //   uma sonda fixed-bottom sobe junto (retorna ~0); no overlay o vv encolhe.
  //   A referência fixa funciona nos DOIS modos. Só a rotação de tela redefine.
  const baselineRef = useRef(0);

  useEffect(() => {
    const refreshBaseline = () => {
      baselineRef.current = Math.max(
        baselineRef.current,
        document.documentElement?.clientHeight || 0,
        window.innerHeight || 0
      );
    };
    refreshBaseline();
    window.addEventListener('resize', refreshBaseline);
    const onOrient = () => {
      baselineRef.current = 0;
      requestAnimationFrame(refreshBaseline);
    };
    window.addEventListener('orientationchange', onOrient);
    return () => {
      window.removeEventListener('resize', refreshBaseline);
      window.removeEventListener('orientationchange', onOrient);
    };
  }, []);

  // Barra de digitação FLUTUANTE (por cima do teclado) — ref para o input e
  // para a detecção de clique fora.
  const composerRef = useRef<HTMLDivElement>(null);
  // Barra principal FIXA no fundo — é o gatilho que abre o composer.
  const triggerBarRef = useRef<HTMLElement>(null);

  // 📱 VirtualKeyboard API — NÃO usar overlaysContent.
  //   O viewport meta tag já define interactive-widget=resizes-content, que faz
  //   o browser redimensionar o viewport nativamente quando o teclado abre.
  //   O rAF loop abaixo só atualiza --app-height para containers que usam a
  //   variável CSS (ex.: MessagesScreen).

  // 🎯 Sync do container do app com a Visual Viewport:
  //   Atualiza --app-height enquanto o composer está aberto para containers
  //   que dependem dessa variável CSS. NÃO move a barra nem o layout.
  useEffect(() => {
    if (!isComposerOpen) return;
    let raf = 0;
    const sync = () => {
      const vv = window.visualViewport;
      if (vv) {
        const h = Math.round(vv.height);
        document.documentElement.style.setProperty('--app-height', `${h}px`);
      }
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [isComposerOpen]);

  // 📏 Mede a altura do teclado enquanto o composer está aberto. Usa rAF (sem
  // interval de 200ms — que causava o atraso/engasgo ao fechar). Usado SOMENTE
  // para posicionar a barra de digitação flutuante no topo do teclado. NÃO
  // move a barra principal nem a sala.
  useEffect(() => {
    if (!isComposerOpen) return;

    const measure = () => {
      // 🎬 Já está fechando: congela a medição — o bottom está animando p/ 0.
      if (closingRef.current) return;

      const vv = window.visualViewport;
      const baseline = baselineRef.current || window.innerHeight || 0;

      // ── FONTES DE MEDIDA (em ordem de precisão) ──

      // 1) VirtualKeyboard API (Chrome 94+): boundingRect.height = altura real
      const nav = navigator as any;
      const rectH = nav?.virtualKeyboard?.boundingRect?.height;

      // 2) visualViewport: baseline − vv.height (funciona em overlay E adjustResize)
      let vvH = Math.max(0, Math.round(baseline - (vv ? vv.height : baseline)));

      // 3) 🔬 SONDAS: mede onde um `position:fixed;bottom:0` realmente termina
      //    no DOM — funciona em TODOS os modos de teclado, incluindo WebViews
      //    que não disparam eventos do visualViewport.
      const probeBottom = getKeyboardProbeBottom();
      const vvHeight = vv ? vv.height : baseline;
      const probeOffset = Math.max(0, Math.round(probeBottom - vvHeight));

      // Escolhe a melhor medida disponível.
      let kbH = 0;
      if (typeof rectH === 'number' && rectH > 0) {
        kbH = Math.round(rectH);           // VirtualKeyboard API — mais precisa
      } else if (probeOffset > 2) {
        kbH = probeOffset;                 // Sonda real — funciona em TODO caso
      } else if (vvH > 2) {
        kbH = vvH;                         // visualViewport fallback
      } else if (lastKnownKeyboardH > 0) {
        kbH = lastKnownKeyboardH;          // Cache: chute inicial nos primeiros frames
      }

      const MAX = Math.round(baseline * 0.6);
      const next = Math.min(kbH, MAX);

      // 🎬 Teclado SUMIU (vv voltou ao baseline) mas ainda "aberto": teclado
      // fechou por conta própria (ex.: gesto do sistema). Fecha o composer
      // sincronizado — sem esperar interação do usuário.
      if (next <= 2 && lastKbRef.current > 60) {
        closeRef.current?.();
        return;
      }
      lastKbRef.current = next;
      // Salva no cache para futuras aberturas.
      persistKeyboardHeight(next);
      setKeyboardBottom((prev) => (Math.abs(prev - next) > 2 ? next : prev));
    };

    // rAF loop: reage ao teclado em TODO frame — sem atraso de interval.
    let raf = 0;
    const loop = () => {
      measure();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const nav = navigator as any;
    const vk = nav?.virtualKeyboard;
    vk?.addEventListener?.('geometrychange', measure);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', measure);
    vv?.addEventListener('scroll', measure);

    // ⚠️ Fallback: WebViews/PWA que não disparam eventos do visualViewport
    // de forma confiável. Recomputar com delay quando QUALQUER input ganha/perde foco.
    const timers: number[] = [];
    const recomputeLate = () => {
      timers.push(window.setTimeout(measure, 100));
      timers.push(window.setTimeout(measure, 300));
      timers.push(window.setTimeout(measure, 500));
    };
    document.addEventListener('focus', recomputeLate, true);
    document.addEventListener('blur', recomputeLate, true);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
      vv?.removeEventListener('resize', measure);
      vv?.removeEventListener('scroll', measure);
      vk?.removeEventListener?.('geometrychange', measure);
      document.removeEventListener('focus', recomputeLate, true);
      document.removeEventListener('blur', recomputeLate, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComposerOpen]);

  const openComposer = useCallback(() => {
    // 🎬 Reabertura durante o fechamento: cancela o fechamento pendente.
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    closingRef.current = false;
    setIsClosing(false);

    // Captura a referência ANTES de focar → teclado ainda fechado (tela cheia).
    baselineRef.current = Math.max(
      baselineRef.current,
      document.documentElement?.clientHeight || 0,
      window.innerHeight || 0
    );
    // 🎯 Se já temos altura cacheada do teclado, antecipa o posicionamento da
    //    barra — evita o flash de "barra no fundo" nos primeiros frames.
    if (lastKnownKeyboardH > 0) {
      setKeyboardBottom(lastKnownKeyboardH);
    }
    setIsComposerOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          composerInputRef.current?.focus({ preventScroll: true } as any);
        } catch {
          composerInputRef.current?.focus();
        }
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    });
  }, []);

  // 🎬 Fluxo de fechamento: desce a barra JUNTO com o teclado.
  //   1) marca fechando (barra continua montada);
  //   2) blur no input → teclado inicia a descida AGORA;
  //   3) keyboardBottom → 0 com transição CSS de ~240ms → barra desce sincronizada;
  //   4) desmonta (isComposerOpen=false) após a animação.
  const closeComposer = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);

    // 1️⃣ Blur imediato: o teclado começa a descer no MESMO frame do clique.
    const el = composerInputRef.current as HTMLElement | null;
    try {
      el?.blur?.();
    } catch { /* noop */ }

    // 2️⃣ Barra desce junto: keyboardBottom → 0 (a transição CSS `bottom` faz
    //     a animação; a duração casa com a do teclado ~240ms).
    lastKbRef.current = 0;
    setKeyboardBottom(0);

    // 3️⃣ Desmonta DEPOIS da descida — nunca antes (era isso que fazia a barra
    //     sumir de repente ou ficar enganchada parada no ar).
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      closingRef.current = false;
      setIsClosing(false);
      setIsComposerOpen(false);
      setKeyboardBottom(0);
    }, CLOSE_ANIM_MS);
  }, []);

  // Expõe o closeComposer ao rAF (que rola antes dele existir neste escopo).
  useEffect(() => {
    closeRef.current = closeComposer;
  }, [closeComposer]);

  // Cancela o fechamento pendente na desmontagem do hook.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // 🛡️ Watchdog anti-pan: mantém scroll zero enquanto o composer está aberto.
  useEffect(() => {
    if (!isComposerOpen) return;

    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    const check = () => {
      if (window.scrollY > 0 || document.documentElement.scrollTop > 0 || document.body.scrollTop > 0) {
        resetScroll();
      }
    };

    window.addEventListener('scroll', check, { passive: true, capture: true });
    document.addEventListener('scroll', check, { passive: true, capture: true });
    const fallback = window.setInterval(check, 300);

    return () => {
      window.removeEventListener('scroll', check, { capture: true } as any);
      document.removeEventListener('scroll', check, { capture: true } as any);
      window.clearInterval(fallback);
    };
  }, [isComposerOpen]);

  // Fechar ao tocar FORA da barra principal e da barra flutuante — o clique no
  // meio da tela cai aqui e aciona o mesmo fluxo sincronizado de fechamento.
  useEffect(() => {
    if (!isComposerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const inFloating = composerRef.current?.contains(target);
      const inTrigger = triggerBarRef.current?.contains(target);
      if (!inFloating && !inTrigger) {
        closeComposer();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isComposerOpen, closeComposer]);

  return {
    isComposerOpen: isComposerOpen || isClosing,
    isClosing,
    openComposer,
    closeComposer,
    composerInputRef,
    composerRef,
    triggerBarRef,
    keyboardBottom,
  };
}
