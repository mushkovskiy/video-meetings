'use client';

import { Button, Card, Form } from '@heroui/react';
import Link from 'next/link';

import { EmailField } from '@/components/auth/email-field';
import { FormErrorAlert } from '@/components/auth/form-error-alert';
import { PasswordField } from '@/components/auth/password-field';
import { useLoginForm } from '@/hooks/use-login-form';

export default function LoginPage() {
  const {
    values,
    fieldErrors,
    formError,
    isSubmitting,
    refs,
    setField,
    validateOnBlur,
    handleSubmit,
  } = useLoginForm();

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
            <FormErrorAlert message={formError} testId="login-error" />

            <EmailField
              error={fieldErrors.email}
              inputRef={refs.email}
              testId="login-email-input"
              value={values.email}
              onBlur={validateOnBlur('email')}
              onChange={setField('email')}
            />

            <PasswordField
              autoComplete="current-password"
              error={fieldErrors.password}
              inputRef={refs.password}
              placeholder="Your password"
              testId="login-password-input"
              value={values.password}
              onBlur={validateOnBlur('password')}
              onChange={setField('password')}
            />

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
