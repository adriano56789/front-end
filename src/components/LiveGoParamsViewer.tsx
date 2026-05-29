import React, { useState, useEffect } from 'react';
import { LiveGoParamsParser, ParsedLiveGoParams } from '../services/LiveGoParamsParser';

interface LiveGoParamsViewerProps {
    paramsString?: string;
    onParamsChange?: (params: ParsedLiveGoParams) => void;
    showValidation?: boolean;
}

export const LiveGoParamsViewer: React.FC<LiveGoParamsViewerProps> = ({
    paramsString,
    onParamsChange,
    showValidation = true
}) => {
    const [parsedParams, setParsedParams] = useState<ParsedLiveGoParams | null>(null);
    const [inputValue, setInputValue] = useState(paramsString || '');
    const [validation, setValidation] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] });

    useEffect(() => {
        if (paramsString) {
            setInputValue(paramsString);
        }
    }, [paramsString]);

    useEffect(() => {
        // Tentar extrair parâmetros da URL
        const urlParams = LiveGoParamsParser.extractFromUrl();
        if (urlParams) {
            setParsedParams(urlParams);
            setInputValue(LiveGoParamsParser.stringify(urlParams));
            onParamsChange?.(urlParams);
        }
    }, [onParamsChange]);

    const handleInputChange = (value: string) => {
        setInputValue(value);
        
        if (value.trim()) {
            try {
                const parsed = LiveGoParamsParser.parse(value);
                setParsedParams(parsed);
                
                if (showValidation) {
                    const validation = LiveGoParamsParser.validate(parsed);
                    setValidation(validation);
                }
                
                onParamsChange?.(parsed);
            } catch (error) {
                setParsedParams(null);
                setValidation({ valid: false, errors: ['Erro ao fazer parse dos parâmetros'] });
            }
        } else {
            setParsedParams(null);
            setValidation({ valid: true, errors: [] });
        }
    };

    const generateDefault = () => {
        const defaultParams = LiveGoParamsParser.generateDefault();
        const paramString = LiveGoParamsParser.stringify(defaultParams);
        setInputValue(paramString);
        setParsedParams(defaultParams);
        setValidation({ valid: true, errors: [] });
        onParamsChange?.(defaultParams);
    };

    const copyToClipboard = () => {
        if (inputValue) {
            navigator.clipboard.writeText(inputValue);
        }
    };

    const formatParamValue = (key: string, value: any): string => {
        if (key === 'platform' && parsedParams?.platformName) {
            return `${value} (${parsedParams.platformName})`;
        }
        if (key === 'timestamp' && value) {
            return new Date(value).toLocaleString();
        }
        return String(value);
    };

    return (
        <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px', margin: '16px 0' }}>
            <h3>🔍 LiveGo Parameters Viewer</h3>
            
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Parâmetros LiveGo:
                </label>
                <textarea
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Cole os parâmetros LiveGo aqui..."
                    style={{
                        width: '100%',
                        height: '80px',
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px'
                    }}
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button
                        onClick={generateDefault}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Gerar Padrão
                    </button>
                    <button
                        onClick={copyToClipboard}
                        disabled={!inputValue}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: inputValue ? '#28a745' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: inputValue ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Copiar
                    </button>
                </div>
            </div>

            {parsedParams && (
                <div style={{ marginBottom: '16px' }}>
                    <h4>📋 Parâmetros Parseados:</h4>
                    <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '12px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px'
                    }}>
                        {Object.entries(parsedParams).map(([key, value]) => (
                            <div key={key} style={{ marginBottom: '4px' }}>
                                <strong>{key}:</strong> {formatParamValue(key, value)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showValidation && !validation.valid && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '16px'
                }}>
                    <h4>❌ Erros de Validação:</h4>
                    <ul style={{ margin: '0', paddingLeft: '20px' }}>
                        {validation.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {showValidation && validation.valid && parsedParams && (
                <div style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '12px',
                    borderRadius: '4px'
                }}>
                    ✅ Parâmetros válidos e parseados com sucesso!
                </div>
            )}
        </div>
    );
};

export default LiveGoParamsViewer;
