import { FieldError, Input, Label, TextField } from '@heroui/react';
import type { RefObject } from 'react';

type EmailFieldProps = {
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onBlur: () => void;
  onChange: (value: string) => void;
  testId: string;
  value: string;
};

export function EmailField({ error, inputRef, onBlur, onChange, testId, value }: EmailFieldProps) {
  return (
    <TextField
      fullWidth
      isInvalid={Boolean(error)}
      isRequired
      name="email"
      type="email"
      value={value}
      onBlur={onBlur}
      onChange={onChange}
    >
      <Label>Email</Label>
      <Input
        autoComplete="email"
        data-testid={testId}
        placeholder="jane@example.com"
        ref={inputRef}
      />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
