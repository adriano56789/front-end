import { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyboardInset } from './useKeyboardInset';

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
export function useComposerKeyboard() {
  const { inset: keyboardInset, fixedBottom } = useKeyboardInset();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const openComposer = useCallback(() => {
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
  useEffect(() => {
    if (!isComposerOpen) return;
    let raf = 0;
    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    const check = () => {
      const vv = window.visualViewport;
      if ((vv && vv.offsetTop > 0) || window.scrollY > 0 || document.documentElement.scrollTop > 0 || document.body.scrollTop > 0) {
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
  const bottom = fixedBottom;

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
    bottom,
  };
}
