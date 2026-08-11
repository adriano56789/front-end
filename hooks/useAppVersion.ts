// 🔄 Verificação de versão do app: a cada deploy o servidor ganha um novo
// version.json (número de versão). Este hook compara com a versão já aberta no
// aparelho (localStorage) e avisa quando existe uma atualização disponível.
// A checagem roda ao entrar no app, ao focar a aba e a cada 60s.
import { useState, useEffect } from 'react';

const VERSION_KEY = 'livego_version';
const CHECK_INTERVAL = 60000;

interface VersionInfo {
    version: string;
    buildTime?: string;
}

async function fetchVersion(): Promise<VersionInfo | null> {
    try {
        // Cache-busting para nunca ler um version.json antigo do cache do navegador
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export function useAppVersion() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [latestVersion, setLatestVersion] = useState('');

    const check = async () => {
        const info = await fetchVersion();
        if (!info || !info.version) return;

        setLatestVersion(info.version);
        const stored = localStorage.getItem(VERSION_KEY);

        // Primeira visita: registra a versão atual como base, sem mostrar modal.
        if (!stored) {
            localStorage.setItem(VERSION_KEY, info.version);
            return;
        }

        if (stored !== info.version) {
            // Guarda a versão nova já para não reabrir o modal após o reload.
            localStorage.setItem(VERSION_KEY, info.version);
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
