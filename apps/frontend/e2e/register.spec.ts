import { expect, test } from '@playwright/test';

const uniqueEmail = () => `jane.doe.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;

test.describe('Registration', () => {
  test('registers a new user and redirects to the dashboard', async ({ page }) => {
    await page.goto('/register');

    await page.getByTestId('register-firstName-input').fill('Jane');
    await page.getByTestId('register-lastName-input').fill('Doe');
    await page.getByTestId('register-email-input').fill(uniqueEmail());
    await page.getByTestId('register-password-input').fill('super-secret-1');
    await page.getByTestId('register-submit-button').click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('dashboard-welcome')).toContainText('Jane');
  });

  test('shows a validation error for an invalid email', async ({ page }) => {
    await page.goto('/register');

    await page.getByTestId('register-firstName-input').fill('Jane');
    await page.getByTestId('register-lastName-input').fill('Doe');
    await page.getByTestId('register-email-input').fill('not-an-email');
    await page.getByTestId('register-password-input').fill('super-secret-1');
    await page.getByTestId('register-submit-button').click();

    await expect(page.getByTestId('register-error')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('shows a server error when the email is already registered', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/register');
    await page.getByTestId('register-firstName-input').fill('Jane');
    await page.getByTestId('register-lastName-input').fill('Doe');
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('super-secret-1');
    await page.getByTestId('register-submit-button').click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/register');
    await page.getByTestId('register-firstName-input').fill('Jane');
    await page.getByTestId('register-lastName-input').fill('Doe');
    await page.getByTestId('register-email-input').fill(email);
    await page.getByTestId('register-password-input').fill('super-secret-1');
    await page.getByTestId('register-submit-button').click();

    await expect(page.getByTestId('register-error')).toBeVisible();
  });
});
