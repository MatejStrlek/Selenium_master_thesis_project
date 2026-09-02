import { By, until, WebElement } from 'selenium-webdriver';
import { expect } from 'chai';
import { BasePage } from '../BasePage';

const DEFAULT_TIMEOUT = 15000;

/**
 * /student/courses/{courseId}/content — published content list, plus the
 * single-item view page. `StudentCourseContentController` only ever shows
 * published content to students; unpublished items simply don't appear.
 */
export class StudentCourseContentPage extends BasePage {
  async open(courseId: number): Promise<void> {
    await this.goto(`/student/courses/${courseId}/content`);
  }

  /** Rows are keyed by the content's numeric id (unknown to callers) — matched by title text instead. */
  private contentRowLocator(title: string): By {
    return By.xpath(`//tr[td/strong[normalize-space()="${title}"]]`);
  }

  private async findContentRow(title: string, timeout = DEFAULT_TIMEOUT): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(this.contentRowLocator(title)), timeout);
  }

  async viewContent(title: string): Promise<void> {
    const row = await this.findContentRow(title);
    await this.click(await row.findElement(By.css('[data-testid^="view-content-"]')));
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
}
