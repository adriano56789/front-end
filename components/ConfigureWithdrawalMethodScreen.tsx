import React, { useState, useEffect } from 'react';
import { BackIcon, PixIcon, BankIcon, CheckCircleIcon, BrazilFlagIcon, PortugalFlagIcon, USAFlagIcon } from './icons';
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

type PaymentMethod = 'pix' | 'payoneer_account' | 'bank_eur' | 'bank_usd';

const ConfigureWithdrawalMethodScreen: React.FC<ConfigureWithdrawalMethodScreenProps> = ({ onClose, currentUser, updateUser, addToast }) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [pixKey, setPixKey] = useState('');
  const [mercadoPagoEmail, setMercadoPagoEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrNumber, setAddrNumber] = useState('');
  const [addrNeighborhood, setAddrNeighborhood] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrZip, setAddrZip] = useState('');
  const [addrCountry, setAddrCountry] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const userCountry = (currentUser.country || 'br').toLowerCase();
  
  useEffect(() => {
    if (currentUser.withdrawal_method) {
        const { method, details } = currentUser.withdrawal_method;
        if (method === 'pix' && details.pixKey) {
            setSelectedMethod('pix');
            setPixKey(details.pixKey);
        } else if (method === 'payoneer_account' && details.payoneerEmail) {
            setSelectedMethod('payoneer_account');
            setMercadoPagoEmail(details.payoneerEmail);
        } else if (method === 'mercado_pago' && details.email) {
            // Migração: contas antigas de Mercado Pago viram conta Payoneer
            setSelectedMethod('payoneer_account');
            setMercadoPagoEmail(details.email);
        } else if (method === 'bank' || method === 'bank_eur' || method === 'bank_usd') {
            if (method === 'bank_usd' || (details.currency || '').toUpperCase() === 'USD') {
                setSelectedMethod('bank_usd');
            } else {
                setSelectedMethod('bank_eur');
            }
            setBankName(details.bankName || '');
            setAccountHolder(details.accountHolder || '');
            setIban(details.iban || '');
            setSwiftBic(details.swiftBic || '');
            setAccountNumber(details.accountNumber || '');
            setRoutingNumber(details.routingNumber || '');
            const addr = details.address || {};
            setAddrStreet(addr.street || '');
            setAddrNumber(addr.number || '');
            setAddrNeighborhood(addr.neighborhood || '');
            setAddrCity(addr.city || '');
            setAddrState(addr.state || '');
            setAddrZip(addr.zipCode || '');
            setAddrCountry(addr.country || '');
        }
    } else {
        setSelectedMethod(userCountry === 'us' || userCountry === 'pt' ? 'bank_eur' : 'pix');
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
    } else if (selectedMethod === 'payoneer_account') {
        if (!mercadoPagoEmail.trim() || !/\S+@\S+\.\S+/.test(mercadoPagoEmail)) {
            addToast(ToastType.Error, "Por favor, insira um e-mail válido da conta Payoneer.");
            return;
        }
        method = 'payoneer_account';
        details = { payoneerEmail: mercadoPagoEmail };
    } else {
        if (!accountHolder.trim()) {
            addToast(ToastType.Error, "Por favor, insira o nome do titular da conta.");
            return;
        }
        if (!bankName.trim()) {
            addToast(ToastType.Error, "Por favor, insira o nome do banco.");
            return;
        }
        method = selectedMethod; // 'bank_eur' | 'bank_usd' — chave exata usada pelo fluxo Payoneer
        const addrComplete = addrStreet.trim() && addrCity.trim() && addrCountry.trim() &&
            addrNumber.trim() && addrNeighborhood.trim() && addrState.trim() && addrZip.trim();
        if (!addrComplete) {
            addToast(ToastType.Error, "Saque internacional exige endereço fiscal completo (rua, número, bairro, cidade, estado, CEP e país).");
            return;
        }
        const address = {
            street: addrStreet.trim(),
            number: addrNumber.trim(),
            neighborhood: addrNeighborhood.trim(),
            city: addrCity.trim(),
            state: addrState.trim(),
            zipCode: addrZip.trim(),
            country: addrCountry.trim(),
        };
        if (selectedMethod === 'bank_usd') {
            if (!accountNumber.trim()) {
                addToast(ToastType.Error, "Por favor, insira o número da conta.");
                return;
            }
            if (!routingNumber.trim()) {
                addToast(ToastType.Error, "Por favor, insira o routing number.");
                return;
            }
            details = {
                currency: 'USD',
                bankName,
                accountHolder,
                accountNumber,
                routingNumber,
                swiftBic,
                address,
            };
        } else {
            if (!iban.trim()) {
                addToast(ToastType.Error, "Por favor, insira o IBAN.");
                return;
            }
            details = {
                currency: 'EUR',
                bankName,
                accountHolder,
                iban,
                swiftBic,
                address,
            };
        }
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

  const isBank = selectedMethod === 'bank_eur' || selectedMethod === 'bank_usd';
  const isUS = selectedMethod === 'bank_usd';

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

      <main className="flex-grow px-5 py-2 space-y-6 overflow-y-auto no-scrollbar">
        <p className="text-[#8e9196] text-[13px] font-medium leading-relaxed pr-8">
          Selecione como você gostaria de receber seu dinheiro.
        </p>

        <div className="space-y-4">
          <div className="flex gap-4">
            <PaymentMethodButton method="pix" label="PIX" icon={<PixIcon className="w-[45px] h-[45px]" />} />
            <PaymentMethodButton method="payoneer_account" label="Payoneer" icon={<BankIcon className="w-[45px] h-[45px]" />} />
          </div>

          <div className="flex gap-4">
            <PaymentMethodButton method="bank_eur" label="Euro (PT)" icon={<PortugalFlagIcon className="w-[45px] h-[45px] rounded-sm object-cover" />} />
            <PaymentMethodButton method="bank_usd" label="Dólar (US)" icon={<USAFlagIcon className="w-[45px] h-[45px] rounded-sm object-cover" />} />
          </div>
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

        {selectedMethod === 'payoneer_account' && (
            <div className="space-y-2 mt-8">
                <label htmlFor="payoneer-email" className="text-[12px] font-bold text-[#8e9196] block ml-1">E-mail da conta Payoneer</label>
                <input
                    id="payoneer-email"
                    type="email"
                    value={mercadoPagoEmail}
                    onChange={(e) => setMercadoPagoEmail(e.target.value)}
                    placeholder="Seu e-mail da conta Payoneer"
                    className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                />
            </div>
        )}

        {isBank && (
          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-2 mb-2">
              {isUS ? <USAFlagIcon className="w-5 h-5 rounded-sm object-cover" /> : <PortugalFlagIcon className="w-5 h-5 rounded-sm object-cover" />}
              <span className="text-[13px] font-bold text-white">
                {isUS ? 'Conta Bancária — Dólar (Estados Unidos)' : 'Conta Bancária — Euro (Portugal)'}
              </span>
            </div>
            <div className="space-y-2">
                <label htmlFor="bank-holder" className="text-[12px] font-bold text-[#8e9196] block ml-1">Nome do Titular</label>
                <input
                    id="bank-holder"
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="Nome completo do titular"
                    className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="bank-name" className="text-[12px] font-bold text-[#8e9196] block ml-1">Nome do Banco</label>
                <input
                    id="bank-name"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ex.: Nubank, Banco do Brasil, Caixa"
                    className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                />
            </div>
            {isUS ? (
              <>
                <div className="space-y-2">
                    <label htmlFor="bank-account" className="text-[12px] font-bold text-[#8e9196] block ml-1">Número da Conta</label>
                    <input
                        id="bank-account"
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Número da conta bancária"
                        className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="bank-routing" className="text-[12px] font-bold text-[#8e9196] block ml-1">Routing Number</label>
                    <input
                        id="bank-routing"
                        type="text"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        placeholder="Routing number do banco (9 dígitos)"
                        className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                    />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                    <label htmlFor="bank-iban" className="text-[12px] font-bold text-[#8e9196] block ml-1">IBAN</label>
                    <input
                        id="bank-iban"
                        type="text"
                        value={iban}
                        onChange={(e) => setIban(e.target.value)}
                        placeholder="Código IBAN da sua conta"
                        className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="bank-swift" className="text-[12px] font-bold text-[#8e9196] block ml-1">SWIFT / BIC <span className="text-[#5a5c63] font-medium">(opcional)</span></label>
                    <input
                        id="bank-swift"
                        type="text"
                        value={swiftBic}
                        onChange={(e) => setSwiftBic(e.target.value)}
                        placeholder="Código SWIFT/BIC do banco"
                        className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                    />
                </div>
              </>
            )}

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#d97745] text-[13px] font-bold">Endereço Fiscal (obrigatório)</span>
              </div>
              <p className="text-[#8e9196] text-[12px] font-medium leading-relaxed mb-4">
                Exigido pela Receita Federal/Banco Central para saques internacionais (EUR/USD).
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="bank-addr-street" className="text-[12px] font-bold text-[#8e9196] block ml-1">Rua / Avenida</label>
                  <input
                    id="bank-addr-street"
                    type="text"
                    value={addrStreet}
                    onChange={(e) => setAddrStreet(e.target.value)}
                    placeholder="Nome da rua"
                    className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <label htmlFor="bank-addr-number" className="text-[12px] font-bold text-[#8e9196] block ml-1">Número</label>
                    <input
                      id="bank-addr-number"
                      type="text"
                      value={addrNumber}
                      onChange={(e) => setAddrNumber(e.target.value)}
                      placeholder="Nº"
                      className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label htmlFor="bank-addr-neighborhood" className="text-[12px] font-bold text-[#8e9196] block ml-1">Bairro</label>
                    <input
                      id="bank-addr-neighborhood"
                      type="text"
                      value={addrNeighborhood}
                      onChange={(e) => setAddrNeighborhood(e.target.value)}
                      placeholder="Bairro"
                      className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="bank-addr-city" className="text-[12px] font-bold text-[#8e9196] block ml-1">Cidade</label>
                  <input
                    id="bank-addr-city"
                    type="text"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="Cidade"
                    className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <label htmlFor="bank-addr-state" className="text-[12px] font-bold text-[#8e9196] block ml-1">Estado / UF</label>
                    <input
                      id="bank-addr-state"
                      type="text"
                      value={addrState}
                      onChange={(e) => setAddrState(e.target.value)}
                      placeholder="Ex.: SP"
                      className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label htmlFor="bank-addr-zip" className="text-[12px] font-bold text-[#8e9196] block ml-1">CEP / Postal Code</label>
                    <input
                      id="bank-addr-zip"
                      type="text"
                      value={addrZip}
                      onChange={(e) => setAddrZip(e.target.value)}
                      placeholder="00000-000"
                      className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="bank-addr-country" className="text-[12px] font-bold text-[#8e9196] block ml-1">País</label>
                  <input
                    id="bank-addr-country"
                    type="text"
                    value={addrCountry}
                    onChange={(e) => setAddrCountry(e.target.value)}
                    placeholder="País de residência fiscal"
                    className="w-full bg-[#1b1c21] text-white placeholder-[#5a5c63] text-[14px] font-medium rounded-xl p-[18px] focus:outline-none border border-white/[0.05]"
                  />
                </div>
              </div>
            </div>
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
