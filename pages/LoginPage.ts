import { By, until } from 'selenium-webdriver';
import { BasePage } from './BasePage';

const DEFAULT_TIMEOUT = 15000;

export class LoginPage extends BasePage {
  private usernameInput = By.css('#username');
  private passwordInput = By.css('#password');
  private submitButton = By.css('button[type=submit]');
  private errorAlert = By.css('[data-testid="login-error"]');

  async open(): Promise<void> {
    await this.goto('/login');
  }

  async login(username: string, password: string): Promise<void> {
    await this.driver.findElement(this.usernameInput).sendKeys(username);
    await this.driver.findElement(this.passwordInput).sendKeys(password);
    await this.driver.findElement(this.submitButton).click();
  }

  async getErrorMessage(timeout = DEFAULT_TIMEOUT): Promise<string> {
    const alert = await this.driver.wait(until.elementLocated(this.errorAlert), timeout);
    await this.driver.wait(until.elementIsVisible(alert), timeout);
    return alert.getText();
  }

  async expectLoggedIn(timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.waitForUrlContains('/dashboard', timeout);
  }
}
