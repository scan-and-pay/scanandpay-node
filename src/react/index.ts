import { useState, useEffect } from 'react';

export * from './CheckoutWidget';

export function usePaymentStatus(sessionId: string | null, pollUrl: string) {
  const [status, setStatus] = useState<string>('WAITING');
  const [isPaid, setIsPaid] = useState(false);
  const [isTerminal, setIsTerminal] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId || isTerminal) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${pollUrl}?sessionId=${sessionId}`);
        const data = await res.json();

        setStatus(data.status);

        if (data.status === 'PAID') {
          setIsPaid(true);
          setIsTerminal(true);
          clearInterval(interval);
        } else if (data.status === 'EXPIRED' || data.status === 'FAILED') {
          setIsTerminal(true);
          clearInterval(interval);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Polling failed'));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, isTerminal, pollUrl]);

  return { status, isPaid, isTerminal, error };
}
