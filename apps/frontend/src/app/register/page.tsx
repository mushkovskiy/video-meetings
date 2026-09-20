'use client';

import { Button, Card, Description, Form } from '@heroui/react';
import Link from 'next/link';

import { EmailField } from '@/components/auth/email-field';
import { FormErrorAlert } from '@/components/auth/form-error-alert';
import { NameField } from '@/components/auth/name-field';
import { PasswordField } from '@/components/auth/password-field';
import { useRegisterForm } from '@/hooks/use-register-form';
import { MIN_PASSWORD_LENGTH } from '@/lib/validators';

export default function RegisterPage() {
  const {
    values,
    fieldErrors,
    formError,
    isSubmitting,
    refs,
    setField,
    validateOnBlur,
    handleSubmit,
  } = useRegisterForm();

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
            <FormErrorAlert message={formError} testId="register-error" />

            <div className="grid gap-5 sm:grid-cols-2">
              <NameField
                autoComplete="given-name"
                error={fieldErrors.firstName}
                inputRef={refs.firstName}
                label="First name"
                name="firstName"
                placeholder="Jane"
                testId="register-firstName-input"
                value={values.firstName}
                onBlur={validateOnBlur('firstName')}
                onChange={setField('firstName')}
              />

              <NameField
                autoComplete="family-name"
                error={fieldErrors.lastName}
                inputRef={refs.lastName}
                label="Last name"
                name="lastName"
                placeholder="Doe"
                testId="register-lastName-input"
                value={values.lastName}
                onBlur={validateOnBlur('lastName')}
                onChange={setField('lastName')}
              />
            </div>

            <EmailField
              error={fieldErrors.email}
              inputRef={refs.email}
              testId="register-email-input"
              value={values.email}
              onBlur={validateOnBlur('email')}
              onChange={setField('email')}
            />

            <PasswordField
              autoComplete="new-password"
              description={<Description>At least {MIN_PASSWORD_LENGTH} characters.</Description>}
              error={fieldErrors.password}
              inputRef={refs.password}
              placeholder="Create a password"
              testId="register-password-input"
              value={values.password}
              onBlur={validateOnBlur('password')}
              onChange={setField('password')}
            />

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
