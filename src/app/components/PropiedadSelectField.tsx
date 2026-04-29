'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PropiedadSelectFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

// Wrapper sobre shadcn Select que:
// - Mapea '' ↔ undefined (Radix Select no permite value="")
// - Si el valor actual no está en la lista (datos viejos), lo agrega al final
//   como opción "(actual)" para que la edición no lo borre
export function PropiedadSelectField({
  value,
  onValueChange,
  options,
  placeholder = 'Seleccioná…',
  className,
  id,
  ariaLabel,
}: PropiedadSelectFieldProps) {
  const trimmed = (value ?? '').trim();
  const hasLegacyValue = trimmed !== '' && !options.includes(trimmed);

  return (
    <Select
      value={trimmed === '' ? undefined : trimmed}
      onValueChange={onValueChange}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
        {hasLegacyValue && (
          <SelectItem key={`__legacy__${trimmed}`} value={trimmed}>
            {trimmed} <span className="text-xs text-muted-foreground">(actual)</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
