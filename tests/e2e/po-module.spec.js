const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

test.describe('Purchase Order module', () => {
  test('blocks an over-allocation before creating the PO', async ({ page }) => {
    await page.goto('/purchase-orders/new');

    const availableLine = page.getByTestId('available-line-22222222-2222-2222-2222-222222222002');
    await expect(availableLine).toBeVisible();
    await availableLine.click();

    await page.getByLabel('Vendor Name').fill('PT Test Supplier');
    await page
      .getByTestId('allocate-qty-22222222-2222-2222-2222-222222222002')
      .fill('31');
    await page.getByTestId('save-po').click();

    await expect(page.getByTestId('po-error')).toHaveText(
      'GLV-IND: allocation quantity must be greater than 0 and cannot exceed the remaining quantity of 30.',
    );
    await expect(page.getByTestId('po-success')).toHaveCount(0);
  });

  test('creates a draft PO from an approved PR line', async ({ page }) => {
    await page.goto('/purchase-orders/new');

    const availableLine = page.getByTestId('available-line-22222222-2222-2222-2222-222222222001');
    await expect(availableLine).toBeVisible();
    await availableLine.click();

    await page.getByLabel('Vendor Name').fill('PT E2E Supplier');
    await page.getByTestId('allocate-qty-22222222-2222-2222-2222-222222222001').fill('8');

    const createResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/purchase-orders') && response.request().method() === 'POST',
    );
    await page.getByTestId('save-po').click();
    const response = await createResponse;

    expect(response.status()).toBe(201);
    await expect(page.getByTestId('po-success')).toHaveText(
      /Purchase order PO-2026-\d{4} was saved as a draft\./,
    );
    await expect(page.getByTestId('po-error')).toHaveCount(0);
  });
});
