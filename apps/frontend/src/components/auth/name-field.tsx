import { FieldError, Input, Label, TextField } from '@heroui/react';
import type { RefObject } from 'react';

type NameFieldProps = {
  autoComplete: 'given-name' | 'family-name';
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  testId: string;
  value: string;
};

export function NameField({
  autoComplete,
  error,
  inputRef,
  label,
  name,
  onBlur,
  onChange,
  placeholder,
  testId,
  value,
}: NameFieldProps) {
  return (
    <TextField
      fullWidth
      isInvalid={Boolean(error)}
      isRequired
      name={name}
      value={value}
      onBlur={onBlur}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <Input
        autoComplete={autoComplete}
        data-testid={testId}
        placeholder={placeholder}
        ref={inputRef}
      />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
