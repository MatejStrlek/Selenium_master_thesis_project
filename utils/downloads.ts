import * as fs from 'fs';
import * as path from 'path';
import { WebDriver } from 'selenium-webdriver';

export const DOWNLOAD_DIR = path.join(__dirname, '..', '.downloads');

/**
 * Playwright's `page.waitForEvent('download')` gives a clean Download
 * object for free. Selenium has no equivalent event — `driver.setDownloadPath()`
 * (a thin wrapper over the DevTools `Page.setDownloadBehavior` command, the
 * only thing that makes downloads work at all in headless Chrome) points
 * real downloads at a directory, and this polls that directory for a new
 * file until one shows up. A real, concrete gap between the two frameworks'
 * download-testing ergonomics, not a suite-specific workaround.
 */
export async function prepareDownloadDir(driver: WebDriver): Promise<void> {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  for (const file of fs.readdirSync(DOWNLOAD_DIR)) {
    fs.unlinkSync(path.join(DOWNLOAD_DIR, file));
  }
  // setDownloadPath() is a Chromium-specific extension (chromium.js) not
  // declared on the base WebDriver type @types/selenium-webdriver ships.
  await (driver as unknown as { setDownloadPath(path: string): Promise<void> }).setDownloadPath(DOWNLOAD_DIR);
}

export async function waitForDownload(extension: string, timeoutMs = 15000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = fs
      .readdirSync(DOWNLOAD_DIR)
      .find((f) => f.endsWith(extension) && !f.endsWith('.crdownload'));
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No "${extension}" file appeared in ${DOWNLOAD_DIR} within ${timeoutMs}ms`);
}
