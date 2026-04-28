import { createContext, useContext } from 'react';

interface MathContextType {
  currentState: Record<string, unknown>;
  updateState: (key: string, value: unknown) => void;
}

export const MathContext = createContext<MathContextType | null>(null);

export const useMathContext = () => {
  const context = useContext(MathContext);
  if (!context) {
    throw new Error('useMathContext must be used within a MathContext.Provider');
  }
  return context;
};