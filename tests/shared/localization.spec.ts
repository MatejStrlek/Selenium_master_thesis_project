import { expect } from 'chai';
import { By, WebDriver, until } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { StudentCoursesPage } from '../../pages/student/StudentCoursesPage';
import { AdminCoursesPage } from '../../pages/admin/AdminCoursesPage';
import { StudentCourseContentPage } from '../../pages/student/StudentCourseContentPage';
import { primaryUsers, courseId } from '../../utils/test-data';

/**
 * The language dropdown lives in the shared navbar every authenticated role
 * sees, and Spring's SessionLocaleResolver keys locale off the HTTP session,
 * not the request. Every test below logs in with its own fresh driver/session
 * (the normal pattern in this suite anyway, unlike the Playwright repo's
 * shared per-role storageState) — Selenium never risks the session-sharing
 * race that reference suite hit precisely because nothing here reuses a
 * saved session across tests to begin with.
 */
const roleCases = [
  { username: primaryUsers.admin.username, password: primaryUsers.admin.password, firstName: 'Admin' },
  { username: primaryUsers.professor.username, password: primaryUsers.professor.password, firstName: 'Milica' },
  { username: primaryUsers.student.username, password: primaryUsers.student.password, firstName: 'Sara' },
];

async function textVisible(driver: WebDriver, tag: string, text: string, timeout = 15000): Promise<boolean> {
  const el = await driver.wait(
    until.elementLocated(By.xpath(`//${tag}[normalize-space()="${text}"]`)),
    timeout,
  );
  return el.isDisplayed();
}

describe('Language switching', () => {
  let driver: WebDriver;

  afterEach(async () => {
    await driver.quit();
  });

  for (const { username, password, firstName } of roleCases) {
    it(`${username} sees the dashboard translated in all 3 supported languages`, async () => {
      driver = await createDriver();
      const loginPage = new LoginPage(driver);
      const dashboardPage = new DashboardPage(driver);

      await loginPage.open();
      await loginPage.login(username, password);
      await loginPage.expectLoggedIn();

      await dashboardPage.open();
      expect(await textVisible(driver, 'span', `Welcome, ${firstName}!`)).to.be.true;

      await dashboardPage.switchLanguage('hr');
      expect(await textVisible(driver, 'span', `Dobro došao, ${firstName}!`)).to.be.true;

      await dashboardPage.switchLanguage('de');
      expect(await textVisible(driver, 'span', `Willkommen, ${firstName}!`)).to.be.true;
    });
  }
});

describe('Language persistence', () => {
  let driver: WebDriver;

  afterEach(async () => {
    await driver.quit();
  });

  it('locale persists across navigation without a ?lang= param', async () => {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    const dashboardPage = new DashboardPage(driver);
    const studentCoursesPage = new StudentCoursesPage(driver);

    await loginPage.open();
    await loginPage.login(primaryUsers.student.username, primaryUsers.student.password);
    await loginPage.expectLoggedIn();

    await dashboardPage.open();
    await dashboardPage.switchLanguage('hr');
    expect(await textVisible(driver, 'h3', 'Studentski portal')).to.be.true;

    // Navigate to a different page with no ?lang= param.
    await studentCoursesPage.open();

    // nav.courses = "Kolegiji" in messages_hr.properties
    expect(await textVisible(driver, 'a', 'Kolegiji')).to.be.true;
  });
});

describe('Content-bearing page localization', () => {
  let driver: WebDriver;

  afterEach(async () => {
    await driver.quit();
  });

  it('admin sees the course list page translated', async () => {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    const adminCoursesPage = new AdminCoursesPage(driver);

    await loginPage.open();
    await loginPage.login(primaryUsers.admin.username, primaryUsers.admin.password);
    await loginPage.expectLoggedIn();

    await adminCoursesPage.open();

    await adminCoursesPage.switchLanguage('hr');
    expect(await textVisible(driver, 'a', 'Dodaj novi predmet')).to.be.true;
    expect(await textVisible(driver, 'th', 'Bodovi')).to.be.true;

    await adminCoursesPage.switchLanguage('de');
    expect(await textVisible(driver, 'a', 'Neuen Kurs hinzufügen')).to.be.true;
    expect(await textVisible(driver, 'th', 'Credits')).to.be.true;
  });

  it('student sees the course materials page translated', async () => {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    const studentCourseContentPage = new StudentCourseContentPage(driver);

    await loginPage.open();
    await loginPage.login(primaryUsers.student.username, primaryUsers.student.password);
    await loginPage.expectLoggedIn();

    await studentCourseContentPage.open(courseId.cs101);

    await studentCourseContentPage.switchLanguage('hr');
    expect(await textVisible(driver, 'h4', 'Materijali za kolegij')).to.be.true;

    await studentCourseContentPage.switchLanguage('de');
    expect(await textVisible(driver, 'h4', 'Kursmaterialien')).to.be.true;
  });
});
