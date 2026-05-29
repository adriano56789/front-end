/**
 * LiveGo Parameters Parser
 * Parse e gerencia parâmetros do LiveGo SDK (compatível Buzzcast)
 */

export interface LiveGoParams {
    sdkappid: string;
    instanceid: string;
    random: string;
    platform: number;
    host: string;
    version: string;
    sdkversion: string;
    compress: string;
}

export interface ParsedLiveGoParams extends LiveGoParams {
    parsed: boolean;
    timestamp: number;
    userAgent?: string;
    platformName?: string;
}

export class LiveGoParamsParser {
    
    /**
     * Parse string de parâmetros LiveGo
     * Ex: "sdkappid=1400088004&instanceid=3834c381d24967ebc17c100108144a5d&random=0.8651634999595761&platform=7&host=windows&version=-1&sdkversion=3.4.9&compress=gzip"
     */
    static parse(paramsString: string): ParsedLiveGoParams {
        const params = new URLSearchParams(paramsString);
        
        const parsed: ParsedLiveGoParams = {
            sdkappid: params.get('sdkappid') || '',
            instanceid: params.get('instanceid') || '',
            random: params.get('random') || '',
            platform: parseInt(params.get('platform') || '0'),
            host: params.get('host') || '',
            version: params.get('version') || '',
            sdkversion: params.get('sdkversion') || '',
            compress: params.get('compress') || '',
            parsed: true,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            platformName: this.getPlatformName(parseInt(params.get('platform') || '0'))
        };
        
        return parsed;
    }
    
    /**
     * Converter objeto para string de parâmetros
     */
    static stringify(params: Partial<LiveGoParams>): string {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.set(key, String(value));
            }
        });
        
        return searchParams.toString();
    }
    
    /**
     * Validar parâmetros obrigatórios
     */
    static validate(params: ParsedLiveGoParams): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!params.sdkappid) errors.push('sdkappid é obrigatório');
        if (!params.instanceid) errors.push('instanceid é obrigatório');
        if (!params.sdkversion) errors.push('sdkversion é obrigatório');
        if (params.platform < 1 || params.platform > 10) errors.push('platform inválido');
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Obter nome do platform baseado no código
     */
    private static getPlatformName(platform: number): string {
        const platforms: { [key: number]: string } = {
            1: 'iOS',
            2: 'Android',
            3: 'Web',
            4: 'Windows',
            5: 'macOS',
            6: 'Linux',
            7: 'Windows', // Windows pode ser 4 ou 7
            8: 'TV',
            9: 'Console',
            10: 'Other'
        };
        
        return platforms[platform] || 'Unknown';
    }
    
    /**
     * Gerar parâmetros padrão
     */
    static generateDefault(): ParsedLiveGoParams {
        return {
            sdkappid: '1400088004',
            instanceid: this.generateInstanceId(),
            random: Math.random().toString(),
            platform: 7, // Windows
            host: 'windows',
            version: '1.0.0',
            sdkversion: '3.4.9',
            compress: 'gzip',
            parsed: true,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            platformName: 'Windows'
        };
    }
    
    /**
     * Gerar instance ID único
     */
    private static generateInstanceId(): string {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
    
    /**
     * Comparar dois conjuntos de parâmetros
     */
    static compare(params1: ParsedLiveGoParams, params2: ParsedLiveGoParams): boolean {
        return JSON.stringify(params1) === JSON.stringify(params2);
    }
    
    /**
     * Extrair parâmetros da URL atual
     */
    static extractFromUrl(): ParsedLiveGoParams | null {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const livegoParams = urlParams.get('livego');
            
            if (livegoParams) {
                return this.parse(livegoParams);
            }
            
            // Tentar parse direto da query string
            if (window.location.search.includes('sdkappid')) {
                return this.parse(window.location.search.substring(1));
            }
            
            return null;
        } catch (error) {
            console.error('Erro ao extrair parâmetros LiveGo da URL:', error);
            return null;
        }
    }
}
