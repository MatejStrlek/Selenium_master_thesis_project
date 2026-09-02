import { By, WebDriver, WebElement, until } from 'selenium-webdriver';
import { Select } from 'selenium-webdriver/lib/select';
import { baseURL } from '../utils/env';

const DEFAULT_TIMEOUT = 15000;

export class BasePage {
  constructor(protected driver: WebDriver) {}

  async goto(path: string): Promise<void> {
    await this.driver.get(`${baseURL}${path}`);
  }

  async waitForUrlContains(fragment: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.driver.wait(until.urlContains(fragment), timeout);
  }

  /**
   * The Selenium equivalent of Playwright's `getByLabel()`: finds the
   * `<label>` with this exact (whitespace-normalized) text and resolves its
   * `for` attribute to the actual field. Selenium has no built-in
   * label-based locator, so this app's Thymeleaf forms — several of which
   * use a *different* `id` for the same logical field between their create
   * and edit templates (e.g. admin content's description field is
   * `#description` on create, `#contentDescription` on edit) — would
   * otherwise force each Page Object to special-case both ids. Going
   * through the label sidesteps that entirely, the same way Playwright's
   * suite does by construction.
   */
  async findByLabel(labelText: string, timeout = DEFAULT_TIMEOUT): Promise<WebElement> {
    const label = await this.driver.wait(
      until.elementLocated(By.xpath(`//label[normalize-space()="${labelText}"]`)),
      timeout,
    );
    const forId = await label.getAttribute('for');
    if (!forId) throw new Error(`Label "${labelText}" has no "for" attribute`);
    return this.driver.findElement(By.id(forId));
  }

  async fillByLabel(labelText: string, value: string): Promise<void> {
    const input = await this.findByLabel(labelText);
    await input.clear();
    await input.sendKeys(value);
  }

  /**
   * `sendKeys()` on `<input type="time">`/`type="date"` is a genuine,
   * verified Selenium gotcha: Chrome renders these as a segmented widget
   * (hour/minute/AM-PM), and typing a plain colon-separated string like
   * `"09:00"` character-by-character can leave it native-invalid ("Please
   * enter a valid value") instead of actually setting the field — confirmed
   * live via the browser's own validation tooltip while building
   * AdminSchedulePage. Setting `.value` directly via `executeScript` and
   * dispatching `input`/`change` sidesteps the segmented UI entirely.
   * Playwright's `.fill()` has no equivalent failure mode here.
   */
  async setValueByLabel(labelText: string, value: string): Promise<void> {
    const input = await this.findByLabel(labelText);
    await this.driver.executeScript(
      `arguments[0].value = arguments[1];
       arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
       arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      input,
      value,
    );
  }

  async selectByLabel(labelText: string, value: string): Promise<void> {
    const select = await this.findByLabel(labelText);
    await new Select(select).selectByValue(value);
  }

  /**
   * Native `.click()` reliably throws `element click intercepted` on
   * below-the-fold elements in this environment (verified: Selenium's own
   * scroll-into-view never actually moves the viewport here — see
   * AdminCoursesPage/README for the full root-cause writeup). Dispatching
   * via `executeScript` sidesteps viewport/coordinate calculation entirely
   * and still triggers real handlers (including a row's
   * `onsubmit="confirm(...)"`). Every Page Object should click through
   * this, not `element.click()` directly.
   */
  async click(element: WebElement): Promise<void> {
    await this.driver.executeScript('arguments[0].click();', element);
  }

  async waitAndClick(locator: By, timeout = DEFAULT_TIMEOUT): Promise<void> {
    const element = await this.driver.wait(until.elementLocated(locator), timeout);
    await this.click(element);
  }

  async logout(): Promise<void> {
    await this.waitAndClick(By.css('[data-testid="logout-button"]'));
  }

  /**
   * Bootstrap's dropdown only toggles a CSS class on click (the option
   * links already exist in the DOM, just hidden) — the same "found
   * immediately, wait for visibility" shape as the professor content
   * delete-confirm modal, not a fresh `elementLocated` wait.
   */
  async switchLanguage(lang: 'en' | 'hr' | 'de'): Promise<void> {
    await this.waitAndClick(By.css('[data-testid="language-dropdown-toggle"]'));
    const option = await this.driver.findElement(By.css(`[data-testid="language-option-${lang}"]`));
    await this.driver.wait(until.elementIsVisible(option), DEFAULT_TIMEOUT);
    await this.click(option);
  }
}
