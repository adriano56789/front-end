import { useCallback } from 'react';
import { useKeyboardInset } from './useKeyboardInset';

/**
 * ⌨️ Composer de chat — a barra de mensagem acompanha APENAS a altura REAL do
 * teclado (inset medido via visualViewport), com transição suave.
 *
 * NÃO usa "chute" de altura (ex.: subir 240px antes do teclado abrir): na live
 * tela cheia isso fazia a barra subir POR CIMA do vídeo. Agora a barra sobe
 * junto com o teclado, sempre colada, e nunca cobre mais do que o próprio
 * teclado cobre.
 */
export function useKeyboardRise(inputRef: React.RefObject<HTMLInputElement | null>) {
  const { inset: bottom } = useKeyboardInset();

  const open = useCallback(() => {
    // Focus com rAF duplo: garante que a barra já pintou no lugar do teclado
    // antes do teclado abrir por baixo (sem lag, sem pular por cima do vídeo).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    });
  }, [inputRef]);

  const close = useCallback(() => {
    inputRef.current?.blur();
  }, [inputRef]);

  return { bottom, open, close };
}
