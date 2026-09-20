const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Enter your email address.';
  return EMAIL_PATTERN.test(value)
    ? undefined
    : 'Enter a valid email address, for example jane@example.com.';
}

export function validateRequiredText(label: string) {
  return (value: string): string | undefined => (value.trim() ? undefined : `Enter your ${label}.`);
}

export function validateRequiredPassword(value: string): string | undefined {
  return value ? undefined : 'Enter your password.';
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) return 'Choose a password.';
  return value.length >= MIN_PASSWORD_LENGTH
    ? undefined
    : `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
}

export { MIN_PASSWORD_LENGTH };
