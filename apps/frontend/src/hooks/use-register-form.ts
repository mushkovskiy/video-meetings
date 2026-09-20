'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { loginUser, registerUser } from '@/lib/api';
import { saveProfile, saveSession } from '@/lib/auth-storage';
import { validateEmail, validateNewPassword, validateRequiredText } from '@/lib/validators';

import { useValidatedForm, type ValidatedForm } from './use-validated-form';

const FIELDS = ['firstName', 'lastName', 'email', 'password'] as const;
export type RegisterField = (typeof FIELDS)[number];

const VALIDATORS = {
  firstName: validateRequiredText('first name'),
  lastName: validateRequiredText('last name'),
  email: validateEmail,
  password: validateNewPassword,
};

const INITIAL_VALUES = { firstName: '', lastName: '', email: '', password: '' };

export function useRegisterForm(): ValidatedForm<RegisterField> {
  const router = useRouter();

  const onValid = useCallback(
    async (values: Record<RegisterField, string>) => {
      await registerUser(values);
      saveProfile(values.email, { firstName: values.firstName, lastName: values.lastName });

      // The login API is the only one that issues a token; register the
      // account, then log in with the same credentials so the user lands
      // on the dashboard already authenticated instead of at /login.
      const { token, email } = await loginUser({ email: values.email, password: values.password });
      saveSession({ token, email });
      router.push('/dashboard');
    },
    [router],
  );

  return useValidatedForm(FIELDS, VALIDATORS, INITIAL_VALUES, onValid);
}
