import { expect, test } from '@playwright/test';

const uniqueEmail = () =>
  `john.smith.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
const PASSWORD = 'super-secret-1';

const registerUser = async (page: import('@playwright/test').Page, email: string) => {
  await page.goto('/register');
  await page.getByTestId('register-firstName-input').fill('John');
  await page.getByTestId('register-lastName-input').fill('Smith');
  await page.getByTestId('register-email-input').fill(email);
  await page.getByTestId('register-password-input').fill(PASSWORD);
  await page.getByTestId('register-submit-button').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByTestId('dashboard-logout-button').click();
  await expect(page).toHaveURL(/\/login$/);
};

test.describe('Login', () => {
  test('logs in a registered user and redirects to the dashboard', async ({ page }) => {
    const email = uniqueEmail();
    await registerUser(page, email);

    await page.getByTestId('login-email-input').fill(email);
    await page.getByTestId('login-password-input').fill(PASSWORD);
    await page.getByTestId('login-submit-button').click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('dashboard-welcome')).toContainText('John');
  });

  test('shows an error for an incorrect password', async ({ page }) => {
    const email = uniqueEmail();
    await registerUser(page, email);

    await page.goto('/login');
    await page.getByTestId('login-email-input').fill(email);
    await page.getByTestId('login-password-input').fill('wrong-password');
    await page.getByTestId('login-submit-button').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('shows an error for an email that was never registered', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('login-email-input').fill(uniqueEmail());
    await page.getByTestId('login-password-input').fill(PASSWORD);
    await page.getByTestId('login-submit-button').click();

    await expect(page.getByTestId('login-error')).toBeVisible();
  });
});
