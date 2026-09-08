import { By, until, WebElement } from 'selenium-webdriver';
import { expect } from 'chai';
import { BasePage } from '../BasePage';

const DEFAULT_TIMEOUT = 20000;

/** /student/courses/my-courses — the student's active enrollments. */
export class StudentEnrollmentsPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/student/courses/my-courses');
  }

  /** Course code is a plain `<td>` here (no `<strong>`), unlike the available-courses list. */
  private enrollmentRowLocator(courseCode: string): By {
    return By.xpath(`//tr[td[normalize-space()="${courseCode}"]]`);
  }

  private async findEnrollmentRow(courseCode: string, timeout = DEFAULT_TIMEOUT): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(this.enrollmentRowLocator(courseCode)), timeout);
  }

  /** Native `confirm()` dialog, same pattern as the admin/professor delete flows. */
  async drop(courseCode: string): Promise<void> {
    const row = await this.findEnrollmentRow(courseCode);
    await this.click(await row.findElement(By.css('[data-testid^="drop-enrollment-"]')));
    const alert = await this.driver.wait(until.alertIsPresent(), DEFAULT_TIMEOUT);
    await alert.accept();
    await this.driver.wait(until.stalenessOf(row), DEFAULT_TIMEOUT);
  }

  async expectEnrolled(courseCode: string): Promise<void> {
    const row = await this.findEnrollmentRow(courseCode);
    expect(await row.isDisplayed()).to.be.true;
  }

  async expectNotEnrolled(courseCode: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(
      async () => (await this.driver.findElements(this.enrollmentRowLocator(courseCode))).length === 0,
      timeout,
      `Expected course "${courseCode}" to no longer be enrolled`,
    );
  }
}
