import React, { useState, useEffect } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChangeValue: (val: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChangeValue, ...props }) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    // Only update if not currently focused, or if the parsed value differs (e.g. set by external logic)
    // Actually, just format the initial value or external changes
    const formatInitial = (val: number) => {
      if (isNaN(val)) return '';
      return (val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    setDisplayValue(formatInitial(value || 0));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setDisplayValue('');
      onChangeValue(0);
      return;
    }
    const numValue = parseInt(rawValue, 10) / 100;
    const formatted = numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    setDisplayValue(formatted);
    onChangeValue(numValue);
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      {...props}
    />
  );
};
