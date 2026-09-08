import { By, until, WebElement } from 'selenium-webdriver';
import { BasePage } from '../BasePage';

const DEFAULT_TIMEOUT = 15000;

/** /professor/courses — courses taught by the logged-in professor. */
export class ProfessorCoursesPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/professor/courses');
  }

  /** Rows carry `data-testid="course-row-{id}"` — matched by course code (a `<span class="badge">`) instead. */
  courseRowLocator(courseCode: string): By {
    return By.xpath(`//tr[td/span[normalize-space()="${courseCode}"]]`);
  }

  async findCourseRow(courseCode: string, timeout = DEFAULT_TIMEOUT): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(this.courseRowLocator(courseCode)), timeout);
  }

  async courseRowCount(courseCode: string): Promise<number> {
    return (await this.driver.findElements(this.courseRowLocator(courseCode))).length;
  }

  /**
   * The same unguarded-redirect race documented on `AdminUsersPage.createUser()`
   * (H6) — clicking through without waiting let `gradeFirstAvailableStudent()`
   * grab a `tbody tr` off the still-loading-away courses list page on
   * Firefox, surfacing as either a stale-element or a missing grade-input
   * depending on timing. Waiting for the URL to actually land on the
   * roster page before returning closes it.
   */
  async manageStudents(courseCode: string): Promise<void> {
    const row = await this.findCourseRow(courseCode);
    await this.click(await row.findElement(By.css('[data-testid^="manage-students-course-"]')));
    await this.waitForUrlContains('/students');
  }
}
