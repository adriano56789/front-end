import React, { useState, useEffect } from 'react';
import { BackIcon, PixIcon, MercadoPagoIcon, CheckCircleIcon } from './icons';
import { useTranslation } from '../i18n';
import { User, ToastType } from '../types';
import { api } from '../services/api';
import { safeLog } from '../utils/maskSensitiveData';

interface ConfigureWithdrawalMethodScreenProps {
  onClose: () => void;
  currentUser: User;
  updateUser: (user: User) => void;
  addToast: (type: ToastType, message: string) => void;
}

type PaymentMethod = 'pix' | 'mercado_pago';

const ConfigureWithdrawalMethodScreen: React.FC<ConfigureWithdrawalMethodScreenProps> = ({ onClose, currentUser, updateUser, addToast }) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [pixKey, setPixKey] = useState('');
  const [mercadoPagoEmail, setMercadoPagoEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (currentUser.withdrawal_method) {
        const { method, details } = currentUser.withdrawal_method;
        setSelectedMethod(method as PaymentMethod);
        if (method === 'pix' && details.pixKey) {
            setPixKey(details.pixKey);
        } else if (method === 'mercado_pago' && details.email) {
            setMercadoPagoEmail(details.email);
        }
    } else {
        setSelectedMethod('pix');
        setPixKey('');
        setMercadoPagoEmail('');
    }
  }, [currentUser]);

  const handleSave = async () => {
    let method: string;
    let details: any;

    if (selectedMethod === 'pix') {
        if (!pixKey.trim()) {
            addToast(ToastType.Error, "Por favor, insira sua chave PIX.");
            return;
        }
        method = 'pix';
        details = { pixKey };
    } else {
        if (!mercadoPagoEmail.trim() || !/\S+@\S+\.\S+/.test(mercadoPagoEmail)) {
            addToast(ToastType.Error, "Por favor, insira um e-mail válido do Mercado Pago.");
            return;
        }
        method = 'mercado_pago';
        details = { email: mercadoPagoEmail };
    }

    setIsSaving(true);
    try {
        const response = await api.setWithdrawalMethod(method, details);
        
        // Usar função global de mascaramento
        safeLog('[ConfigureWithdrawal] Response (mascarado):', response);
        
        if (response.success) {
            if (response.user) {
                updateUser(response.user);
            }
            addToast(ToastType.Success, "Método de saque salvo!");
            onClose();
        } else {
            throw new Error("Falha ao salvar método.");
        }
    } catch (error) {
        console.error('[ConfigureWithdrawal] Error:', error);
        addToast(ToastType.Error, (error as Error).message);
    } finally {
        setIsSaving(false);
    }
  };

  const PaymentMethodButton: React.FC<{
    method: PaymentMethod;
    label: string;
    icon: React.ReactNode;
  }> = ({ method, label, icon }) => {
    const isSelected = selectedMethod === method;
    return (
      <button
        onClick={() => setSelectedMethod(method)}
        className={`relative flex flex-col items-center justify-center space-y-3 p-5 rounded-[12px] transition-all flex-1
          ${isSelected ? 'bg-[#1b1c21] border border-[#1cb15f]' : 'bg-[#18191e] border border-transparent'}`}
      >
        {icon}
        <span className="text-white text-[13px] font-bold">{label}</span>
        {isSelected && (
          <div className="absolute top-2 right-2 bg-[#1cb15f] rounded-full w-[14px] h-[14px] flex items-center justify-center">
             <svg className="w-[10px] h-[10px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
               <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
             </svg>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="absolute inset-0 bg-[#0f1015] z-50 flex flex-col text-white">
      <header className="flex items-center p-4 py-5 flex-shrink-0">
        <button onClick={onClose} className="p-1 -ml-1 flex items-center justify-center text-gray-300 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-bold text-white ml-2">Configurar Método de Saque</h1>
      </header>

      <main className="flex-grow px-5 py-2 space-y-6">
        <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed pr-8">
          Selecione como você gostaria de receber seu dinheiro.
        </p>

        <div className="flex gap-4">
          <PaymentMethodButton method="pix" label="PIX" icon={<PixIcon className="w-[45px] h-[45px]" />} />
          <PaymentMethodButton method="mercado_pago" label="Mercado Pago" icon={<MercadoPagoIcon className="w-[45px] h-[45px]" />} />
        </div>

        {selectedMethod === 'pix' && (
          <div className="space-y-2 mt-8">
            <label htmlFor="pix-key" className="text-[12px] font-bold text-[#8e9196] block ml-1">Chave PIX</label>
            <input
              id="pix-key"
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="CPF, e-mail ou telefone"
              className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
            />
          </div>
        )}

        {selectedMethod === 'mercado_pago' && (
            <div className="space-y-2 mt-8">
                <label htmlFor="mercado-pago-email" className="text-[12px] font-bold text-[#8e9196] block ml-1">E-mail do Mercado Pago</label>
                <input
                    id="mercado-pago-email"
                    type="email"
                    value={mercadoPagoEmail}
                    onChange={(e) => setMercadoPagoEmail(e.target.value)}
                    placeholder="Seu e-mail da conta"
                    className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                />
            </div>
        )}
      </main>

      <footer className="p-5 flex-grow-0 flex-shrink-0 mb-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#1cb15f] text-white text-[15px] font-bold py-[14px] rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Salvando..." : "Salvar"}
        </button>
      </footer>
    </div>
  );
};

export default ConfigureWithdrawalMethodScreen;