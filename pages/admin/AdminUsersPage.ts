import { By, until, WebElement } from 'selenium-webdriver';
import { expect } from 'chai';
import { BasePage } from '../BasePage';

const DEFAULT_TIMEOUT = 15000;

export interface UserFormData {
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
}

/** /admin/users — list (with role filter), create, edit, delete. */
export class AdminUsersPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/admin/users');
  }

  async filterByRole(role: 'STUDENT' | 'PROFESSOR' | 'ADMIN' | ''): Promise<void> {
    await this.selectByLabel('Filter by Role', role);
    // The filter <select> auto-submits via onchange, a real page navigation —
    // wait for the table to re-render before the caller asserts on it.
    await this.driver.wait(until.elementLocated(By.css('table')), DEFAULT_TIMEOUT);
  }

  /**
   * Rows carry `data-testid="user-row-{numeric id}"`, unknown before
   * creation — matched by username text instead (a plain `<td>`).
   */
  private userRowLocator(username: string): By {
    return By.xpath(`//tr[td[normalize-space()="${username}"]]`);
  }

  private async findUserRow(username: string, timeout = DEFAULT_TIMEOUT): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(this.userRowLocator(username)), timeout);
  }

  /**
   * `/admin/users/register` redirects to `/dashboard` on success (not back
   * to the list) — navigates back to `/admin/users` itself once done, so
   * callers don't need to know that quirk (mirrors the Playwright repo's
   * own `AdminUsersPage.createUser()`). Waiting for that `/dashboard`
   * redirect to actually land before navigating away again is required,
   * not defensive: on Firefox, calling `this.open()` right after the
   * submit click races GeckoDriver's own click-then-navigate completion
   * timing — confirmed 100% reproducible (H6, see
   * ../../Master-thesis-final-project-code/docs/FRAMEWORK-EVALUATION-RESULTS.md) —
   * where the second navigation can start before the first redirect
   * resolves, leaving the browser stuck mid-navigation instead of on
   * `/admin/users`, so the new row is never actually there to find.
   */
  async createUser(data: Required<UserFormData>): Promise<void> {
    await this.waitAndClick(By.css('[data-testid="create-user-button"]'));
    await this.driver.wait(until.elementLocated(By.css('[data-testid="user-form"]')), DEFAULT_TIMEOUT);
    await this.fillByLabel('Username', data.username);
    await this.fillByLabel('Password', data.password);
    await this.fillByLabel('First Name', data.firstName);
    await this.fillByLabel('Last Name', data.lastName);
    await this.fillByLabel('Email', data.email);
    await this.selectByLabel('Role', data.role);
    await this.waitAndClick(By.css('[data-testid="user-form-submit"]'));
    await this.waitForUrlContains('/dashboard');
    await this.open();
  }

  /**
   * Same unguarded-redirect race as `createUser()` (see its comment) — the
   * edit form's submit also redirects (to `/admin/users`), and callers
   * immediately re-navigate to that same URL. Waiting for the form itself
   * to go stale confirms the redirect actually landed before returning,
   * found on Firefox via H6's re-verification pass (GeckoDriver's
   * click-then-navigate timing again), same as `createUser()`.
   */
  async editUser(username: string, data: Omit<UserFormData, 'username' | 'password'>): Promise<void> {
    const row = await this.findUserRow(username);
    await this.click(await row.findElement(By.css('[data-testid^="edit-user-"]')));
    const form = await this.driver.wait(until.elementLocated(By.css('[data-testid="user-form"]')), DEFAULT_TIMEOUT);
    if (data.firstName) await this.fillByLabel('First Name', data.firstName);
    if (data.lastName) await this.fillByLabel('Last Name', data.lastName);
    if (data.email) await this.fillByLabel('Email', data.email);
    if (data.role) await this.selectByLabel('Role', data.role);
    await this.waitAndClick(By.css('[data-testid="user-form-submit"]'));
    await this.driver.wait(until.stalenessOf(form), DEFAULT_TIMEOUT);
  }

  /** Native `confirm()` dialog, same pattern as AdminCoursesPage.deleteCourse. */
  async deleteUser(username: string): Promise<void> {
    const row = await this.findUserRow(username);
    await this.click(await row.findElement(By.css('[data-testid^="delete-user-"]')));
    const alert = await this.driver.wait(until.alertIsPresent(), DEFAULT_TIMEOUT);
    await alert.accept();
    await this.driver.wait(until.stalenessOf(row), DEFAULT_TIMEOUT);
  }

  async expectUserVisible(username: string): Promise<void> {
    const row = await this.findUserRow(username);
    expect(await row.isDisplayed()).to.be.true;
  }

  async expectUserHidden(username: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(
      async () => (await this.driver.findElements(this.userRowLocator(username))).length === 0,
      timeout,
      `Expected user "${username}" to be gone from the list`,
    );
  }

  async getUserRowText(username: string): Promise<string> {
    const row = await this.findUserRow(username);
    return row.getText();
  }
}
