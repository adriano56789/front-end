import { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyboardInset, rememberKeyboardHeight } from './useKeyboardInset';

/**
 * ⌨️ Composer de mensagem "TikTok-style":
 *   - A 1ª barra de mensagem fica TOTALMENTE FIXA no fundo (nunca sobe).
 *   - Ao tocar nela, abre uma 2ª barra (composer) que SOBE JUNTO com o teclado
 *     e para COLADA nele; a 1ª continua parada.
 *
 * ⚠️ A posição da 2ª barra é SEMPRE o `fixedBottom` medido pela 🔬 sonda do
 * useKeyboardInset (onde um `fixed bottom:0` REALMENTE termina naquele
 * aparelho). Assim a barra nunca passa da borda do teclado ("sobe alto
 * demais") nem fica coberta. O focus usa `preventScroll` + watchdog para o
 * navegador não fazer "pan" da página inteira (que fazia a 1ª barra subir).
 */

// Altura do composer aberto (input + padding).
export const COMPOSER_BAR_HEIGHT = 56;

// Altura da 1ª barra fechada (input + enviar + presente + roleta + 3pts + padding).
export const MESSAGE_BAR_HEIGHT = 72;

export function useComposerKeyboard() {
  const { inset: keyboardInset, fixedBottom } = useKeyboardInset();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [gluedBottom, setGluedBottom] = useState(0);
  const [vkBottom, setVkBottom] = useState(0);
  // 📝 any = o mesmo ref atende <input> (ChatScreen/PK) e <textarea>
  // (StreamRoom — campo "Diga oi" quebra linha em várias linhas).
  const composerInputRef = useRef<any>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // 📱 VirtualKeyboard API (Android WebView/Chrome 94+): dá a altura EXATA do
  // teclado via `boundingRect` — mesmo em WebViews que NÃO reportam o
  // visualViewport (o caso em que a barra ficava FLUTUANDO: a estimativa de
  // ~42% chutava alto demais e sobrava folga entre a barra e o teclado).
  // Também força `overlayContent = true`: o teclado fica POR CIMA da tela
  // (sem encolher o layout) garantido por API, igual ao meta
  // `interactive-widget=overlays-content`.
  useEffect(() => {
    const nav = navigator as any;
    const vk = nav?.virtualKeyboard;
    if (!vk) return;
    try {
      vk.overlayContent = true;
      const onGeometry = () => {
        const h = Math.round(Number(vk?.boundingRect?.height) || 0);
        setVkBottom((prev) => (prev === h ? prev : h));
      };
      vk.addEventListener?.('geometrychange', onGeometry);
      onGeometry();
      return () => vk.removeEventListener?.('geometrychange', onGeometry);
    } catch {
      // API indisponível — seguem as demais camadas (sonda, cola-corretor, fallback)
    }
  }, []);

  // 🔧 COLA-CORRETOR da 2ª barra: em alguns WebViews a sonda/visualViewport
  // não reporta a altura do teclado (ou reporta 0) → a barra renderiza em
  // bottom:0 e fica ESCONDIDA ATRÁS do teclado (só o teclado aparece).
  // Solução definitiva: enquanto o composer está aberto, calcular a altura
  // EXATA do teclado a cada frame como `layoutHeight − visibleHeight` e colar
  // a barra nela. Isso ajusta para cima E para baixo sem oscilar (a altura é
  // estável, não é um latch que só sobe — se a estimativa veio alta demais, a
  // barra desce até encostar exatamente no teclado).
  //   - Android (teclado por cima): visibleHeight < layout → sobe colada ✓
  //   - iOS (navegador auto-sobe): visibleHeight = layout → 0 → não mexe ✓
  // Usa o MENOR entre visualViewport.height e window.innerHeight (o sinal que
  // cada WebView reporta pode ser um dos dois).
  useEffect(() => {
    if (!isComposerOpen) return;
    let raf = 0;
    const glue = () => {
      const vv = window.visualViewport;
      // 🔧 Conservador: usa o MENOR entre clientHeight e innerHeight como
      // altura de layout — se um dos dois vier inflado (WebView bugado),
      // chutar alto deixava a barra FLUTUANDO acima do teclado (reclamação:
      // "teclado tem que abrir mais baixo"). Menor = barra mais baixa/colada.
      const ch = document.documentElement?.clientHeight || 0;
      const ih = window.innerHeight || 0;
      const layoutH = Math.min(ch > 0 ? ch : Infinity, ih > 0 ? ih : Infinity);
      const visibleH = Math.min(vv ? vv.height : Infinity, ih > 0 ? ih : Infinity);
      const keyboardH = Math.max(0, layoutH - visibleH);
      if (keyboardH > 0) rememberKeyboardHeight(keyboardH);
      setGluedBottom((prev) => (Math.abs(prev - keyboardH) > 2 ? keyboardH : prev));
      raf = requestAnimationFrame(glue);
    };
    raf = requestAnimationFrame(glue);
    return () => cancelAnimationFrame(raf);
  }, [isComposerOpen]);

  // 🎯 O input do composer é referenciado via composerInputRef para foco
  // (openComposer) — sem estado de foco próprio: a posição da barra vem SEMPRE
  // da sonda real (fixedBottom) + cola-corretor, que medem o teclado de fato.

  const openComposer = useCallback(() => {
    setGluedBottom(0); // 🔧 novo ciclo: re-mede a posição do teclado
    setIsComposerOpen(true);
    // Foco com rAF duplo: garante que o composer já pintou na posição certa
    // antes de abrir o teclado por baixo (sem lag, sem pular por cima do vídeo).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          // 🚫 preventScroll: IMPEDE o navegador de rolar/pan a página para
          // "revelar" o input. É isso que fazia a 1ª barra subir junto.
          composerInputRef.current?.focus({ preventScroll: true } as any);
        } catch {
          composerInputRef.current?.focus();
        }
        // Backup anti-pan: garante scroll zero mesmo se o preventScroll falhar.
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
    });
  }, []);

  const closeComposer = useCallback(() => {
    setIsComposerOpen(false);
  }, []);

  // 🛡️ Watchdog anti-pan: enquanto o composer está aberto, cancela QUALQUER
  // pan/scroll que o navegador fizer ao focar o input no fundo da tela
  // (mobile). A página é overflow:hidden e o container é fixed no topo, então
  // voltar o scroll para 0 garante que a 1ª barra nunca sai do lugar.
  // ⚠️ NÃO usar vv.offsetTop aqui: no iOS ele fica >0 com o teclado aberto e
  // resetar o scroll a cada frame briga com o pan do navegador → a barra
  // sobe e desce (bounce). Só resetamos scroll de LAYOUT (scrollY).
  useEffect(() => {
    if (!isComposerOpen) return;
    let raf = 0;
    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    const check = () => {
      if (window.scrollY > 0 || document.documentElement.scrollTop > 0 || document.body.scrollTop > 0) {
        resetScroll();
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [isComposerOpen]);

  // 🧲 Posição final da 2ª barra (composer). Com o viewport
  // `interactive-widget=overlays-content` o teclado fica SOBRE o conteúdo e um
  // `fixed bottom:0` NÃO é auto-sobido pelo navegador — a barra precisa subir
  // EXATAMENTE a altura real do teclado pra ficar VISÍVEL (senão o teclado a
  // COBRE: "teclado abre em cima da barra de mensagem").
  // Todas as medidas abaixo representam essa altura (≈ altura do teclado):
  //   1. vkBottom      — VirtualKeyboard API (altura EXATA, quando suporta)
  //   2. fixedBottom   — 🔬 sonda real: quanto um `fixed bottom:0` fica ATRÁS
  //                      do teclado. **0 = o navegador JÁ auto-sobe o elemento
  //                      acima do teclado** (iOS resizes-content) → bottom:0
  //                      é o bastante; levantar de novo = sobe em dobro.
  //   3. gluedBottom   — cola-corretor (layoutHeight − visibleHeight), seguro
  //                      p/ WebViews em que a sonda/vk não reportam direito.
  // ✅ Usamos o MÁXIMO dos sinais (>0): o que falhar, o maior que sobrou ainda
  //    LEVANTA a barra — o teclado NUNCA cobre o campo.
  // ⚠️ keyboardInset FICA **FORA** do cálculo do bottom: é a altura BRUTA do
  //    teclado, e em iOS o navegador já compensa sozinho — somar de novo deixa
  //    a barra flutuando com folga acima do teclado (dupla compensação, o
  //    sintoma "a barra sobe junto com o teclado"). A sonda (fixedBottom) é a
  //    verdade de posicionamento e vale 0 exatamente nesse cenário.
  // O cap de 60% da tela guarda só contra uma medição completamente quebrada.
  const MAX_KEYBOARD_RATIO = 0.60;
  const maxKB = Math.round(window.innerHeight * MAX_KEYBOARD_RATIO);
  const reliableMeasures = [
    vkBottom,
    fixedBottom,
    gluedBottom,
  ].filter((v) => v > 0);
  const bottom = reliableMeasures.length
    ? Math.min(Math.max(...reliableMeasures), maxKB)
    : 0;

  // Offsets do CHAT quando o composer está aberto:
  //  - chatInset: quanto a lista de mensagens precisa subir para a ÚLTIMA
  //    mensagem parar EXATAMENTE acima da barra (nada de texto atrás dela).
  //    Usa o MESMO valor corrigido (max com gluedBottom) para a lista parar
  //    acima do composer colado no teclado, não em cima dele.
  //  - keyboardInset (mantido p/ compat): altura bruta do teclado.
  const chatInset = bottom + COMPOSER_BAR_HEIGHT;

  // Fechar o composer ao tocar em qualquer lugar fora dele (vídeo, fundo, etc.)
  useEffect(() => {
    if (!isComposerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        closeComposer();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isComposerOpen, closeComposer]);

  return {
    isComposerOpen,
    openComposer,
    closeComposer,
    composerInputRef,
    composerRef,
    keyboardInset,
    chatInset,
    bottom,
  };
}
