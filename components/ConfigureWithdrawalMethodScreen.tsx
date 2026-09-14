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

type WithdrawalMethod = 'pix' | 'bank_us' | 'bank_pt';

const COUNTRY_OPTIONS = [
  { code: 'br', label: 'Brasil', flag: '\u{1F1E7}\u{1F1F7}', method: 'pix' as WithdrawalMethod, currency: 'BRL', description: 'Chave Pix - pagamento instant\u00e2neo' },
  { code: 'us', label: 'Estados Unidos', flag: '\u{1F1FA}\u{1F1F8}', method: 'bank_us' as WithdrawalMethod, currency: 'USD', description: 'Conta banc\u00e1ria EUA (ACH)' },
  { code: 'pt', label: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', method: 'bank_pt' as WithdrawalMethod, currency: 'EUR', description: 'Conta banc\u00e1ria PT (SEPA)' },
];

const inputClass = "w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]";
const labelClass = "text-[12px] font-bold text-[#8e9196] block ml-1";
const hintClass = "text-[#5a5c63] text-[11px] font-medium ml-1";

const ConfigureWithdrawalMethodScreen: React.FC<ConfigureWithdrawalMethodScreenProps> = ({ onClose, currentUser, updateUser, addToast }) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod>('pix');
  const [selectedCountry, setSelectedCountry] = useState('br');
  const [isSaving, setIsSaving] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('chave');
  const [accountHolder, setAccountHolder] = useState('');

  const [usBankName, setUsBankName] = useState('');
  const [usRoutingNumber, setUsRoutingNumber] = useState('');
  const [usAccountNumber, setUsAccountNumber] = useState('');
  const [usAccountType, setUsAccountType] = useState('checking');
  const [usHolderName, setUsHolderName] = useState('');

  const [ptBankName, setPtBankName] = useState('');
  const [ptIban, setPtIban] = useState('');
  const [ptBic, setPtBic] = useState('');
  const [ptHolderName, setPtHolderName] = useState('');

  useEffect(() => {
    const userCountry = (currentUser.country || 'br').toLowerCase();
    const countryOpt = COUNTRY_OPTIONS.find(c => c.code === userCountry || userCountry.includes(c.code));
    if (countryOpt) {
      setSelectedCountry(countryOpt.code);
      setSelectedMethod(countryOpt.method);
    }
  }, [currentUser]);

  useEffect(() => {
    const wm = currentUser.withdrawal_method;
    if (!wm) return;
    if (wm.method === 'pix' && wm.details) {
      setPixKey(wm.details.pixKey || '');
      setPixKeyType(wm.details.pixKeyType || 'chave');
      setAccountHolder(wm.details.accountHolder || '');
    } else if (wm.method === 'bank_us' && wm.details) {
      setUsBankName(wm.details.bankName || '');
      setUsRoutingNumber(wm.details.routingNumber || '');
      setUsAccountNumber(wm.details.accountNumber || '');
      setUsAccountType(wm.details.accountType || 'checking');
      setUsHolderName(wm.details.holderName || '');
    } else if (wm.method === 'bank_pt' && wm.details) {
      setPtBankName(wm.details.bankName || '');
      setPtIban(wm.details.iban || '');
      setPtBic(wm.details.bic || '');
      setPtHolderName(wm.details.holderName || '');
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
      safeLog('[ConfigureWithdrawal] Pix saved:', response);
      if (response.success) {
        if (response.user) updateUser(response.user);
        addToast(ToastType.Success, 'Chave PIX salva!');
        onClose();
      } else {
        throw new Error('Falha ao salvar.');
      }
    } catch (error) {
      addToast(ToastType.Error, (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUSBank = async () => {
    if (!usRoutingNumber.trim() || !usAccountNumber.trim()) {
      addToast(ToastType.Error, 'Preencha o Routing Number e o Account Number.');
      return;
    }
    if (usRoutingNumber.replace(/\D/g, '').length !== 9) {
      addToast(ToastType.Error, 'Routing Number deve ter 9 d\u00edgitos.');
      return;
    }
    const details = {
      bankName: usBankName.trim(),
      routingNumber: usRoutingNumber.replace(/\D/g, ''),
      accountNumber: usAccountNumber.replace(/\D/g, ''),
      accountType: usAccountType,
      holderName: usHolderName.trim(),
      currency: 'USD',
      country: 'US',
    };
    setIsSaving(true);
    try {
      const response = await api.setWithdrawalMethod('bank_us', details);
      if (response.success) {
        if (response.user) updateUser(response.user);
        addToast(ToastType.Success, 'Conta banc\u00e1ria EUA salva!');
        onClose();
      } else {
        throw new Error('Falha ao salvar.');
      }
    } catch (error) {
      addToast(ToastType.Error, (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePTBank = async () => {
    if (!ptIban.trim()) {
      addToast(ToastType.Error, 'Preencha o IBAN.');
      return;
    }
    const ibanClean = ptIban.replace(/\s/g, '').toUpperCase();
    if (!ibanClean.startsWith('PT50')) {
      addToast(ToastType.Error, 'IBAN de Portugal deve come\u00e7ar com PT50.');
      return;
    }
    const details = {
      bankName: ptBankName.trim(),
      iban: ibanClean,
      bic: ptBic.replace(/\s/g, '').toUpperCase(),
      holderName: ptHolderName.trim(),
      currency: 'EUR',
      country: 'PT',
    };
    setIsSaving(true);
    try {
      const response = await api.setWithdrawalMethod('bank_pt', details);
      if (response.success) {
        if (response.user) updateUser(response.user);
        addToast(ToastType.Success, 'Conta banc\u00e1ria Portugal salva!');
        onClose();
      } else {
        throw new Error('Falha ao salvar.');
      }
    } catch (error) {
      addToast(ToastType.Error, (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (selectedMethod === 'pix') handleSavePix();
    else if (selectedMethod === 'bank_us') handleSaveUSBank();
    else if (selectedMethod === 'bank_pt') handleSavePTBank();
  };

  const BULLET = '\u2022';
  const E_ACUTE = '\u00e9';
  const C_CEDILHA = '\u00e7';
  const A_TILDE = '\u00e3';
  const A_CIRC = '\u00e2';
  const O_ACUTE = '\u00f3';
  const A_ACUTE = '\u00e1';
  const I_ACUTE = '\u00ed';
  const U_ACUTE = '\u00fa';
  const E_CIRC = '\u00ea';

  const renderPixFields = () => (
    <>
      <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed pr-8">
        Os saques s{A_TILDE}o feitos via <span className="text-white font-bold">PIX (BRL)</span>. Cadastre a chave Pix que receber{A_ACUTE} seu dinheiro.
      </p>
      <div className="flex items-center justify-between p-5 rounded-2xl bg-[#18191e] border border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#241a38] flex items-center justify-center">
            <PixIcon className="w-[26px] h-[26px]" />
          </div>
          <div>
            <p className="text-white text-[15px] font-bold">Pix (Brasil)</p>
            <p className="text-[#8e9196] text-[12px] font-medium">Pagamento instant{A_CIRC}neo - BRL</p>
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
          <label htmlFor="pix-key" className={labelClass}>Chave PIX</label>
          <input id="pix-key" type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF/CNPJ, e-mail, telefone ou chave aleat{O_ACUTE}ria" className={inputClass} />
          <p className={hintClass}>O Pix ser{A_ACUTE} enviado para esta chave (80% do valor bruto).</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="pix-holder" className={labelClass}>Nome do titular <span className="text-[#5a5c63] font-medium">(opcional)</span></label>
          <input id="pix-holder" type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Nome completo do titular da conta" className={inputClass} />
        </div>
      </div>
    </>
  );

  const renderUSBankFields = () => (
    <>
      <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed pr-8">
        Cadastre sua conta banc{'\u00e1'}ria nos EUA para receber em <span className="text-white font-bold">D{'\u00f3'}lar (USD)</span> via ACH transfer.
      </p>
      <div className="flex items-center justify-between p-5 rounded-2xl bg-[#18191e] border border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#1a1a3e] flex items-center justify-center">
            <span className="text-lg">{'\u{1F1FA}'}{'\u{1F1F8}'}</span>
          </div>
          <div>
            <p className="text-white text-[15px] font-bold">Conta EUA (ACH)</p>
            <p className="text-[#8e9196] text-[12px] font-medium">D{'\u00f3'}lar - Transfer{'\u00eancia'} banc{'\u00e1'}ria</p>
          </div>
        </div>
        <div className="w-5 h-5 rounded-full border-2 border-[#1cb15f] flex items-center justify-center bg-[#1cb15f]">
          <svg className="w-[10px] h-[10px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className={labelClass}>Nome do banco</label>
          <input type="text" value={usBankName} onChange={(e) => setUsBankName(e.target.value)} placeholder="Ex: Chase, Bank of America, Wells Fargo" className={inputClass} />
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Routing Number <span className="text-[#d97745]">*</span></label>
          <input type="text" value={usRoutingNumber} onChange={(e) => setUsRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="9 d{'\u00ed'}gitos (ex: 021000021)" className={inputClass} maxLength={9} />
          <p className={hintClass}>9 d{'\u00ed'}gitos que identificam seu banco nos EUA.</p>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Account Number <span className="text-[#d97745]">*</span></label>
          <input type="text" value={usAccountNumber} onChange={(e) => setUsAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="N{'\u00fa'}mero da conta" className={inputClass} />
          <p className={hintClass}>N{'\u00fa'}mero da sua conta banc{'\u00e1'}ria nos EUA.</p>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Tipo de conta</label>
          <div className="flex gap-3">
            <button onClick={() => setUsAccountType('checking')} className={`flex-1 py-3 rounded-xl text-[13px] font-bold transition-all ${usAccountType === 'checking' ? 'bg-[#1cb15f] text-white' : 'bg-[#1b1c21] text-[#8e9196] border border-white/[0.05]'}`}>
              Checking
            </button>
            <button onClick={() => setUsAccountType('savings')} className={`flex-1 py-3 rounded-xl text-[13px] font-bold transition-all ${usAccountType === 'savings' ? 'bg-[#1cb15f] text-white' : 'bg-[#1b1c21] text-[#8e9196] border border-white/[0.05]'}`}>
              Savings
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Nome do titular <span className="text-[#5a5c63] font-medium">(opcional)</span></label>
          <input type="text" value={usHolderName} onChange={(e) => setUsHolderName(e.target.value)} placeholder="Nome como aparece na conta" className={inputClass} />
        </div>
      </div>
    </>
  );

  const renderPTBankFields = () => (
    <>
      <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed pr-8">
        Cadastre sua conta banc{'\u00e1'}ria em Portugal para receber em <span className="text-white font-bold">Euro (EUR)</span> via SEPA transfer.
      </p>
      <div className="flex items-center justify-between p-5 rounded-2xl bg-[#18191e] border border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#1a1a3e] flex items-center justify-center">
            <span className="text-lg">{'\u{1F1F5}'}{'\u{1F1F9}'}</span>
          </div>
          <div>
            <p className="text-white text-[15px] font-bold">Conta Portugal (SEPA)</p>
            <p className="text-[#8e9196] text-[12px] font-medium">Euro - Transfer{'\u00eancia'} SEPA</p>
          </div>
        </div>
        <div className="w-5 h-5 rounded-full border-2 border-[#1cb15f] flex items-center justify-center bg-[#1cb15f]">
          <svg className="w-[10px] h-[10px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className={labelClass}>Nome do banco</label>
          <input type="text" value={ptBankName} onChange={(e) => setPtBankName(e.target.value)} placeholder="Ex: Millennium BCP, Novo Banco, CGD" className={inputClass} />
        </div>
        <div className="space-y-2">
          <label className={labelClass}>IBAN <span className="text-[#d97745]">*</span></label>
          <input type="text" value={ptIban} onChange={(e) => setPtIban(e.target.value.toUpperCase())} placeholder="PT50 0035 0000 0001 2345 6789 0" className={inputClass} />
          <p className={hintClass}>IBAN da sua conta em Portugal (come{'\u00e7'}a com PT50).</p>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>BIC / SWIFT <span className="text-[#5a5c63] font-medium">(opcional)</span></label>
          <input type="text" value={ptBic} onChange={(e) => setPtBic(e.target.value.toUpperCase())} placeholder="Ex: BCOMPTPL" className={inputClass} />
          <p className={hintClass}>C{'\u00f3'}digo BIC/SWIFT do seu banco.</p>
        </div>
        <div className="space-y-2">
          <label className={labelClass}>Nome do titular <span className="text-[#5a5c63] font-medium">(opcional)</span></label>
          <input type="text" value={ptHolderName} onChange={(e) => setPtHolderName(e.target.value)} placeholder="Nome como aparece na conta" className={inputClass} />
        </div>
      </div>
    </>
  );

  const isSaveDisabled = isSaving || (
    (selectedMethod === 'pix' && !pixKey.trim()) ||
    (selectedMethod === 'bank_us' && (!usRoutingNumber.trim() || !usAccountNumber.trim())) ||
    (selectedMethod === 'bank_pt' && !ptIban.trim())
  );

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
          <label className={labelClass}>Pa{'\u00ed'}s de recebimento</label>
          <button onClick={() => setShowCountryPicker(!showCountryPicker)} className="w-full flex justify-between items-center bg-[#1b1c21] p-4 rounded-xl border border-white/[0.05] hover:bg-[#1f2025] transition-colors">
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
                <button key={country.code} onClick={() => { setSelectedCountry(country.code); setSelectedMethod(country.method); setShowCountryPicker(false); }} className={`w-full flex items-center gap-3 p-4 hover:bg-[#1f2025] transition-colors ${selectedCountry === country.code ? 'bg-[#1f2025]' : ''}`}>
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

        {selectedMethod === 'pix' && renderPixFields()}
        {selectedMethod === 'bank_us' && renderUSBankFields()}
        {selectedMethod === 'bank_pt' && renderPTBankFields()}

        <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 text-[12px] text-[#8e9196] font-medium leading-relaxed">
          <p className="text-white font-bold mb-1">Como funciona</p>
          <p>{BULLET} 80% do valor bruto {E_ACUTE} enviado para sua conta.</p>
          <p>{BULLET} 20% {E_ACUTE} comiss{'\u00e3'}o da plataforma.</p>
          <p>{BULLET} O saque {E_ACUTE} processado via Stripe ap{'\u00f3'}s valida{'\u00e7'}{'\u00e3'}o.</p>
        </div>
      </main>

      <footer className="p-5 flex-grow-0 flex-shrink-0 mb-4">
        <button onClick={handleSave} disabled={isSaveDisabled} className="w-full bg-[#1cb15f] text-white text-[15px] font-bold py-[14px] rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </footer>
    </div>
  );
};

export default ConfigureWithdrawalMethodScreen;
