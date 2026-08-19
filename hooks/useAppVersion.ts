// 🔄 Verificação de versão do app: a cada deploy o servidor ganha um novo
// version.json (número de versão). Este hook compara com a versão já aberta no
// aparelho (localStorage) e avisa quando existe uma atualização disponível.
// A checagem roda ao entrar no app, ao focar a aba e a cada 60s.
//
// 🔧 ANTIGO BUG: o localStorage era gravado com a versão nova ANTES do usuário
// atualizar. Se a página recarregava por qualquer outro motivo (auto-reload do
// Service Worker, crash, usuário no fundo da aba), a versão "nova" já estava
// salva → o modal NUNCA reaparecia e o usuário ficava preso na versão antiga.
//
// NOVO COMPORTAMENTO:
//   • detectou diferença → mostra o modal, MAS NÃO mexe no localStorage.
//   • "Atualizar agora" → marca um flag no sessionStorage e recarrega.
//   • no carregamento com o flag → grava a versão nova no localStorage
//     (agora o build novo está mesmo rodando) e limpa o flag → sem re-modal.
//   • qualquer reload SEM o flag mantém o modal ativo (não deixa escapar
//     para uma versão velha em silêncio).
import { useState, useEffect } from 'react';
import { api } from '../services/api';

const VERSION_KEY = 'livego_version';
const RELOAD_FLAG = 'livego_reload_flag';
const CHECK_INTERVAL = 60000;

interface VersionInfo {
    version: string;
    buildTime?: string;
}

// 🔄 Busca a versão SEMPRE pelo api.ts (nenhum fetch direto fora dele).
async function fetchVersion(): Promise<VersionInfo | null> {
    return api.getAppVersion();
}

export function useAppVersion() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [latestVersion, setLatestVersion] = useState('');

    const check = async () => {
        const info = await fetchVersion();
        if (!info || !info.version) return;

        setLatestVersion(info.version);

        // Acabamos de clicar em "Atualizar agora" e a página recarregou: agora sim
        // o build novo está rodando → registra a versão atual e não mostra o modal.
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(RELOAD_FLAG)) {
            sessionStorage.removeItem(RELOAD_FLAG);
            localStorage.setItem(VERSION_KEY, info.version);
            setUpdateAvailable(false);
            return;
        }

        const stored = localStorage.getItem(VERSION_KEY);

        // Primeira visita: registra a versão atual como base, sem mostrar modal.
        if (!stored) {
            localStorage.setItem(VERSION_KEY, info.version);
            return;
        }

        if (stored !== info.version) {
            // ⚠️ NÃO gravar localStorage aqui — só mostrar o modal. A gravação só
            // acontece depois do reload intencional (ver flag acima). Assim, se o
            // reload vier de outra origem (SW/crash), o modal volta a aparecer.
            setUpdateAvailable(true);
        }
    };

    useEffect(() => {
        check();
        const id = setInterval(check, CHECK_INTERVAL);
        const onVisible = () => {
            if (document.visibilityState === 'visible') check();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, []);

    return { updateAvailable, latestVersion };
}

// Exportado para o modal poder marcar o flag antes do reload.
export function markVersionReloadFlag(): void {
    try {
        sessionStorage.setItem(RELOAD_FLAG, '1');
    } catch {
        // sessionStorage indisponível (modo privado) — sem flag, ok
    }
}
