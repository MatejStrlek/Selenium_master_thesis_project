import { By, until, WebElement } from 'selenium-webdriver';
import { expect } from 'chai';
import { BasePage } from '../BasePage';

const DEFAULT_TIMEOUT = 20000;

export type ContentType = 'LECTURE' | 'ASSIGNMENT' | 'QUIZ' | 'READING_MATERIAL' | 'ANNOUNCEMENT' | 'OTHER';

export interface ContentFormData {
  title?: string;
  contentType?: ContentType;
  description?: string;
  content?: string;
}

/** /admin/courses/{courseId}/content — list, create, edit, delete, publish toggle. */
export class AdminCourseContentPage extends BasePage {
  async open(courseId: number): Promise<void> {
    await this.goto(`/admin/courses/${courseId}/content`);
  }

  /**
   * Rows carry `data-testid="content-row-{numeric id}"`, unknown before
   * creation — matched by title text instead (a `<strong>`, like
   * AdminCoursesPage's course-code rows).
   */
  private contentRowLocator(title: string): By {
    return By.xpath(`//tr[td/strong[normalize-space()="${title}"]]`);
  }

  private async findContentRow(title: string, timeout = DEFAULT_TIMEOUT): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(this.contentRowLocator(title)), timeout);
  }

  private async waitForListPage(timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(until.elementLocated(By.css('[data-testid="create-content-button"]')), timeout);
  }

  /**
   * The `Short Description` field's `id` differs between the create form
   * (`#description`) and the edit form (`#contentDescription`) — a real
   * inconsistency in the app's own templates. `fillByLabel` (finds the
   * field via its `<label>`, like Playwright's `getByLabel`) sidesteps it
   * entirely instead of special-casing both ids per form.
   */
  private async fillForm(data: ContentFormData): Promise<void> {
    if (data.title !== undefined) await this.fillByLabel('Title', data.title);
    if (data.contentType) await this.selectByLabel('Content Type', data.contentType);
    if (data.description !== undefined) await this.fillByLabel('Short Description', data.description);
    if (data.content !== undefined) await this.fillByLabel('Content', data.content);
  }

  async createContent(courseId: number, data: Required<Pick<ContentFormData, 'title' | 'contentType'>> & ContentFormData): Promise<void> {
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

  /** Native `confirm()` dialog, same pattern as AdminCoursesPage.deleteCourse. */
  async deleteContent(courseId: number, title: string): Promise<void> {
    await this.open(courseId);
    const row = await this.findContentRow(title);
    await this.click(await row.findElement(By.css('[data-testid^="delete-content-"]')));
    const alert = await this.driver.wait(until.alertIsPresent(), DEFAULT_TIMEOUT);
    await alert.accept();
    await this.driver.wait(until.stalenessOf(row), DEFAULT_TIMEOUT);
  }

  /** A plain POST form submit, no confirm dialog — the row's own id survives the reload, its DOM node doesn't. */
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
