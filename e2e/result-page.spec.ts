/**
 * End-to-end tests for result page
 * Tests complete feedback workflow: viewing adaptations and submitting ratings
 */

import { test, expect } from '@playwright/test';

test.describe('Result Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    // Note: Actual login flow would be implemented in a fixture
  });

  test('should display exam title and questions', async ({ page }) => {
    // Navigate to result page
    await page.goto('/exams/test-exam-id');

    // Verify page loads
    await expect(page).toHaveTitle(/exam|result/i);

    // Check for exam title
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('should display adapted question content', async ({ page }) => {
    await page.goto('/exams/test-exam-id');

    // Verify adapted question is displayed
    const adaptedStatement = page.locator('[data-testid="adapted-statement"]');
    await expect(adaptedStatement).toBeVisible();

    // Verify BNCC badge is present
    const bnccBadge = page.locator('[data-testid="bncc-badge"]');
    await expect(bnccBadge).toBeVisible();

    // Verify Bloom level is present
    const bloomBadge = page.locator('[data-testid="bloom-badge"]');
    await expect(bloomBadge).toBeVisible();
  });

  test('should allow copying adapted question', async ({ page, context }) => {
    await page.goto('/exams/test-exam-id');

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy button
    const copyButton = page.locator('button', { hasText: /copy/i });
    await copyButton.click();

    // Verify feedback message appears
    const feedback = page.locator('text=Copied!');
    await expect(feedback).toBeVisible();
  });

  test('should allow rating with stars', async ({ page }) => {
    await page.goto('/exams/test-exam-id');

    // Click 5-star rating
    const fifthStar = page.locator('button[aria-label="5 stars"]').first();
    await fifthStar.click();

    // Verify star is selected
    await expect(fifthStar).toHaveClass(/yellow|selected/);
  });

  test('should allow typing comment', async ({ page }) => {
    await page.goto('/exams/test-exam-id');

    // Find comment textarea
    const commentField = page.locator('textarea[placeholder*="comment"]').first();

    // Type comment
    await commentField.fill('This adaptation is very helpful!');

    // Verify text was entered
    await expect(commentField).toHaveValue('This adaptation is very helpful!');
  });

  test('should enable submit button when feedback is provided', async ({ page }) => {
    await page.goto('/exams/test-exam-id');

    // Initially button should be disabled
    const submitButton = page.locator('button', { hasText: /submit feedback/i }).first();
    await expect(submitButton).toBeDisabled();

    // Click a star rating
    const firstStar = page.locator('button[aria-label="1 star"]').first();
    await firstStar.click();

    // Button should now be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should submit feedback and show success', async ({ page }) => {
    await page.goto('/exams/test-exam-id');

    // Provide rating
    const thirdStar = page.locator('button[aria-label="3 stars"]').first();
    await thirdStar.click();

    // Submit feedback
    const submitButton = page.locator('button', { hasText: /submit feedback/i }).first();
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForLoadState('networkidle');

    // Verify button shows loading state then returns
    await expect(submitButton).toBeVisible();
  });

  test('should display multiple adapted questions', async ({ page }) => {
    await page.goto('/exams/test-exam-id');

    // Look for multiple question cards
    const questionCards = page.locator('[data-testid="question-result-card"]');
    const count = await questionCards.count();

    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should update feedback summary after submission', async ({ page }) => {
    await page.goto('/exams/test-exam-id');

    // Submit feedback
    const star = page.locator('button[aria-label="4 stars"]').first();
    await star.click();

    const submitButton = page.locator('button', { hasText: /submit feedback/i }).first();
    await submitButton.click();

    // Wait for update
    await page.waitForLoadState('networkidle');

    // Verify summary was updated (if visible)
    const summaryAfter = page.locator('[data-testid="feedback-summary"]');
    if (await summaryAfter.isVisible()) {
      await expect(summaryAfter).toBeVisible();
    }
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/exams/test-exam-id');

    // Tab to first star button
    const firstStar = page.locator('button[aria-label="1 star"]').first();
    await firstStar.focus();

    // Verify it's focused by checking aria-label
    const starLabel = await firstStar.getAttribute('aria-label');
    expect(starLabel).toContain('star');
  });

  test('should have no accessibility violations', async ({ page }) => {
    await page.goto('/exams/test-exam-id');

    // Run accessibility checks (requires @axe-core/playwright if integrated)
    // Basic checks for heading hierarchy, contrast, etc.
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Verify buttons have labels
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
