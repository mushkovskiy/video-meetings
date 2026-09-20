'use client';

import {
  Alert,
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent, type RefObject } from 'react';

import { PasswordInput } from '@/components/password-input';
import { ApiError, registerUser } from '@/lib/api';
import { saveProfile } from '@/lib/auth-storage';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type FieldName = 'firstName' | 'lastName' | 'email' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

function validateField(name: FieldName, value: string): string | undefined {
  switch (name) {
    case 'firstName':
      return value.trim() ? undefined : 'Enter your first name.';
    case 'lastName':
      return value.trim() ? undefined : 'Enter your last name.';
    case 'email':
      if (!value.trim()) return 'Enter your email address.';
      return EMAIL_PATTERN.test(value)
        ? undefined
        : 'Enter a valid email address, for example jane@example.com.';
    case 'password':
      if (!value) return 'Choose a password.';
      return value.length >= MIN_PASSWORD_LENGTH
        ? undefined
        : `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldName, string>>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const setField = (name: FieldName) => (value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    // Clear the error as soon as the field becomes valid, so the message
    // doesn't linger while the user is fixing it.
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

    const order: FieldName[] = ['firstName', 'lastName', 'email', 'password'];
    const nextErrors: FieldErrors = {};
    for (const name of order) {
      nextErrors[name] = validateField(name, values[name]);
    }
    setFieldErrors(nextErrors);

    const firstInvalid = order.find((name) => nextErrors[name]);
    if (firstInvalid) {
      const refs: Record<FieldName, RefObject<HTMLInputElement | null>> = {
        firstName: firstNameRef,
        lastName: lastNameRef,
        email: emailRef,
        password: passwordRef,
      };
      setFormError('Check the highlighted fields and try again.');
      refs[firstInvalid].current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser(values);
      saveProfile(values.email, { firstName: values.firstName, lastName: values.lastName });
      router.push('/login');
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
            Create an account
          </Card.Title>
          <Card.Description>Sign up to start scheduling video meetings.</Card.Description>
        </Card.Header>

        <Card.Content>
          <Form
            className="flex flex-col gap-5"
            data-testid="register-form"
            validationBehavior="aria"
            onSubmit={handleSubmit}
          >
            {formError ? (
              <Alert data-testid="register-error" role="alert" status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{formError}</Alert.Title>
                </Alert.Content>
              </Alert>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                fullWidth
                isInvalid={Boolean(fieldErrors.firstName)}
                isRequired
                name="firstName"
                value={values.firstName}
                onBlur={validateOnBlur('firstName')}
                onChange={setField('firstName')}
              >
                <Label>First name</Label>
                <Input
                  autoComplete="given-name"
                  data-testid="register-firstName-input"
                  placeholder="Jane"
                  ref={firstNameRef}
                />
                <FieldError>{fieldErrors.firstName}</FieldError>
              </TextField>

              <TextField
                fullWidth
                isInvalid={Boolean(fieldErrors.lastName)}
                isRequired
                name="lastName"
                value={values.lastName}
                onBlur={validateOnBlur('lastName')}
                onChange={setField('lastName')}
              >
                <Label>Last name</Label>
                <Input
                  autoComplete="family-name"
                  data-testid="register-lastName-input"
                  placeholder="Doe"
                  ref={lastNameRef}
                />
                <FieldError>{fieldErrors.lastName}</FieldError>
              </TextField>
            </div>

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
                data-testid="register-email-input"
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
                autoComplete="new-password"
                placeholder="Create a password"
                ref={passwordRef}
                testId="register-password-input"
              />
              {fieldErrors.password ? (
                <FieldError>{fieldErrors.password}</FieldError>
              ) : (
                <Description>At least {MIN_PASSWORD_LENGTH} characters.</Description>
              )}
            </TextField>

            <Button
              data-testid="register-submit-button"
              fullWidth
              isPending={isSubmitting}
              size="lg"
              type="submit"
            >
              Create account
            </Button>
          </Form>
        </Card.Content>

        <Card.Footer>
          <p className="text-muted w-full text-center text-sm">
            Already have an account?{' '}
            <Link className="link underline" href="/login">
              Log in
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </main>
  );
}
