import { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyboardInset, getLastKnownKeyboardHeight, rememberKeyboardHeight } from './useKeyboardInset';

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
  const [composerFocused, setComposerFocused] = useState(false);
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

  // 🎯 Rastrear foco do composer: input focado = teclado abertamente aberto.
  // Serve para o fallback de altura (quando o WebView não reporta o teclado).
  useEffect(() => {
    if (!isComposerOpen) return;
    const el = composerRef.current;
    if (!el) return;
    const onFocusIn = (e: FocusEvent) => {
      if (el.contains(e.target as Node)) setComposerFocused(true);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node)) setComposerFocused(false);
    };
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    // Estado inicial: se o input já está focado (ex.: foco automático no open)
    if (el.contains(document.activeElement)) setComposerFocused(true);
    return () => {
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
    };
  }, [isComposerOpen]);

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

  // A posição do composer é SEMPRE o offset real medido pela sonda
  // (fixedBottom). Quando o teclado abre, o fixedBottom cresce de 0 até a
  // altura do teclado → a 2ª barra SOBE JUNTO com o teclado e para COLADA
  // nele, sem nunca passar da borda (nada de subir alto demais).
  // gluedBottom (cola-corretor acima) corrige quando a sonda falha/é 0:
  // usa o MAIOR dos dois — se o teclado encobrir a barra, o corretor manda
  // subir exatamente a diferença; se a sonda estiver certa, prevalece ela.
  //
  // 🛡️ FALLBACK GARANTIDO: em WebViews que NÃO reportam NENHUM sinal do
  // teclado (nem visualViewport.height nem innerHeight mudam — o teclado
  // abre por cima sem avisar), fixedBottom, gluedBottom e vkBottom ficam 0 e
  // a barra renderizaria em bottom:0, ESCONDIDA ATRÁS do teclado. Se o input
  // do composer está FOCADO (teclado abertamente aberto) e não há NENHUMA
  // medição real, usamos a altura TÍPICA de teclado — PREFERINDO a última
  // altura medida no aparelho (cache localStorage) e, sem cache, ~38% da
  // tela (mais conservador que 42%: chute alto demais = barra FLUTUANDO com
  // folga; chute baixo = só a base coberta, o resto visível e colado).
  // ⚠️ iOS NÃO entra aqui: lá o navegador auto-sobe a barra (inset > 0), então
  // empurrar de novo deixaria a barra alta demais.
  const lastKnown = getLastKnownKeyboardHeight();
  // 🔧 Fallback mais baixo (30% em vez de 38%): chute alto = barra flutuando
  // longe do teclado ("abrir mais baixo" — pedido do usuário). Chute baixo só
  // cobre a base, o resto fica visível e colado.
  const keyboardEstimate =
    lastKnown > 0 ? Math.round(lastKnown * 0.9) : Math.round(window.innerHeight * 0.32);
  // 🧲 Posição final da 2ª barra, em ordem de confiabilidade:
  //   1. VirtualKeyboard API (altura EXATA, quando o aparelho suporta)
  //   2. Sonda real / cola-corretor: se AMBOS mediram >0, vale o MENOR dos
  //      dois — o menor é o que NÃO passa da borda do teclado (barra nunca
  //      "flutua" alta demais com folga); se só um mediu, usa ele.
  //   3. Fallback estimado (último recurso)
  // ⚠️ O clamp de segurança (não passar do topo da tela) só se aplica ao
  // FALLBACK ESTIMADO — as medições reais (vkBottom/fixedBottom/gluedBottom)
  // são ground truth e NUNCA são clampeadas (clampar contra um innerHeight
  // que pode encolher em WebView resizes-content empurraria a barra para
  // trás do teclado — o bug original).
  const bothMeasured = fixedBottom > 0 && gluedBottom > 0;
  const measured = vkBottom > 0
    ? vkBottom
    : bothMeasured
      ? Math.min(fixedBottom, gluedBottom)
      : Math.max(fixedBottom, gluedBottom);
  const fallbackBottom =
    isComposerOpen &&
    composerFocused &&
    measured === 0 &&
    keyboardInset === 0
      ? Math.min(
          keyboardEstimate,
          Math.max(0, window.innerHeight - COMPOSER_BAR_HEIGHT - 12)
        )
      : 0;
  const rawBottom = measured > 0 ? measured : fallbackBottom;
  // 🛡️ CAP: nunca subir mais que 34% da tela — teclados típicos têm 25–32%;
  // o cap antigo (42%) deixava a barra "flutuar" alto demais quando o
  // WebView/VK reporta uma altura exagerada do teclado.
  const bottom = Math.min(rawBottom, Math.round(window.innerHeight * 0.38));

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
