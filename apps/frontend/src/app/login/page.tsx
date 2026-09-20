'use client';

import { Button, Form, Input, Label, TextField } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { ApiError, loginUser } from '@/lib/api';
import { saveSession } from '@/lib/auth-storage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { token, email: loggedInEmail } = await loginUser({ email, password });
      saveSession({ token, email: loggedInEmail });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Form
        className="flex w-full max-w-sm flex-col gap-4"
        data-testid="login-form"
        validationBehavior="aria"
        onSubmit={handleSubmit}
      >
        <h1 className="text-xl font-semibold">Log in</h1>

        <TextField isRequired fullWidth name="email" value={email} onChange={setEmail}>
          <Label>Email</Label>
          <Input data-testid="login-email-input" placeholder="jane@example.com" />
        </TextField>

        <TextField
          isRequired
          fullWidth
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
        >
          <Label>Password</Label>
          <Input data-testid="login-password-input" placeholder="Your password" />
        </TextField>

        {error ? (
          <p className="text-sm text-red-600" data-testid="login-error">
            {error}
          </p>
        ) : null}

        <Button data-testid="login-submit-button" fullWidth isPending={isSubmitting} type="submit">
          Log in
        </Button>

        <p className="text-sm">
          Don&apos;t have an account? <Link href="/register">Register</Link>
        </p>
      </Form>
    </main>
  );
}
