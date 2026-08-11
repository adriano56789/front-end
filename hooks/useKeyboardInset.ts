import { useEffect, useState } from 'react';

// Cache da ÚLTIMA altura real do teclado (o mesmo aparelho costuma ter sempre
// a mesma altura) — usado pela sequência de abertura TikTok-style: o campo de
// mensagem sobe PRIMEIRO até essa altura e só depois o teclado abre por baixo.
let lastKnownKeyboardH = 0;
export function getLastKnownKeyboardHeight(): number {
  return lastKnownKeyboardH;
}

/**
 * useKeyboardInset — rastreia o teclado virtual via window.visualViewport
 * e retorna a altura em px que o teclado ocupa na parte inferior da tela.
 * Retorna 0 quando o teclado está fechado (ou no desktop).
 *
 * 🔑 Duas medidas:
 *
 * 1. `inset` = altura REAL do teclado em px:
 *      inset = max(0, maxLayoutRef − vv.height)
 *    `maxLayoutRef` é o LAYOUT viewport real (maior valor já visto), travado
 *    enquanto UM INPUT ESTÁ FOCADO (teclado aberto/abrindo) e re-sincronizado
 *    quando o foco sai. Usado para: rolar até a última mensagem, subir o chat
 *    da live e empurrar a 1ª barra para baixo quando o composer está aberto.
 *
 * 2. `fixedBottom` = quanto um elemento `position: fixed; bottom:X` precisa
 *    subir para ficar COLADO no teclado. ⚠️ Não é sempre a altura do teclado:
 *    dependendo do navegador/modo (`resizes-visual` vs `resizes-content` /
 *    iOS, que auto-sobe elementos fixos), um `fixed bottom:0` termina
 *    DEBAIXO ou ACIMA do teclado. Para não errar, usamos uma 🔬 SONDA REAL:
 *    um div oculto `position:fixed; bottom:0` e medimos onde ele TERMINA
 *    (getBoundingClientRect). Assim:
 *      - navegador não auto-sobe (resizes-visual): sonda fica no fundo do
 *        layout (atrás do teclado) → fixedBottom = altura do teclado ✓
 *      - navegador auto-sobe (resizes-content / iOS): sonda termina no fundo
 *        visível (acima do teclado) → fixedBottom = 0 ✓
 *    SEM heurística e SEM risco de barra subir em dobro ("muito alto").
 */
export interface KeyboardInsetState {
  inset: number;
  fixedBottom: number;
}

// 🔬 Sonda: div oculto `fixed bottom:0` que mede onde o navegador coloca
// elementos fixos naquele aparelho (ground truth, funciona em TODO modo).
let probe: HTMLDivElement | null = null;
function getProbeBottom(): number {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;left:0;bottom:0;width:1px;height:1px;visibility:hidden;pointer-events:none;z-index:-1;';
    document.body.appendChild(probe);
  }
  return probe.getBoundingClientRect().bottom;
}

export function useKeyboardInset(): KeyboardInsetState {
  const [state, setState] = useState<KeyboardInsetState>({ inset: 0, fixedBottom: 0 });

  useEffect(() => {
    const vv = window.visualViewport;

    const isInputFocused = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable ||
        el.getAttribute?.('contenteditable') === 'true'
      );
    };

    // Cache do LAYOUT viewport completo: só cresce enquanto um input está
    // focado (teclado abrindo), e re-sincroniza quando o foco sai (fechou).
    let maxLayoutRef = Math.max(
      document.documentElement?.clientHeight || 0,
      window.innerHeight || 0
    );

    const compute = () => {
      if (!vv) {
        setState({ inset: 0, fixedBottom: 0 });
        return;
      }
      const cur = Math.max(
        document.documentElement?.clientHeight || 0,
        window.innerHeight || 0
      );
      if (isInputFocused()) {
        maxLayoutRef = Math.max(maxLayoutRef, cur);
      } else {
        maxLayoutRef = cur;
      }
      // Altura real do teclado = layout completo − área realmente visível.
      // (NÃO usar vv.offsetTop: o pan/auto-scroll do navegador ao focar um
      // input no fundo "absorveria" a altura do teclado e daria 0 — o campo
      // ficaria coberto. O app usa containers fixos; o layout não rola.)
      const inset = Math.max(0, maxLayoutRef - Math.min(cur, vv.height));
      if (inset > 0) lastKnownKeyboardH = inset;
      // fixedBottom: onde a SONDA termina. Se termina abaixo do fundo visível
      // (navegador não auto-sobe → está atrás do teclado), o offset é a
      // distância até o fundo visível = altura do teclado. Se já termina no
      // fundo visível (auto-sobe), offset = 0. Sem heurística de modo/iOS.
      const fixedBottom = Math.max(0, Math.round(getProbeBottom() - vv.height));
      setState((prev) =>
        prev.inset === inset && prev.fixedBottom === fixedBottom
          ? prev
          : { inset, fixedBottom }
      );
    };

    if (vv) {
      vv.addEventListener('resize', compute);
      vv.addEventListener('scroll', compute);
    }
    window.addEventListener('resize', compute);

    // ⚠️ Fallback: alguns WebViews (PWA/embutidos) não disparam os eventos do
    // visualViewport de forma confiável. Recomputar também quando QUALQUER
    // input ganha/perde foco — o teclado abre/fecha junto com o foco.
    const timers: number[] = [];
    const recomputeLate = () => {
      timers.push(window.setTimeout(compute, 150));
      timers.push(window.setTimeout(compute, 450));
    };
    document.addEventListener('focus', recomputeLate, true);
    document.addEventListener('blur', recomputeLate, true);
    compute();

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      if (vv) {
        vv.removeEventListener('resize', compute);
        vv.removeEventListener('scroll', compute);
      }
      window.removeEventListener('resize', compute);
      document.removeEventListener('focus', recomputeLate, true);
      document.removeEventListener('blur', recomputeLate, true);
    };
  }, []);

  return state;
}
