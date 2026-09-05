import { Builder, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

export async function createDriver(): Promise<WebDriver> {
  const options = new chrome.Options();
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
