import React, { useState } from 'react';
import { ToastType, PurchaseCurrency, PurchasePackage, CadastralData } from '../types';

// ═══ LIVE GO — Compra de diamantes via Payoneer Checkout (hospedado) ═══
// O usuário escolhe o método (Cartão / Pix / Payoneer) e é redirecionado ao
// checkout 100% hospedado do Payoneer para concluir o pagamento com segurança.
// Após pagar, volta para a LiveGo (return_url) e os diamantes são creditados
// quando o webhook do Payoneer confirma a aprovação.

type PayMethod = 'card' | 'pix' | 'payoneer';

interface ConfirmPurchaseScreenProps {
  onClose: () => void;
  packageDetails: PurchasePackage;
  onConfirmPurchase: (pkg: PurchasePackage, method?: PayMethod) => void;
  addToast: (type: ToastType, message: string) => void;
  currentUser: { id: string; email?: string; cadastral?: CadastralData };
}

const ConfirmPurchaseScreen: React.FC<ConfirmPurchaseScreenProps> = ({ onClose, packageDetails, onConfirmPurchase, addToast }) => {
  const [method, setMethod] = useState<PayMethod>('payoneer');
  const [processing, setProcessing] = useState(false);

  const methods: { id: PayMethod; title: string; subtitle: string; icon: string }[] = [
    { id: 'payoneer', title: 'Payoneer', subtitle: 'Checkout seguro internacional', icon: '🌐' },
    { id: 'card', title: 'Cartão de crédito', subtitle: 'Visado pelo checkout do Payoneer', icon: '💳' },
    { id: 'pix', title: 'Pix', subtitle: 'Disponível conforme o provedor', icon: '⚡' },
  ];

  const displayPrice = packageDetails.currency
    ? `${packageDetails.currency === 'BRL' ? 'R$' : packageDetails.currency === 'EUR' ? '€' : '$'} ${packageDetails.price.toFixed(2).replace('.', ',')}`
    : `R$ ${packageDetails.price.toFixed(2).replace('.', ',')}`;

  return (
    <div className="absolute inset-0 bg-[#0f1015] z-50 flex flex-col text-white">
      <header className="flex items-center p-4 py-5 flex-shrink-0">
        <button onClick={onClose} className="p-1 -ml-1 flex items-center justify-center text-gray-300 hover:text-white transition-colors" aria-label="Voltar">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-bold text-white ml-2">Confirmar Compra</h1>
      </header>

      <main className="flex-grow px-5 overflow-y-auto">
        {/* Resumo do pacote */}
        <div className="bg-[#17181c] border border-white/[0.05] rounded-2xl p-5 flex items-center justify-between mb-6">
          <div>
            <p className="text-[12px] text-gray-500 font-medium mb-1">Pacote selecionado</p>
            <p className="text-[22px] font-black text-amber-400">{packageDetails.diamonds.toLocaleString('pt-BR')} 💎</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-gray-500 font-medium mb-1">Valor a pagar</p>
            <p className="text-[22px] font-black text-white">{displayPrice}</p>
          </div>
        </div>

        {/* Escolha do método */}
        <p className="text-[13px] font-bold text-gray-300 mb-3">Como você quer pagar?</p>
        <div className="space-y-3 mb-6">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                method === m.id
                  ? 'bg-[#7a3be9]/15 border-[#7a3be9]'
                  : 'bg-[#17181c] border-white/[0.05] hover:bg-[#1e2025]'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-[#241a38] flex items-center justify-center text-[20px]">
                {m.icon}
              </div>
              <div className="flex-grow">
                <p className="font-bold text-[15px]">{m.title}</p>
                <p className="text-[12px] text-gray-500 font-medium">{m.subtitle}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === m.id ? 'border-[#7a3be9]' : 'border-gray-600'}`}>
                {method === m.id && <div className="w-2.5 h-2.5 rounded-full bg-[#7a3be9]" />}
              </div>
            </button>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 text-[12px] text-gray-500 font-medium leading-relaxed">
          <p className="font-bold text-gray-300 mb-1">🔒 Pagamento 100% seguro</p>
          Você será redirecionado(a) à página protegida do Payoneer para concluir o pagamento.
          Os diamantes são creditados automaticamente assim que o pagamento for aprovado.
        </div>
      </main>

      <footer className="p-5">
        <button
          onClick={() => {
            setProcessing(true);
            onConfirmPurchase(packageDetails, method);
          }}
          disabled={processing}
          className="w-full bg-[#7a3be9] hover:bg-[#6b2ed3] text-white text-[15px] font-bold py-[14px] rounded-full transition-colors disabled:opacity-60"
        >
          {processing ? 'Abrindo checkout...' : `Pagar via Payoneer`}
        </button>
        <p className="text-center text-[11px] text-gray-600 font-medium mt-3">
          Seguro e criptografado • Powered by Payoneer
        </p>
      </footer>
    </div>
  );
};

export default ConfirmPurchaseScreen;
