import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User, token: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegistering) {
        // Registro
        const response = await api.register({ name, email, password });
        // NÃO exibir resposta/token no console - segurança
        if (response.success && response.token && response.user) {
          onLogin(response.user, response.token);
        }
      } else {
        // Login
        const response = await api.login({ email, password });
        // NÃO exibir resposta/token no console - segurança
        if (response.success && response.token && response.user) {
          onLogin(response.user, response.token);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center bg-[#110f13] font-sans text-white overflow-hidden">
      
      <div className="z-10 w-full max-w-[340px] px-6 flex flex-col items-center justify-center min-h-[600px]">
        
        {/* Seção do Logo */}
        <div className="mb-10 text-center flex flex-col items-center">
            <h1 className="text-5xl font-black italic tracking-tighter text-white drop-shadow-xl" style={{ fontFamily: 'Arial, sans-serif' }}>
                Livenza
            </h1>
            <p className="text-xs font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 uppercase mt-2 drop-shadow-sm">
                EXPERIÊNCIA VIP REAL
            </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
            {isRegistering && (
                 <input 
                    type="text" 
                    placeholder="Seu nome real ou apelido" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#1b191e] border border-[#2a272e] rounded-[14px] px-5 py-[16px] text-white placeholder-[#716e75] text-[14px] font-medium focus:outline-none focus:border-[#d900ff] transition-colors"
                 />
            )}
            
            <input 
                type="email" 
                placeholder={isRegistering ? "seu@email.com" : "seu@email.com"} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1b191e] border border-[#2a272e] rounded-[14px] px-5 py-[16px] text-white placeholder-[#716e75] text-[14px] font-medium focus:outline-none focus:border-[#d900ff] transition-colors"
            />
            
            <input 
                type="password" 
                placeholder={isRegistering ? "Crie uma senha" : "Senha"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1b191e] border border-[#2a272e] rounded-[14px] px-5 py-[16px] text-white placeholder-[#716e75] text-[14px] font-medium focus:outline-none focus:border-[#d900ff] transition-colors"
            />

            <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#d900ff] to-[#f60172] text-white font-black py-[16px] rounded-[14px] shadow-[0_0_20px_rgba(217,0,255,0.2)] hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-wider text-[15px] mt-2 disabled:opacity-50"
            >
                {isLoading ? (isRegistering ? "CRIANDO..." : "ENTRANDO...") : (isRegistering ? "CRIAR MINHA CONTA" : "ENTRAR")}
            </button>
        </form>

        {/* Links de Rodapé */}
        <div className="mt-10 text-center w-full">
            <p className="text-[#646168] text-[13px] font-medium mb-4 flex items-center justify-center">
                {isRegistering ? "Já possui acesso?" : "Ainda não tem acesso?"}
            </p>
            {error && (
                <p className="text-[#ff275a] text-[13px] font-medium mt-2 mb-3">{error}</p>
            )}
            <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="relative text-white font-black text-[12px] tracking-wider uppercase hover:opacity-80 transition-opacity flex flex-col items-center mx-auto"
            >
                <div className="mb-2">{isRegistering ? "FAZER LOGIN NO SISTEMA" : "CRIAR MINHA CONTA AGORA"}</div>
                <div className="h-[1px] w-full bg-white/10"></div>
            </button>
        </div>

      </div>

      {/* Versão no Rodapé */}
      <div className="absolute bottom-8 w-full text-center z-10 text-[#2a272e] text-[9px] font-black tracking-[0.3em] uppercase">
        LIVENZA © 2024 - PRIVATE ACCESS
      </div>
    </div>
  );
};

export default LoginScreen;