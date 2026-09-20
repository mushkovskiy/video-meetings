'use client';

import { Alert, Button, Card, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent, type RefObject } from 'react';

import { PasswordInput } from '@/components/password-input';
import { ApiError, loginUser } from '@/lib/api';
import { saveSession } from '@/lib/auth-storage';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldName = 'email' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

function validateField(name: FieldName, value: string): string | undefined {
  if (name === 'email') {
    if (!value.trim()) return 'Enter your email address.';
    return EMAIL_PATTERN.test(value)
      ? undefined
      : 'Enter a valid email address, for example jane@example.com.';
  }

  return value ? undefined : 'Enter your password.';
}

export default function LoginPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldName, string>>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const setField = (name: FieldName) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) =>
      current[name] && !validateField(name, value) ? { ...current, [name]: undefined } : current,
    );
  };

  const validateOnBlur = (name: FieldName) => () => {
    setFieldErrors((current) => ({ ...current, [name]: validateField(name, values[name]) }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const order: FieldName[] = ['email', 'password'];
    const nextErrors: FieldErrors = {};
    for (const name of order) {
      nextErrors[name] = validateField(name, values[name]);
    }
    setFieldErrors(nextErrors);

    const firstInvalid = order.find((name) => nextErrors[name]);
    if (firstInvalid) {
      const refs: Record<FieldName, RefObject<HTMLInputElement | null>> = {
        email: emailRef,
        password: passwordRef,
      };
      setFormError('Check the highlighted fields and try again.');
      refs[firstInvalid].current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const { token, email } = await loginUser(values);
      saveSession({ token, email });
      router.push('/dashboard');
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title className="text-2xl" render={(props) => <h1 {...props} />}>
            Welcome back
          </Card.Title>
          <Card.Description>Log in to join and schedule your meetings.</Card.Description>
        </Card.Header>

        <Card.Content>
          <Form
            className="flex flex-col gap-5"
            data-testid="login-form"
            validationBehavior="aria"
            onSubmit={handleSubmit}
          >
            {formError ? (
              <Alert data-testid="login-error" role="alert" status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{formError}</Alert.Title>
                </Alert.Content>
              </Alert>
            ) : null}

            <TextField
              fullWidth
              isInvalid={Boolean(fieldErrors.email)}
              isRequired
              name="email"
              type="email"
              value={values.email}
              onBlur={validateOnBlur('email')}
              onChange={setField('email')}
            >
              <Label>Email</Label>
              <Input
                autoComplete="email"
                data-testid="login-email-input"
                placeholder="jane@example.com"
                ref={emailRef}
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </TextField>

            <TextField
              fullWidth
              isInvalid={Boolean(fieldErrors.password)}
              isRequired
              name="password"
              value={values.password}
              onBlur={validateOnBlur('password')}
              onChange={setField('password')}
            >
              <Label>Password</Label>
              <PasswordInput
                autoComplete="current-password"
                placeholder="Your password"
                ref={passwordRef}
                testId="login-password-input"
              />
              <FieldError>{fieldErrors.password}</FieldError>
            </TextField>

            <Button
              data-testid="login-submit-button"
              fullWidth
              isPending={isSubmitting}
              size="lg"
              type="submit"
            >
              Log in
            </Button>
          </Form>
        </Card.Content>

        <Card.Footer>
          <p className="text-muted w-full text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link className="link underline" href="/register">
              Register
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </main>
  );
}
