import { Builder, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

export async function createDriver(): Promise<WebDriver> {
  const options = new chrome.Options();
  if (process.env.HEADLESS === 'true') {
    options.addArguments('--headless=new');
  }

  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}
