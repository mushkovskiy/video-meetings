import { Alert } from '@heroui/react';

type FormErrorAlertProps = {
  message: string | null;
  testId: string;
};

export function FormErrorAlert({ message, testId }: FormErrorAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <Alert data-testid={testId} role="alert" status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{message}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}
