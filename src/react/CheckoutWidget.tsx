import React, { useEffect } from 'react';
import { PaymentSession } from '../types';
import { usePaymentStatus } from './index';

export interface CheckoutWidgetProps {
  session: PaymentSession;
  pollUrl: string;
  onSuccess?: (sessionId: string) => void;
  onExpired?: () => void;
  theme?: 'light' | 'dark';
  /** Override wordmark URLs (e.g. self-hosted under strict CSP). Defaults
   *  to Scan & Pay-hosted assets — see docs/design/qr-card-spec.md. */
  paytoWordmarkUrl?: string;
  payidWordmarkUrl?: string;
}

const DEFAULT_PAYTO_WORDMARK = 'https://shop.scanandpay.com.au/PayTo_wordmark-Black-WEB.png';
const DEFAULT_PAYID_WORDMARK = 'https://shop.scanandpay.com.au/PayID_wordmark-Black.png';

export const CheckoutWidget: React.FC<CheckoutWidgetProps> = ({
  session,
  pollUrl,
  onSuccess,
  onExpired,
  theme = 'light',
  paytoWordmarkUrl = DEFAULT_PAYTO_WORDMARK,
  payidWordmarkUrl = DEFAULT_PAYID_WORDMARK,
}) => {
  const { status, isPaid, isTerminal } = usePaymentStatus(session.sessionId, pollUrl);
  
  const bgColor = theme === 'dark' ? '#0A0118' : '#ffffff';
  const textColor = theme === 'dark' ? '#ffffff' : '#0A0118';
  const accentColor = '#008080'; // Scan & Pay Teal

  useEffect(() => {
    if (isPaid) {
      onSuccess?.(session.sessionId);
    } else if (isTerminal && status !== 'PAID') {
      onExpired?.();
    }
  }, [isPaid, isTerminal, status, session.sessionId, onSuccess, onExpired]);

  return (
    <div 
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '400px',
        margin: '20px auto',
        padding: '30px',
        borderRadius: '16px',
        background: bgColor,
        color: textColor,
        textAlign: 'center',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>Pay to</div>
        <div style={{ fontWeight: 600, fontSize: '18px' }}>{session.merchantName || 'Scan & Pay'}</div>
      </div>

      <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px', border: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          <img src={paytoWordmarkUrl} alt="PayTo" style={{ height: '22px', width: 'auto', display: 'block' }} loading="eager" decoding="sync" />
          <span aria-hidden="true" style={{ height: '18px', width: '1px', background: '#d1d5db' }} />
          <img src={payidWordmarkUrl} alt="PayID" style={{ height: '22px', width: 'auto', display: 'block' }} loading="eager" decoding="sync" />
        </div>
        <img src={session.qrUrl} alt="QR code — scan with your banking app to pay via PayTo PayID" style={{ display: 'block', width: '220px', height: '220px' }} />
      </div>

      <div style={{ marginBottom: '25px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: accentColor }}>
          {session.currency} ${session.amount.toFixed(2)}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
          Scan with any Australian bank app to pay via PayTo / PayID
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 500 }}>
        {status === 'PAID' ? (
          <span style={{ color: '#2bc48a' }}>✓ Payment Successful</span>
        ) : status === 'EXPIRED' || status === 'FAILED' ? (
          <span style={{ color: '#ff4d4d' }}>✕ Payment {status}</span>
        ) : (
          <>
            <div className="scanpay-spinner" style={{ 
              width: '18px', 
              height: '18px', 
              border: `2px solid ${accentColor}`, 
              borderTopColor: 'transparent', 
              borderRadius: '50%', 
              animation: 'scanpay-spin 0.8s linear infinite' 
            }}></div>
            Waiting for payment...
          </>
        )}
      </div>

      <style>
        {`@keyframes scanpay-spin { to { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
};
