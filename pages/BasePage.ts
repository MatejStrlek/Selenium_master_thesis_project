import { WebDriver } from 'selenium-webdriver';
import { baseURL } from '../utils/env';

export class BasePage {
  constructor(protected driver: WebDriver) {}

  async goto(path: string): Promise<void> {
    await this.driver.get(`${baseURL}${path}`);
  }
}
