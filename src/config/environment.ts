export interface EnvironmentConfig {
  apiBaseUrl: string;
  wsUrl: string;
  domain: string;
  useHttps: boolean;
  useRealApis: boolean;
  srs: {
    host: string;
    rtmpPort: number;
    rtcPort: number;
    httpPort: number;
    apiPort: number;
  };
}

export const detectEnvironment = (): EnvironmentConfig => {
  const isProd = import.meta.env.PROD;
  const useRealApis = import.meta.env.VITE_USE_REAL_APIS !== 'false';

  // Em produção, usa a URL completa.
  // Em desenvolvimento com APIs reais, usa caminhos relativos para o Vite Proxy.
  // Em desenvolvimento local, usa o localhost:3000.
  let apiBaseUrl = '';

  if (isProd) {
    apiBaseUrl = window.location.origin;
  } else if (useRealApis) {
    // IMPORTANTE: Deixa vazio para usar o Proxy do Vite configurado em vite.config.ts
    // Isso evita erros de CORS pois o navegador acha que a API é local.
    apiBaseUrl = window.location.origin;
  } else {
    apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  }

  return {
    apiBaseUrl,
    wsUrl: apiBaseUrl,
    domain: 'livego.store',
    useHttps: isProd || useRealApis,
    useRealApis: isProd || useRealApis,
    srs: {
      host: import.meta.env.VITE_SRS_HOST || ((isProd || useRealApis) ? 'livego.store' : 'localhost'),
      rtmpPort: 1935,
      rtcPort: 8000,
      httpPort: 8080,
      apiPort: 1985,
    }
  };
};

// Configuração atual do ambiente
export const env = detectEnvironment();

export default env;
