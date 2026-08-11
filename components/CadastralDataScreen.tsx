import React, { useState } from 'react';
import { BackIcon, BrazilFlagIcon, PortugalFlagIcon, USAFlagIcon } from './icons';
import { User, ToastType, CadastralData, CadastralAddress } from '../types';
import { api } from '../services/api';
import { safeLog } from '../utils/maskSensitiveData';

interface CadastralDataScreenProps {
  onClose: () => void;
  onSaved: () => void;
  currentUser: User;
  updateUser: (user: User) => void;
  addToast: (type: ToastType, message: string) => void;
}

const COUNTRY_NAMES: Record<string, string> = {
  br: 'Brasil',
  pt: 'Portugal',
  us: 'Estados Unidos',
  es: 'Espanha',
  fr: 'França',
  de: 'Alemanha',
  it: 'Itália',
  uk: 'Reino Unido',
  ca: 'Canadá',
  mx: 'México',
  ar: 'Argentina',
  jp: 'Japão',
  cn: 'China',
};

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

const maskZip = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
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
  const countryCode = (currentUser.country || 'br').toLowerCase();

  const [name, setName] = useState(existing ? currentUser.name : (currentUser.name || ''));
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj'>(existing?.documentType || 'cpf');
  const [document, setDocument] = useState(existing?.document || '');
  const [address, setAddress] = useState<CadastralAddress>(existing?.address || {
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    country: COUNTRY_NAMES[countryCode] || 'Brasil',
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateAddress = (field: keyof CadastralAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

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
    if (!address.street.trim() || !address.number.trim() || !address.neighborhood.trim() ||
        !address.city.trim() || !address.state.trim() || !address.zipCode.trim() || !address.country.trim()) {
      addToast(ToastType.Error, "Preencha o endereço completo (rua, número, bairro, cidade, estado, CEP e país).");
      return;
    }

    const cadastral: CadastralData = {
      documentType,
      document: digits,
      address: {
        street: address.street.trim(),
        number: address.number.trim(),
        neighborhood: address.neighborhood.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        zipCode: address.zipCode.replace(/\D/g, ''),
        country: address.country.trim(),
      },
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
        <div className="bg-[#1b1c21] border border-[#d97745]/20 rounded-xl p-4">
          <p className="text-[#d97745] text-[13px] font-bold">Obrigatório pela Receita Federal</p>
          <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed mt-1">
            A identificação (nome, CPF/CNPJ e endereço completo) é exigida por lei para prevenção à fraude,
            tanto em compras em reais quanto em dólar/euro. Solicitamos apenas uma vez e seus dados ficam protegidos.
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

        <div className="space-y-4">
          <h2 className="text-[13px] font-black text-white uppercase tracking-wider">Endereço Completo</h2>
          <div className="space-y-2">
            <FieldLabel text="Rua / Avenida" required />
            <TextInput value={address.street} onChange={(v) => updateAddress('street', v)} placeholder="Nome da rua" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <FieldLabel text="Número" required />
              <TextInput value={address.number} onChange={(v) => updateAddress('number', v)} placeholder="Nº" />
            </div>
            <div className="flex-1 space-y-2">
              <FieldLabel text="Bairro" required />
              <TextInput value={address.neighborhood} onChange={(v) => updateAddress('neighborhood', v)} placeholder="Bairro" />
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel text="Cidade" required />
            <TextInput value={address.city} onChange={(v) => updateAddress('city', v)} placeholder="Cidade" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <FieldLabel text="Estado / UF" required />
              <TextInput value={address.state} onChange={(v) => updateAddress('state', v)} placeholder="Ex.: SP" />
            </div>
            <div className="flex-1 space-y-2">
              <FieldLabel text="CEP" required />
              <TextInput value={address.zipCode} onChange={(v) => updateAddress('zipCode', maskZip(v))} placeholder="00000-000" inputMode="numeric" maxLength={9} />
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel text="País" required />
            <div className="flex items-center gap-3 bg-[#1b1c21] border border-white/[0.05] rounded-xl p-[16px] focus-within:border-[#1cb15f]/40 transition-colors">
              {address.country.toLowerCase().includes('brasil') || address.country.toLowerCase() === 'br' ? (
                <BrazilFlagIcon className="w-5 h-5 rounded-sm object-cover" />
              ) : address.country.toLowerCase().includes('portugal') || address.country.toLowerCase() === 'pt' ? (
                <PortugalFlagIcon className="w-5 h-5 rounded-sm object-cover" />
              ) : address.country.toLowerCase().includes('estados') || address.country.toLowerCase() === 'us' ? (
                <USAFlagIcon className="w-5 h-5 rounded-sm object-cover" />
              ) : null}
              <input
                type="text"
                value={address.country}
                onChange={(e) => updateAddress('country', e.target.value)}
                placeholder="País de residência fiscal"
                className="flex-1 bg-transparent text-white placeholder-[#5a5c63] text-[14px] font-medium focus:outline-none"
              />
            </div>
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
