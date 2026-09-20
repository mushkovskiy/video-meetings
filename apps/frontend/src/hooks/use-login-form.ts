'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { loginUser } from '@/lib/api';
import { saveSession } from '@/lib/auth-storage';
import { validateEmail, validateRequiredPassword } from '@/lib/validators';

import { useValidatedForm, type ValidatedForm } from './use-validated-form';

const FIELDS = ['email', 'password'] as const;
export type LoginField = (typeof FIELDS)[number];

const VALIDATORS = {
  email: validateEmail,
  password: validateRequiredPassword,
};

const INITIAL_VALUES = { email: '', password: '' };

export function useLoginForm(): ValidatedForm<LoginField> {
  const router = useRouter();

  const onValid = useCallback(
    async (values: Record<LoginField, string>) => {
      const { token, email } = await loginUser(values);
      saveSession({ token, email });
      router.push('/dashboard');
    },
    [router],
  );

  return useValidatedForm(FIELDS, VALIDATORS, INITIAL_VALUES, onValid);
}
