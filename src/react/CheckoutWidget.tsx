import React, { useEffect } from 'react';
import { PaymentSession } from '../types';
import { usePaymentStatus } from './index';

export interface ScanAndPayCheckoutProps {
  session: PaymentSession;
  pollUrl: string;
  onSuccess?: (sessionId: string) => void;
  onExpired?: () => void;
  theme?: 'light' | 'dark';
}

export const ScanAndPayCheckout: React.FC<ScanAndPayCheckoutProps> = ({
  session,
  pollUrl,
  onSuccess,
  onExpired,
  theme = 'light',
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

      <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', display: 'inline-block', marginBottom: '20px', border: '1px solid #eee' }}>
        <img src={session.qrUrl} alt="Scan to pay" style={{ display: 'block', width: '220px', height: '220px' }} />
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
