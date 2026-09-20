import { Button } from '@heroui/react';

type DashboardHeaderProps = {
  displayName: string;
  email: string;
  onLogout: () => void;
};

export function DashboardHeader({ displayName, email, onLogout }: DashboardHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div data-testid="dashboard-welcome">
        <h1 className="text-xl font-semibold">Добро пожаловать, {displayName}!</h1>
        <p className="text-muted text-sm" data-testid="dashboard-email">
          {email}
        </p>
      </div>
      <Button data-testid="dashboard-logout-button" variant="secondary" onPress={onLogout}>
        Выйти из аккаунта
      </Button>
    </header>
  );
}
