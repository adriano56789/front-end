import React, { useState, useEffect } from 'react';
import { PixIcon } from './icons';
import { useTranslation } from '../i18n';
import { User, ToastType } from '../types';
import { api } from '../services/api';
import { safeLog } from '../utils/maskSensitiveData';

interface ConfigureWithdrawalMethodScreenProps {
  onClose: () => void;
  currentUser: User;
  updateUser: (user: User) => void;
  addToast: (type: ToastType, message: string) => void;
  onOpenConnect?: () => void;
}

type WithdrawalMethod = 'pix' | 'connect';

const COUNTRY_OPTIONS: { code: string; label: string; flag: string; method: WithdrawalMethod; currency: string; description: string }[] = [
  { code: 'br', label: 'Brasil', flag: '\u{1F1E7}\u{1F1F7}', method: 'pix', currency: 'BRL', description: 'Chave Pix - pagamento instant\u00e2neo' },
  { code: 'us', label: 'Estados Unidos', flag: '\u{1F1FA}\u{1F1F8}', method: 'connect', currency: 'USD', description: 'Conta banc\u00e1ria EUA (ACH)' },
  { code: 'pt', label: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', method: 'connect', currency: 'EUR', description: 'Conta banc\u00e1ria PT (SEPA)' },
];

const ConfigureWithdrawalMethodScreen: React.FC<ConfigureWithdrawalMethodScreenProps> = ({ onClose, currentUser, updateUser, addToast }) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod>('pix');
  const [selectedCountry, setSelectedCountry] = useState('br');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('chave');
  const [accountHolder, setAccountHolder] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  useEffect(() => {
    const userCountry = (currentUser.country || 'br').toLowerCase();
    const countryOpt = COUNTRY_OPTIONS.find(c => c.code === userCountry || userCountry.includes(c.code));
    if (countryOpt) {
      setSelectedCountry(countryOpt.code);
      setSelectedMethod(countryOpt.method);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser.withdrawal_method && currentUser.withdrawal_method.method === 'pix') {
      const details = currentUser.withdrawal_method.details || {};
      setPixKey(details.pixKey || '');
      setPixKeyType(details.pixKeyType || 'chave');
      setAccountHolder(details.accountHolder || '');
    }
  }, [currentUser]);

  const currentCountry = COUNTRY_OPTIONS.find(c => c.code === selectedCountry) || COUNTRY_OPTIONS[0];

  const handleSavePix = async () => {
    if (!pixKey.trim()) {
      addToast(ToastType.Error, 'Por favor, insira sua chave PIX.');
      return;
    }
    const details: any = { pixKey: pixKey.trim(), pixKeyType };
    if (accountHolder.trim()) details.accountHolder = accountHolder.trim();
    setIsSaving(true);
    try {
      const response = await api.setWithdrawalMethod('pix', details);
      safeLog('[ConfigureWithdrawal] Response:', response);
      if (response.success) {
        if (response.user) updateUser(response.user);
        addToast(ToastType.Success, 'Chave PIX salva!');
        onClose();
      } else {
        throw new Error('Falha ao salvar m\u00e9todo.');
      }
    } catch (error) {
      console.error('[ConfigureWithdrawal] Error:', error);
      addToast(ToastType.Error, (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectStripe = async () => {
    setIsSaving(true);
    try {
      const response = await api.stripeConnectOnboarding({
        country: selectedCountry,
        email: currentUser.email || '',
        document: '',
      });
      if (response.success && response.url) {
        window.open(response.url, '_blank');
        addToast(ToastType.Success, 'Redirecionando para o cadastro Stripe...');
        onClose();
      } else {
        throw new Error(response.error || 'Erro ao criar conta Stripe');
      }
    } catch (error) {
      console.error('[ConfigureWithdrawal] Connect Error:', error);
      addToast(ToastType.Error, (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (selectedMethod === 'pix') {
      handleSavePix();
    } else {
      handleConnectStripe();
    }
  };

  return (
    <div className="absolute inset-0 bg-[#0f1015] z-50 flex flex-col text-white">
      <header className="flex items-center p-4 py-5 flex-shrink-0">
        <button onClick={onClose} className="p-1 -ml-1 flex items-center justify-center text-gray-300 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-bold text-white ml-2">Configurar Saque</h1>
      </header>

      <main className="flex-grow px-5 py-2 space-y-6 overflow-y-auto no-scrollbar">
        <div className="space-y-2">
          <label className="text-[12px] font-bold text-[#8e9196] block ml-1">Pa\u00eds de recebimento</label>
          <button
            onClick={() => setShowCountryPicker(!showCountryPicker)}
            className="w-full flex justify-between items-center bg-[#1b1c21] p-4 rounded-xl border border-white/[0.05] hover:bg-[#1f2025] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentCountry.flag}</span>
              <div className="text-left">
                <p className="text-white text-[14px] font-bold">{currentCountry.label}</p>
                <p className="text-[#8e9196] text-[11px] font-medium">{currentCountry.description}</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-[#5a5c63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d={showCountryPicker ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
          </button>

          {showCountryPicker && (
            <div className="bg-[#1b1c21] rounded-xl border border-white/[0.05] overflow-hidden">
              {COUNTRY_OPTIONS.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country.code);
                    setSelectedMethod(country.method);
                    setShowCountryPicker(false);
                  }}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-[#1f2025] transition-colors ${selectedCountry === country.code ? 'bg-[#1f2025]' : ''}`}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <div className="text-left flex-1">
                    <p className="text-white text-[14px] font-bold">{country.label}</p>
                    <p className="text-[#8e9196] text-[11px] font-medium">{country.description}</p>
                  </div>
                  {selectedCountry === country.code && (
                    <div className="w-5 h-5 rounded-full bg-[#1cb15f] flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedMethod === 'pix' ? (
          <>
            <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed pr-8">
              Os saques s\u00e3o feitos via <span className="text-white font-bold">PIX (BRL)</span>. Cadastre a chave Pix que receber\u00e1 seu dinheiro.
            </p>
            <div className="flex items-center justify-between p-5 rounded-2xl bg-[#18191e] border border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#241a38] flex items-center justify-center">
                  <PixIcon className="w-[26px] h-[26px]" />
                </div>
                <div>
                  <p className="text-white text-[15px] font-bold">Pix (Brasil)</p>
                  <p className="text-[#8e9196] text-[12px] font-medium">Pagamento instant\u00e2neo - BRL</p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-[#1cb15f] flex items-center justify-center bg-[#1cb15f]">
                <svg className="w-[10px] h-[10px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="pix-key" className="text-[12px] font-bold text-[#8e9196] block ml-1">Chave PIX</label>
                <input
                  id="pix-key"
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="CPF/CNPJ, e-mail, telefone ou chave aleat\u00f3ria"
                  className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                />
                <p className="text-[#5a5c63] text-[11px] font-medium ml-1">O Pix ser\u00e1 enviado para esta chave (80% do valor bruto).</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="pix-holder" className="text-[12px] font-bold text-[#8e9196] block ml-1">Nome do titular <span className="text-[#5a5c63] font-medium">(opcional)</span></label>
                <input
                  id="pix-holder"
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Nome completo do titular da conta"
                  className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed pr-8">
              Para sacar em <span className="text-white font-bold">{currentCountry.currency}</span>, cadastre sua conta banc\u00e1ria via <span className="text-white font-bold">Stripe Connect</span>.
            </p>
            <div className="flex items-center justify-between p-5 rounded-2xl bg-[#18191e] border border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#1a1a3e] flex items-center justify-center">
                  <span className="text-[#635bff] text-[20px] font-black">S</span>
                </div>
                <div>
                  <p className="text-white text-[15px] font-bold">Stripe Connect</p>
                  <p className="text-[#8e9196] text-[12px] font-medium">{currentCountry.currency} - {currentCountry.description}</p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-[#635bff] flex items-center justify-center bg-[#635bff]">
                <svg className="w-[10px] h-[10px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 text-[12px] text-[#8e9196] font-medium leading-relaxed">
              <p className="text-white font-bold mb-1">Como funciona o Stripe Connect</p>
              Voc\u00ea ser\u00e1 redirecionado para o site oficial do Stripe para cadastrar:<br />
              - Seus dados pessoais (KYC)<br />
              - Sua conta banc\u00e1ria local ({currentCountry.currency})<br />
              - O saque \u00e9 autom\u00e1tico ap\u00f3s aprova\u00e7\u00e3o do Stripe<br />
              - 80% vai para voc\u00ea, 20% \u00e9 comiss\u00e3o da plataforma<br />
            </div>
            {selectedCountry === 'br' && (
              <div className="bg-[#241a38] border border-[#635bff]/30 rounded-2xl p-4 text-[12px] text-[#a1a1aa] font-medium leading-relaxed">
                <p className="text-white font-bold mb-1">Dica para brasileiros</p>
                Para sacar em BRL, use Pix (mais r\u00e1pido e sem taxas adicionais). O Connect \u00e9 ideal se voc\u00ea tamb\u00e9m quiser sacar em USD ou EUR.
              </div>
            )}
          </>
        )}
      </main>

      <footer className="p-5 flex-grow-0 flex-shrink-0 mb-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#1cb15f] text-white text-[15px] font-bold py-[14px] rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Salvando...' : selectedMethod === 'connect' ? 'Cadastrar no Stripe' : 'Salvar'}
        </button>
      </footer>
    </div>
  );
};

export default ConfigureWithdrawalMethodScreen;
