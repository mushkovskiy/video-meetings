'use client';

import { Button, InputGroup } from '@heroui/react';
import { useState, type Ref } from 'react';

function EyeIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
    >
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.25" />
      {isOpen ? null : <path d="m4 20 16-16" strokeLinecap="round" />}
    </svg>
  );
}

type PasswordInputProps = {
  autoComplete: 'current-password' | 'new-password';
  placeholder: string;
  ref?: Ref<HTMLInputElement>;
  testId: string;
};

export function PasswordInput({ autoComplete, placeholder, ref, testId }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <InputGroup fullWidth>
      <InputGroup.Input
        autoComplete={autoComplete}
        data-testid={testId}
        placeholder={placeholder}
        ref={ref}
        type={isVisible ? 'text' : 'password'}
      />
      <InputGroup.Suffix>
        <Button
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          isIconOnly
          size="sm"
          variant="ghost"
          onPress={() => setIsVisible((visible) => !visible)}
        >
          <EyeIcon isOpen={isVisible} />
        </Button>
      </InputGroup.Suffix>
    </InputGroup>
  );
}
