import React, { useState } from 'react';
import { BackIcon, BrazilFlagIcon } from './icons';
import { User, ToastType, CadastralData } from '../types';
import { api } from '../services/api';
import { safeLog } from '../utils/maskSensitiveData';

interface CadastralDataScreenProps {
  onClose: () => void;
  onSaved: () => void;
  currentUser: User;
  updateUser: (user: User) => void;
  addToast: (type: ToastType, message: string) => void;
}

const maskDocument = (value: string, type: 'cpf' | 'cnpj'): string => {
  const digits = value.replace(/\D/g, '').slice(0, type === 'cpf' ? 11 : 14);
  if (type === 'cpf') {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
};

const isValidCPF = (cpf: string): boolean => {
  const c = cpf.replace(/\D/g, '');
  if (c.length !== 11) return false;
  if (/^(\d)\1+$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i], 10) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(c[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i], 10) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === parseInt(c[10], 10);
};

const isValidCNPJ = (cnpj: string): boolean => {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14) return false;
  if (/^(\d)\1+$/.test(c)) return false;
  const calcDigit = (base: string): number => {
    const weights = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += parseInt(base[i], 10) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  if (calcDigit(c.slice(0, 12)) !== parseInt(c[12], 10)) return false;
  return calcDigit(c.slice(0, 13)) === parseInt(c[13], 10);
};

const FieldLabel: React.FC<{ text: string; required?: boolean }> = ({ text, required }) => (
  <label className="text-[12px] font-bold text-[#8e9196] block ml-1">
    {text} {required && <span className="text-[#d97745]">*</span>}
  </label>
);

const TextInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  inputMode?: 'text' | 'numeric' | 'email';
}> = ({ value, onChange, placeholder, maxLength, inputMode = 'text' }) => (
  <input
    type="text"
    inputMode={inputMode}
    value={value}
    maxLength={maxLength}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[16px] focus:outline-none border border-white/[0.05] focus:border-[#1cb15f]/40 transition-colors"
  />
);

const CadastralDataScreen: React.FC<CadastralDataScreenProps> = ({ onClose, onSaved, currentUser, updateUser, addToast }) => {
  const existing = currentUser.cadastral;

  const [name, setName] = useState(existing ? currentUser.name : (currentUser.name || ''));
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj'>(existing?.documentType || 'cpf');
  const [document, setDocument] = useState(existing?.document || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast(ToastType.Error, "Por favor, informe seu nome completo.");
      return;
    }
    const digits = document.replace(/\D/g, '');
    if (digits.length === 0) {
      addToast(ToastType.Error, "Por favor, informe seu CPF ou CNPJ.");
      return;
    }
    if (documentType === 'cpf') {
      if (!isValidCPF(document)) {
        addToast(ToastType.Error, "CPF inválido. Verifique os dígitos.");
        return;
      }
    } else if (!isValidCNPJ(document)) {
      addToast(ToastType.Error, "CNPJ inválido. Verifique os dígitos.");
      return;
    }

    const cadastral: CadastralData = {
      documentType,
      document: digits,
    };

    setIsSaving(true);
    try {
      const response = await api.updateProfile(currentUser.id, { cadastral });
      safeLog('[CadastralData] Response (mascarado):', response);
      if (response && response.success) {
        if (response.user) updateUser(response.user);
        addToast(ToastType.Success, "Dados cadastrais salvos!");
        onSaved();
      } else {
        throw new Error("Falha ao salvar dados cadastrais.");
      }
    } catch (error) {
      console.error('[CadastralData] Error:', error);
      addToast(ToastType.Error, (error as Error).message || "Erro ao salvar dados cadastrais.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#0f1015] z-50 flex flex-col text-white">
      <header className="flex items-center p-4 py-5 flex-shrink-0">
        <button onClick={onClose} className="p-1 -ml-1 flex items-center justify-center text-gray-300 hover:text-white transition-colors">
          <BackIcon className="w-5 h-5" />
        </button>
        <h1 className="text-[17px] font-bold text-white ml-2">Dados Cadastrais</h1>
      </header>

      <main className="flex-grow px-5 py-2 space-y-6 overflow-y-auto no-scrollbar">
        <div className="bg-[#1b1c21] border border-[#1cb15f]/20 rounded-xl p-4">
          <p className="text-[#1cb15f] text-[13px] font-bold">Identificação</p>
          <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed mt-1">
            Apenas nome e CPF/CNPJ. Sem endereço, CEP ou rua — dados pedidos uma única vez e protegidos.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel text="Nome Completo" required />
            <TextInput value={name} onChange={setName} placeholder="Como no seu documento oficial" />
          </div>

          <div className="space-y-2">
            <FieldLabel text="Documento (CPF ou CNPJ)" required />
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => { setDocumentType('cpf'); setDocument(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                  documentType === 'cpf'
                    ? 'bg-[#1cb15f] text-white'
                    : 'bg-[#18191e] text-[#8e9196] border border-white/[0.05]'
                }`}
              >
                <BrazilFlagIcon className="w-4 h-4 rounded-full object-cover" />
                Pessoa Física (CPF)
              </button>
              <button
                onClick={() => { setDocumentType('cnpj'); setDocument(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                  documentType === 'cnpj'
                    ? 'bg-[#1cb15f] text-white'
                    : 'bg-[#18191e] text-[#8e9196] border border-white/[0.05]'
                }`}
              >
                <BrazilFlagIcon className="w-4 h-4 rounded-full object-cover" />
                Pessoa Jurídica (CNPJ)
              </button>
            </div>
            <TextInput
              value={document}
              onChange={(v) => setDocument(maskDocument(v, documentType))}
              placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
              inputMode="numeric"
              maxLength={documentType === 'cpf' ? 14 : 18}
            />
          </div>
        </div>
      </main>

      <footer className="p-5 flex-grow-0 flex-shrink-0 mb-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#1cb15f] text-white text-[15px] font-bold py-[14px] rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Salvando..." : "Salvar e Continuar"}
        </button>
      </footer>
    </div>
  );
};

export default CadastralDataScreen;
