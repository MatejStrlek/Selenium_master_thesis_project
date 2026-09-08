import { By, until, WebElement } from 'selenium-webdriver';
import { expect } from 'chai';
import { BasePage } from '../BasePage';

const DEFAULT_TIMEOUT = 20000;

export interface CourseFormData {
  courseCode?: string;
  courseName?: string;
  credits?: number;
}

/** /admin/courses — list, create, edit, delete. */
export class AdminCoursesPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/admin/courses');
  }

  /**
   * Rows carry `data-testid="course-row-{numeric id}"`, which isn't known to
   * a caller passing a course code — matched by the code text instead, the
   * same reasoning the Playwright side's `row(text)` helper uses.
   */
  private courseRowLocator(courseCode: string): By {
    return By.xpath(`//tr[td/strong[normalize-space()="${courseCode}"]]`);
  }

  private async findCourseRow(courseCode: string, timeout = DEFAULT_TIMEOUT): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(this.courseRowLocator(courseCode)), timeout);
  }

  /**
   * Waits for a marker only the *list* page renders — `[data-testid="create-course-button"]`
   * exists on `/admin/courses` and nowhere else in this flow. Deliberately not
   * `waitForUrlContains('/admin/courses')`: that string is also a substring of
   * `/admin/courses/create` and `/admin/courses/edit/{id}`, so a failed submit
   * that re-renders the create/edit form (a validation error, e.g. a duplicate
   * course code) would satisfy that wait immediately and silently mask the
   * failure instead of surfacing it.
   */
  private async waitForListPage(timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(until.elementLocated(By.css('[data-testid="create-course-button"]')), timeout);
  }

  private async fillForm(data: CourseFormData): Promise<void> {
    if (data.courseCode !== undefined) await this.fillByLabel('Course Code', data.courseCode);
    if (data.courseName !== undefined) await this.fillByLabel('Course Name', data.courseName);
    if (data.credits !== undefined) await this.fillByLabel('Credits', String(data.credits));
  }

  async createCourse(data: Required<CourseFormData>): Promise<void> {
    await this.waitAndClick(By.css('[data-testid="create-course-button"]'));
    await this.driver.wait(until.elementLocated(By.css('[data-testid="course-form"]')), DEFAULT_TIMEOUT);
    await this.fillForm(data);
    await this.waitAndClick(By.css('[data-testid="course-form-submit"]'));
    await this.waitForListPage();
  }

  /**
   * The row itself is still found by course code (data, not a label), but
   * "Edit" is matched by `[data-testid^="edit-course-"]` (attribute-prefix)
   * since the row's numeric course id isn't known to callers passing a code.
   */
  async editCourse(courseCode: string, data: CourseFormData): Promise<void> {
    const row = await this.findCourseRow(courseCode);
    await this.click(await row.findElement(By.css('[data-testid^="edit-course-"]')));
    await this.driver.wait(until.elementLocated(By.css('[data-testid="course-form"]')), DEFAULT_TIMEOUT);
    await this.fillForm(data);
    await this.waitAndClick(By.css('[data-testid="course-form-submit"]'));
    await this.waitForListPage();
  }

  /**
   * Delete is a plain `onsubmit="return confirm(...)"` native dialog here
   * (not a Bootstrap modal) — Selenium can't click it like a DOM element,
   * `driver.switchTo().alert()` is the only way to interact with it.
   */
  async deleteCourse(courseCode: string): Promise<void> {
    const row = await this.findCourseRow(courseCode);
    await this.click(await row.findElement(By.css('[data-testid^="delete-course-"]')));
    const alert = await this.driver.wait(until.alertIsPresent(), DEFAULT_TIMEOUT);
    await alert.accept();
    await this.driver.wait(until.stalenessOf(row), DEFAULT_TIMEOUT);
  }

  async expectCourseVisible(courseCode: string): Promise<void> {
    const row = await this.findCourseRow(courseCode);
    expect(await row.isDisplayed()).to.be.true;
  }

  async expectCourseHidden(courseCode: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(
      async () => (await this.driver.findElements(this.courseRowLocator(courseCode))).length === 0,
      timeout,
      `Expected course "${courseCode}" to be gone from the list`,
    );
  }

  async getCourseRowText(courseCode: string): Promise<string> {
    const row = await this.findCourseRow(courseCode);
    return row.getText();
  }
}
