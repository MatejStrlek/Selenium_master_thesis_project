import { By, until, WebElement } from 'selenium-webdriver';
import { BasePage } from '../BasePage';

const DEFAULT_TIMEOUT = 15000;

/** /student/courses — courses available to enroll in. */
export class StudentCoursesPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/student/courses');
  }

  private courseRowLocator(courseCode: string): By {
    return By.xpath(`//tr[td/strong[normalize-space()="${courseCode}"]]`);
  }

  async findCourseRow(courseCode: string, timeout = DEFAULT_TIMEOUT): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(this.courseRowLocator(courseCode)), timeout);
  }

  async enroll(courseCode: string): Promise<void> {
    const row = await this.findCourseRow(courseCode);
    await this.click(await row.findElement(By.css('[data-testid^="enroll-course-"]')));
  }
}
