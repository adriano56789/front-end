// Token Storage utilities - APENAS BANCO DE DADOS
// ELIMINADO TODO ARMAZENAMENTO LOCAL

interface TokenStorageInterface {
  getToken: () => Promise<string | null>;
  setToken: (token: string) => Promise<void>;
  removeToken: () => Promise<void>;
}

// Implementação que usa APENAS MEMÓRIA (SEM LOCALSTORAGE)
class DatabaseTokenStorage implements TokenStorageInterface {
  async getToken(): Promise<string | null> {
    try {
      // Usar o sistema de token do api.ts que está em memória
      const { getAuthToken } = await import('../../services/api');
      return getAuthToken();
    } catch (error) {
      console.error('Erro ao buscar token:', error);
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      // Usar o sistema de token do api.ts que está em memória
      const { setAuthToken } = await import('../../services/api');
      setAuthToken(token);
    } catch (error) {
      console.error('Erro ao salvar token:', error);
    }
  }

  async removeToken(): Promise<void> {
    try {
      // Usar o sistema de token do api.ts que está em memória
      const { removeAuthToken } = await import('../../services/api');
      removeAuthToken();
    } catch (error) {
      console.error('Erro ao remover token:', error);
    }
  }
}

// Mobile implementation (to be implemented in native code)
class MobileTokenStorage implements TokenStorageInterface {
  async getToken(): Promise<string | null> {
    try {
      // For React Native - would use @react-native-async-storage/async-storage
      // For native mobile - would call native module
      if (typeof window !== 'undefined' && (window as any).ReactNative) {
        return await (window as any).ReactNative.AsyncStorage.getItem('token');
      }
      
      // For WebView bridge - call native method
      if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.nativeApp) {
        return new Promise((resolve) => {
          (window as any).webkit.messageHandlers.nativeApp.postMessage({
            type: 'getToken'
          });
          
          // Listen for response
          const handleMessage = (event: any) => {
            if (event.data.type === 'tokenResponse') {
              window.removeEventListener('message', handleMessage);
              resolve(event.data.token);
            }
          };
          window.addEventListener('message', handleMessage);
          
          // Timeout fallback
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve(null);
          }, 1000);
        });
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter token do storage mobile:', error);
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).ReactNative) {
        await (window as any).ReactNative.AsyncStorage.setItem('token', token);
      }
      
      if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.nativeApp) {
        (window as any).webkit.messageHandlers.nativeApp.postMessage({
          type: 'setToken',
          token: token
        });
      }
    } catch (error) {
      console.error('Erro ao salvar token no storage mobile:', error);
    }
  }

  async removeToken(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).ReactNative) {
        await (window as any).ReactNative.AsyncStorage.removeItem('token');
      }
      
      if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.nativeApp) {
        (window as any).webkit.messageHandlers.nativeApp.postMessage({
          type: 'removeToken'
        });
      }
    } catch (error) {
      console.error('Erro ao remover token do storage mobile:', error);
    }
  }
}

// Auto-detect e usar apenas storage do banco de dados
class TokenStorageManager {
  private storage: TokenStorageInterface;

  constructor() {
    // USAR APENAS BANCO DE DADOS
    this.storage = new DatabaseTokenStorage();
  }

  async getToken(): Promise<string | null> {
    return await this.storage.getToken();
  }

  async setToken(token: string): Promise<void> {
    await this.storage.setToken(token);
  }

  async removeToken(): Promise<void> {
    await this.storage.removeToken();
  }
}

// Singleton instance
const tokenStorage = new TokenStorageManager();

// Export convenience functions
export const getAuthToken = async (): Promise<string | null> => {
  return await tokenStorage.getToken();
};

export const setAuthToken = async (token: string): Promise<void> => {
  await tokenStorage.setToken(token);
};

export const removeAuthToken = async (): Promise<void> => {
  await tokenStorage.removeToken();
};

// Para backward compatibility - APENAS BANCO DE DADOS
export const getAuthTokenSync = (): string | null => {
  console.warn('⚠️ getAuthTokenSync removido - use apenas getAuthToken() para buscar do banco');
  return null;
};

export default tokenStorage;
