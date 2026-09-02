import { By, until, WebElement } from 'selenium-webdriver';
import { expect } from 'chai';
import { BasePage } from '../BasePage';

const DEFAULT_TIMEOUT = 15000;

export interface ScheduleFormData {
  courseId?: number;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
}

/** /admin/schedule — list, create, edit, delete. */
export class AdminSchedulePage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/admin/schedule');
  }

  /**
   * Rows carry `data-testid="schedule-row-{numeric id}"`, unknown to a
   * caller before creation — matched by room text instead (a plain `<td>`,
   * not `<strong>`, unlike AdminCoursesPage's course-code rows).
   */
  private scheduleRowLocator(room: string): By {
    return By.xpath(`//tr[td[normalize-space()="${room}"]]`);
  }

  private async findScheduleRow(room: string, timeout = DEFAULT_TIMEOUT): Promise<WebElement> {
    return this.driver.wait(until.elementLocated(this.scheduleRowLocator(room)), timeout);
  }

  private async waitForListPage(timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(until.elementLocated(By.css('[data-testid="create-schedule-button"]')), timeout);
  }

  private async fillForm(data: ScheduleFormData): Promise<void> {
    if (data.courseId !== undefined) await this.selectByLabel('Course', String(data.courseId));
    if (data.dayOfWeek) await this.selectByLabel('Day of Week', data.dayOfWeek);
    if (data.startTime) await this.setValueByLabel('Start Time', data.startTime);
    if (data.endTime) await this.setValueByLabel('End Time', data.endTime);
    if (data.room) await this.fillByLabel('Room', data.room);
  }

  async createEntry(data: Required<ScheduleFormData>): Promise<void> {
    await this.waitAndClick(By.css('[data-testid="create-schedule-button"]'));
    await this.driver.wait(until.elementLocated(By.css('[data-testid="schedule-form"]')), DEFAULT_TIMEOUT);
    await this.fillForm(data);
    await this.waitAndClick(By.css('[data-testid="schedule-form-submit"]'));
    await this.waitForListPage();
  }

  async editEntry(room: string, data: ScheduleFormData): Promise<void> {
    const row = await this.findScheduleRow(room);
    await this.click(await row.findElement(By.css('[data-testid^="edit-schedule-"]')));
    await this.driver.wait(until.elementLocated(By.css('[data-testid="schedule-form"]')), DEFAULT_TIMEOUT);
    await this.fillForm(data);
    await this.waitAndClick(By.css('[data-testid="schedule-form-submit"]'));
    await this.waitForListPage();
  }

  /** Native `confirm()` dialog, same pattern as AdminCoursesPage.deleteCourse. */
  async deleteEntry(room: string): Promise<void> {
    const row = await this.findScheduleRow(room);
    await this.click(await row.findElement(By.css('[data-testid^="delete-schedule-"]')));
    const alert = await this.driver.wait(until.alertIsPresent(), DEFAULT_TIMEOUT);
    await alert.accept();
    await this.driver.wait(until.stalenessOf(row), DEFAULT_TIMEOUT);
  }

  async expectEntryVisible(room: string): Promise<void> {
    const row = await this.findScheduleRow(room);
    expect(await row.isDisplayed()).to.be.true;
  }

  async expectEntryHidden(room: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(
      async () => (await this.driver.findElements(this.scheduleRowLocator(room))).length === 0,
      timeout,
      `Expected room "${room}" to be gone from the schedule`,
    );
  }
}
