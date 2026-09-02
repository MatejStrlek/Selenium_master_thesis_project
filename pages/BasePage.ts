import { WebDriver, until } from 'selenium-webdriver';
import { baseURL } from '../utils/env';

const DEFAULT_TIMEOUT = 10000;

export class BasePage {
  constructor(protected driver: WebDriver) {}

  async goto(path: string): Promise<void> {
    await this.driver.get(`${baseURL}${path}`);
  }

  async waitForUrlContains(fragment: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(until.urlContains(fragment), timeout);
  }
}
