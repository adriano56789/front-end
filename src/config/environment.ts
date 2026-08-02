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

  let apiBaseUrl = window.location.origin;

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
