import * as fs from 'fs';
import * as path from 'path';
import { WebDriver } from 'selenium-webdriver';

export const DOWNLOAD_DIR = path.join(__dirname, '..', '.downloads');

/**
 * Playwright's `page.waitForEvent('download')` gives a clean Download
 * object for free. Selenium has no equivalent event — pointing real
 * downloads at a directory it can then poll is the only option, and how
 * that's done is itself the concrete gap between the two frameworks'
 * download-testing ergonomics: Chrome exposes a per-session
 * `driver.setDownloadPath()` (a DevTools Protocol wrapper) that can be
 * called any time after launch, but Firefox has no runtime equivalent —
 * its download directory is a profile *preference*, set once via
 * `firefox.Options().setPreference(...)` before the browser launches (see
 * `utils/driver.ts`). So for Firefox there's nothing left to do here beyond
 * resetting the directory on disk; the CDP call only applies to Chrome.
 */
export async function prepareDownloadDir(driver: WebDriver): Promise<void> {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  for (const file of fs.readdirSync(DOWNLOAD_DIR)) {
    fs.unlinkSync(path.join(DOWNLOAD_DIR, file));
  }
  if (process.env.BROWSER !== 'firefox') {
    // setDownloadPath() is a Chromium-specific extension (chromium.js) not
    // declared on the base WebDriver type @types/selenium-webdriver ships.
    await (driver as unknown as { setDownloadPath(path: string): Promise<void> }).setDownloadPath(DOWNLOAD_DIR);
  }
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
