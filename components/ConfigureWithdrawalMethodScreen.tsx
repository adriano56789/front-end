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
}

// ═══ LIVE GO — Saques exclusivamente via PIX (Stripe Payout) ═══
// O criador cadastra a chave Pix para onde o Stripe envia o valor líquido (80%).
// Sem STRIPE_PIX_DESTINATION na plataforma, o saque fica aguardando (modo fila).

const ConfigureWithdrawalMethodScreen: React.FC<ConfigureWithdrawalMethodScreenProps> = ({ onClose, currentUser, updateUser, addToast }) => {
  const { t } = useTranslation();
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('chave'); // chave | cpf | email | telefone | aleatoria
  const [accountHolder, setAccountHolder] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser.withdrawal_method && currentUser.withdrawal_method.method === 'pix') {
      const details = currentUser.withdrawal_method.details || {};
      setPixKey(details.pixKey || '');
      setPixKeyType(details.pixKeyType || 'chave');
      setAccountHolder(details.accountHolder || '');
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!pixKey.trim()) {
      addToast(ToastType.Error, "Por favor, insira sua chave PIX.");
      return;
    }

    const details: any = {
      pixKey: pixKey.trim(),
      pixKeyType: pixKeyType,
    };
    if (accountHolder.trim()) details.accountHolder = accountHolder.trim();

    setIsSaving(true);
    try {
      const response = await api.setWithdrawalMethod('pix', details);

      // Usar função global de mascaramento
      safeLog('[ConfigureWithdrawal] Response (mascarado):', response);

      if (response.success) {
        if (response.user) {
          updateUser(response.user);
        }
        addToast(ToastType.Success, "Chave PIX salva!");
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
        <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed pr-8">
          Os saques são feitos via <span className="text-white font-bold">PIX (BRL)</span>. Cadastre a chave Pix que receberá seu dinheiro.
        </p>

        <div className="flex items-center justify-between p-5 rounded-2xl bg-[#18191e] border border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#241a38] flex items-center justify-center">
              <PixIcon className="w-[26px] h-[26px]" />
            </div>
            <div>
              <p className="text-white text-[15px] font-bold">Pix (Brasil)</p>
              <p className="text-[#8e9196] text-[12px] font-medium">Pagamento instantâneo • BRL</p>
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
              placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"
              className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
            />
            <p className="text-[#5a5c63] text-[11px] font-medium ml-1">O Pix será enviado para esta chave (80% do valor bruto).</p>
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

          <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 text-[12px] text-[#8e9196] font-medium leading-relaxed">
            <p className="text-white font-bold mb-1">Como funciona</p>
            • 80% do valor é enviado para a sua chave Pix via Stripe.<br />
            • 20% é a comissão da plataforma.<br />
            • O saque só é liberado após a análise anti-fraude (até 7 dias).<br />
          </div>
        </div>
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