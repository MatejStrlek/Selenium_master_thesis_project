import { By, until, WebElement } from 'selenium-webdriver';
import { expect } from 'chai';
import { BasePage } from '../BasePage';
import type { ContentFormData } from '../admin/AdminCourseContentPage';

const DEFAULT_TIMEOUT = 20000;

/**
 * /professor/courses/{courseId}/content — list, create, edit, delete,
 * publish toggle. Form fields/labels are identical to the admin equivalent
 * (AdminCourseContentPage), but delete works differently here: a Bootstrap
 * confirm **modal** (`confirm-delete-content-{id}`), not a native
 * `window.confirm()` dialog — two different roles reaching the same
 * feature through genuinely different UI mechanics.
 */
export class ProfessorCourseContentPage extends BasePage {
  async open(courseId: number): Promise<void> {
    await this.goto(`/professor/courses/${courseId}/content`);
  }

  private contentRowLocator(title: string): By {
    return By.xpath(`//tr[td/strong[normalize-space()="${title}"]]`);
  }

  private async findContentRow(title: string, timeout = DEFAULT_TIMEOUT): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(this.contentRowLocator(title)), timeout);
  }

  private async waitForListPage(timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(until.elementLocated(By.css('[data-testid="create-content-button"]')), timeout);
  }

  private async fillForm(data: ContentFormData): Promise<void> {
    if (data.title !== undefined) await this.fillByLabel('Title', data.title);
    if (data.contentType) await this.selectByLabel('Content Type', data.contentType);
    if (data.description !== undefined) await this.fillByLabel('Short Description', data.description);
    if (data.content !== undefined) await this.fillByLabel('Content', data.content);
  }

  async createContent(courseId: number, data: Required<Omit<ContentFormData, 'description' | 'content'>>): Promise<void> {
    await this.open(courseId);
    await this.waitAndClick(By.css('[data-testid="create-content-button"]'));
    await this.driver.wait(until.elementLocated(By.css('[data-testid="content-form"]')), DEFAULT_TIMEOUT);
    await this.fillForm(data);
    await this.waitAndClick(By.css('[data-testid="content-form-submit"]'));
    await this.waitForListPage();
  }

  async editContent(courseId: number, title: string, data: ContentFormData): Promise<void> {
    await this.open(courseId);
    const row = await this.findContentRow(title);
    await this.click(await row.findElement(By.css('[data-testid^="edit-content-"]')));
    await this.driver.wait(until.elementLocated(By.css('[data-testid="content-form"]')), DEFAULT_TIMEOUT);
    await this.fillForm(data);
    await this.waitAndClick(By.css('[data-testid="content-form-submit"]'));
    await this.waitForListPage();
  }

  /**
   * Opens the Bootstrap confirm modal (`data-bs-toggle="modal"`, no page
   * navigation), then clicks its own `confirm-delete-content-{id}` submit
   * button. The modal markup is nested inside the same row's `<td>` (verified
   * against the template, not assumed — Bootstrap only toggles visibility,
   * it doesn't relocate the modal in the DOM), so scoping the lookup to
   * `row` correctly finds only *this* row's confirm button even though
   * every row's modal exists in the DOM simultaneously. A fade-in animation
   * runs before the button is truly clickable, so this waits for it to be
   * located before clicking rather than clicking immediately after the
   * trigger.
   */
  async deleteContent(courseId: number, title: string): Promise<void> {
    await this.open(courseId);
    const row = await this.findContentRow(title);
    await this.click(await row.findElement(By.css('[data-testid^="delete-content-"]')));
    // The button already exists in the DOM (Bootstrap toggles CSS visibility,
    // it doesn't add/remove the modal), so it's found immediately — what
    // needs waiting for is the fade-in animation actually completing.
    const confirmButton = await row.findElement(By.css('[data-testid^="confirm-delete-content-"]'));
    await this.driver.wait(until.elementIsVisible(confirmButton), DEFAULT_TIMEOUT);
    await this.click(confirmButton);
  }

  async togglePublish(courseId: number, title: string): Promise<void> {
    await this.open(courseId);
    const row = await this.findContentRow(title);
    await this.click(await row.findElement(By.css('[data-testid^="toggle-publish-content-"]')));
    await this.driver.wait(until.stalenessOf(row), DEFAULT_TIMEOUT);
  }

  async expectContentVisible(title: string): Promise<void> {
    const row = await this.findContentRow(title);
    expect(await row.isDisplayed()).to.be.true;
  }

  async expectContentHidden(title: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(
      async () => (await this.driver.findElements(this.contentRowLocator(title))).length === 0,
      timeout,
      `Expected content "${title}" to be gone from the list`,
    );
  }

  async getContentRowText(title: string): Promise<string> {
    const row = await this.findContentRow(title);
    return row.getText();
  }
}
