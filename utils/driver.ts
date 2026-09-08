import * as fs from 'fs';
import { Builder, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as firefox from 'selenium-webdriver/firefox';
import { DOWNLOAD_DIR } from './downloads';

/**
 * Thesis Chapter 5, H6 (Cross-Browser Extension Effort). BROWSER=firefox
 * switches the whole suite to GeckoDriver via Selenium Manager (bundled
 * with selenium-webdriver 4.6+, same auto-resolution Chrome gets — no
 * separate driver download step needed). Unlike Chrome, Firefox has no
 * AppArmor/sandbox flag requirement in CI and (per manual testing while
 * building this) no equivalent of the headless-viewport navbar-collapse
 * bug either. See
 * ../../Master-thesis-final-project-code/benchmark/h6-cross-browser/ for
 * the full comparison writeup.
 */
export async function createDriver(): Promise<WebDriver> {
  if (process.env.BROWSER === 'firefox') {
    const options = new firefox.Options();
    if (process.env.HEADLESS === 'true') {
      options.addArguments('-headless');
    }
    // Firefox has no runtime download-path API (see utils/downloads.ts) —
    // the download directory is a profile preference that has to be set
    // before the browser launches, not called on the live driver like
    // Chrome's setDownloadPath(). `browser.helperApps.neverAsk.saveToDisk`
    // skips the native "Open/Save" prompt for the CSV export's exact
    // content type (`response.setContentType("text/csv")` server-side, see
    // uni_course_management's AdminCourseController/ProfessorCourseController)
    // so the file actually lands on disk instead of blocking on a dialog
    // headless Firefox can't dismiss.
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    options.setPreference('browser.download.folderList', 2);
    options.setPreference('browser.download.dir', DOWNLOAD_DIR);
    options.setPreference('browser.helperApps.neverAsk.saveToDisk', 'text/csv');
    return new Builder().forBrowser('firefox').setFirefoxOptions(options).build();
  }

  const options = new chrome.Options();
  // H2 traced this suite's flakiness to tail-latency variance from launching
  // a fresh Chrome process in nearly every test's beforeEach — most
  // Chrome starts are fast, but a long enough tail occasionally exceeds the
  // 15s DEFAULT_TIMEOUT even with 2 retries. These trim first-run overhead
  // (extension/profile/update machinery Chrome normally does on a fresh
  // profile) rather than changing the fresh-process-per-test architecture
  // itself, which is the thing H1/H5 actually measure.
  options.addArguments(
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--no-first-run',
    '--metrics-recording-only',
    '--disable-hang-monitor',
    '--mute-audio',
  );
  if (process.env.HEADLESS === 'true') {
    // Headless Chrome's default viewport is 764x429 — narrower than the
    // app's navbar-expand-lg breakpoint (992px), so the whole navbar
    // (including the language dropdown) collapses into a hidden hamburger
    // menu these tests never open. Confirmed live: switchLanguage() timed
    // out waiting for the dropdown option to become visible, only in
    // headless mode. A headed browser window is normally wide enough that
    // this never surfaces locally.
    options.addArguments('--headless=new', '--window-size=1920,1080');
  }
  if (process.env.CI === 'true') {
    // GitHub Actions' ubuntu-latest runner moved to Ubuntu 24.04, whose
    // AppArmor policy restricts unprivileged user namespaces by default —
    // this breaks Chrome's own sandbox, which relies on one, and leaves
    // driver session creation hanging/failing on every single test rather
    // than a normal bounded timeout. --no-sandbox and --disable-dev-shm-usage
    // are the standard CI mitigation; scoped to CI only since there's no
    // reason to weaken the sandbox on a developer's own machine.
    options.addArguments('--no-sandbox', '--disable-dev-shm-usage');
  }

  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}
