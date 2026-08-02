import { useEffect, useState } from 'react';

/**
 * useKeyboardInset — rastreia o teclado virtual via window.visualViewport
 * e retorna a altura em px que o teclado ocupa na parte inferior da tela.
 *
 * O mesmo padrão usado por apps de chat (WhatsApp/TikTok): a barra de envio
 * fica ancorada logo acima do teclado, em vez de "subir"/pular quando o
 * input recebe foco. Retorna 0 quando o teclado está fechado (ou no desktop).
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      setInset(0);
      return;
    }

    const compute = () => {
      // Área visível (visual viewport) termina em offsetTop + height.
      // A diferença até o fim do layout viewport = teclado / chrome do browser.
      const visibleBottom = vv.offsetTop + vv.height;
      const next = Math.max(0, window.innerHeight - visibleBottom);
      setInset((prev) => (prev === next ? prev : next));
    };

    vv.addEventListener('resize', compute);
    vv.addEventListener('scroll', compute);
    window.addEventListener('resize', compute);
    compute();

    return () => {
      vv.removeEventListener('resize', compute);
      vv.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, []);

  return inset;
}
