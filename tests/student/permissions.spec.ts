import { expect } from 'chai';
import { By, WebDriver, until } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { primaryUsers } from '../../utils/test-data';

/**
 * Every role-guarded MVC route shares one access-denied handler, so a
 * student hitting any admin- or professor-only route renders the same
 * "Access Denied" page (error/403.html) regardless of which route it was.
 * That uniform behavior is what makes this a real data-driven table instead
 * of one hardcoded route: each row is an independent boundary check, not a
 * copy-pasted assertion. Mirrors the Playwright reference suite's own
 * blockedRoutes table exactly.
 */
const blockedRoutes = [
  { path: '/admin/dashboard', label: 'admin dashboard' },
  { path: '/admin/courses', label: 'admin course list' },
  { path: '/admin/users', label: 'admin user management' },
  { path: '/admin/schedule', label: 'admin schedule' },
  { path: '/professor/courses', label: 'professor course list' },
  { path: '/professor/schedule', label: 'professor schedule' },
] as const;

describe('Student permissions', () => {
  // Generated at file-collection time (module load), not at runtime inside
  // a single test — each row becomes its own named `it()`, reported
  // individually rather than one test looping silently over all six.
  for (const { path, label } of blockedRoutes) {
    it(`student is blocked from the ${label} (${path})`, async () => {
      const driver: WebDriver = await createDriver();
      try {
        const loginPage = new LoginPage(driver);
        await loginPage.open();
        await loginPage.login(primaryUsers.student.username, primaryUsers.student.password);

        await loginPage.goto(path);
        const heading = await driver.wait(
          until.elementLocated(By.xpath(`//h2[normalize-space()="Access Denied"]`)),
          15000,
        );
        expect(await heading.isDisplayed()).to.be.true;
      } finally {
        await driver.quit();
      }
    });
  }
});
