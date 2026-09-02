import { By, until, WebElement } from 'selenium-webdriver';
import { expect } from 'chai';
import { BasePage } from '../BasePage';

const DEFAULT_TIMEOUT = 15000;

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
   * A native `.click()` on a below-the-fold row action reliably throws
   * "element click intercepted" on this environment — Selenium's own
   * scroll-into-view doesn't actually move the viewport here (`window.scrollY`
   * stays 0 even after an explicit `window.scrollTo()`), a real, verified
   * Selenium/ChromeDriver quirk, not an app bug. Dispatching the click via
   * `executeScript` sidesteps viewport/coordinate calculation entirely and
   * still triggers the row's real `onsubmit="confirm(...)"` handler.
   */
  private async click(element: WebElement): Promise<void> {
    await this.driver.executeScript('arguments[0].click();', element);
  }

  /**
   * A bare `driver.findElement(locator)` is a single, unretried lookup — safe
   * only when something *else* just confirmed the element's container is
   * already rendered (e.g. a row found via `findCourseRow`'s own wait).
   * Right after a fresh navigation (the list page after login, the create/edit
   * form after clicking into it), nothing has confirmed that yet, and a
   * one-shot lookup there is a genuine, intermittent race — this is the
   * Selenium equivalent of the auto-waiting Playwright gets for free on every
   * action, made explicit and reusable so it isn't accidentally skipped.
   */
  private async waitAndClick(locator: By, timeout = DEFAULT_TIMEOUT): Promise<void> {
    const element = await this.driver.wait(until.elementLocated(locator), timeout);
    await this.click(element);
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

  private async setValue(locator: By, value: string): Promise<void> {
    const input = this.driver.findElement(locator);
    await input.clear();
    await input.sendKeys(value);
  }

  private async fillForm(data: CourseFormData): Promise<void> {
    if (data.courseCode !== undefined) await this.setValue(By.id('courseCode'), data.courseCode);
    if (data.courseName !== undefined) await this.setValue(By.id('courseName'), data.courseName);
    if (data.credits !== undefined) await this.setValue(By.id('credits'), String(data.credits));
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
