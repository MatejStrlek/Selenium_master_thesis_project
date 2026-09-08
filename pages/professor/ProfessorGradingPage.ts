import { By, until, WebElement } from 'selenium-webdriver';
import { expect } from 'chai';
import { BasePage } from '../BasePage';
import { waitForDownload } from '../../utils/downloads';

const DEFAULT_TIMEOUT = 20000;

/**
 * /professor/courses/{id}/students — roster + grading for one course.
 *
 * Grading a student is a one-way action: it completes the enrollment as a
 * side effect and this roster only shows still-active enrollments, so a
 * just-graded student's row disappears immediately after saving.
 */
export class ProfessorGradingPage extends BasePage {
  /** Last name lives in a `<strong>` nested inside a `<div>`, not a direct `<td>` child. */
  private studentRowLocator(lastName: string): By {
    return By.xpath(`//tr[.//strong[normalize-space()="${lastName}"]]`);
  }

  async expectCurrentGrade(lastName: string, grade: number, timeout = DEFAULT_TIMEOUT): Promise<void> {
    const row = await this.driver.wait(until.elementLocated(this.studentRowLocator(lastName)), timeout);
    expect(await row.getText()).to.include(String(grade));
  }

  async expectNotInRoster(lastName: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(
      async () => (await this.driver.findElements(this.studentRowLocator(lastName))).length === 0,
      timeout,
      `Expected "${lastName}" to no longer be in the roster`,
    );
  }

  /**
   * Grades whichever student currently appears first in the roster body and
   * returns their last name, rather than hardcoding a specific seeded
   * student — grading is one-way, so a hardcoded name isn't repeatable
   * across runs against the same long-lived container (see CLAUDE.md's
   * known quirks). `tbody tr` (not `table tr`) excludes the header row.
   */
  async gradeFirstAvailableStudent(grade: number): Promise<string> {
    const firstRow: WebElement = await this.driver.wait(
      until.elementLocated(By.css('tbody tr')),
      DEFAULT_TIMEOUT,
    );
    const lastName = await firstRow.findElement(By.css('strong')).getText();
    const gradeInput = await firstRow.findElement(By.css('[data-testid^="grade-input-"]'));
    await gradeInput.clear();
    await gradeInput.sendKeys(String(grade));
    await this.click(await firstRow.findElement(By.css('[data-testid^="grade-save-"]')));
    return lastName;
  }

  async exportCsv(): Promise<string> {
    await this.waitAndClick(By.css('[data-testid="export-grades-button"]'));
    return waitForDownload('.csv');
  }
}
