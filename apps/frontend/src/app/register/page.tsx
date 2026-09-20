'use client';

import { Button, Form, Input, Label, TextField } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { ApiError, registerUser } from '@/lib/api';
import { saveProfile } from '@/lib/auth-storage';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await registerUser({ firstName, lastName, email, password });
      saveProfile(email, { firstName, lastName });
      router.push('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Form
        className="flex w-full max-w-sm flex-col gap-4"
        data-testid="register-form"
        validationBehavior="aria"
        onSubmit={handleSubmit}
      >
        <h1 className="text-xl font-semibold">Create an account</h1>

        <TextField isRequired fullWidth name="firstName" value={firstName} onChange={setFirstName}>
          <Label>First name</Label>
          <Input data-testid="register-firstName-input" placeholder="Jane" />
        </TextField>

        <TextField isRequired fullWidth name="lastName" value={lastName} onChange={setLastName}>
          <Label>Last name</Label>
          <Input data-testid="register-lastName-input" placeholder="Doe" />
        </TextField>

        <TextField isRequired fullWidth name="email" value={email} onChange={setEmail}>
          <Label>Email</Label>
          <Input data-testid="register-email-input" placeholder="jane@example.com" />
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
          <Input data-testid="register-password-input" placeholder="At least 6 characters" />
        </TextField>

        {error ? (
          <p className="text-sm text-red-600" data-testid="register-error">
            {error}
          </p>
        ) : null}

        <Button
          data-testid="register-submit-button"
          fullWidth
          isPending={isSubmitting}
          type="submit"
        >
          Register
        </Button>

        <p className="text-sm">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </Form>
    </main>
  );
}
