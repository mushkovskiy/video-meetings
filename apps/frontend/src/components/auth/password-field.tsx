import { FieldError, Label, TextField } from '@heroui/react';
import type { ReactNode, RefObject } from 'react';

import { PasswordInput } from '@/components/password-input';

type PasswordFieldProps = {
  autoComplete: 'current-password' | 'new-password';
  description?: ReactNode;
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  testId: string;
  value: string;
};

export function PasswordField({
  autoComplete,
  description,
  error,
  inputRef,
  onBlur,
  onChange,
  placeholder,
  testId,
  value,
}: PasswordFieldProps) {
  return (
    <TextField
      fullWidth
      isInvalid={Boolean(error)}
      isRequired
      name="password"
      value={value}
      onBlur={onBlur}
      onChange={onChange}
    >
      <Label>Password</Label>
      <PasswordInput
        autoComplete={autoComplete}
        placeholder={placeholder}
        ref={inputRef}
        testId={testId}
      />
      {error ? <FieldError>{error}</FieldError> : description}
    </TextField>
  );
}
