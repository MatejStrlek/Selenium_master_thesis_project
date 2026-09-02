import { expect } from 'chai';
import { By, WebDriver, until } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { AdminCourseContentPage } from '../../pages/admin/AdminCourseContentPage';
import { StudentCourseContentPage } from '../../pages/student/StudentCourseContentPage';
import { primaryUsers, courseId } from '../../utils/test-data';

/**
 * Viewing course content is inherently cross-role: only an admin/professor
 * can create it, only a student's own session proves it's actually visible.
 * One sequential test on a single driver/session — admin creates+publishes,
 * logs out, student logs in and views, logs out, admin deletes — mirroring
 * the Playwright reference suite's own reasoning for not interleaving roles
 * within a test lifecycle (see its CLAUDE.md known quirk #5).
 *
 * MATH301 (courseId.math301) is used because no other spec manages content
 * on it — admin/professor content CRUD specs use CS101.
 */
describe('Student course content viewing', () => {
  let driver: WebDriver;
  let loginPage: LoginPage;
  let adminCourseContentPage: AdminCourseContentPage;
  let studentCourseContentPage: StudentCourseContentPage;

  beforeEach(async () => {
    driver = await createDriver();
    loginPage = new LoginPage(driver);
    adminCourseContentPage = new AdminCourseContentPage(driver);
    studentCourseContentPage = new StudentCourseContentPage(driver);
  });

  afterEach(async () => {
    await driver.quit();
  });

  it('admin publishes content, then a student can view it', async () => {
    // Suffixed per test execution so repeated runs against the same
    // container never collide on title.
    const title = `E2E Student-Visible Lecture ${Date.now()}`;
    const body = 'Test lecture body for the student content-viewing spec.';

    // Admin creates and publishes a content item.
    await loginPage.open();
    await loginPage.login(primaryUsers.admin.username, primaryUsers.admin.password);
    await loginPage.expectLoggedIn();

    await adminCourseContentPage.createContent(courseId.math301, { title, contentType: 'LECTURE', content: body });
    await adminCourseContentPage.togglePublish(courseId.math301, title);
    await adminCourseContentPage.logout();

    // Student sees the published content in the list.
    await loginPage.open();
    await loginPage.login(primaryUsers.student.username, primaryUsers.student.password);
    await loginPage.expectLoggedIn();

    await studentCourseContentPage.open(courseId.math301);
    await studentCourseContentPage.expectContentVisible(title);

    // Student opens the content item and sees its body.
    await studentCourseContentPage.viewContent(title);
    const heading = await driver.wait(
      until.elementLocated(By.xpath(`//h3[normalize-space()="${title}"]`)),
      15000,
    );
    expect(await heading.isDisplayed()).to.be.true;
    const contentBody = await driver.findElement(By.css('[data-testid="content-body"]'));
    expect(await contentBody.getText()).to.include(body);
    await studentCourseContentPage.logout();

    // Admin deletes the content item.
    await loginPage.open();
    await loginPage.login(primaryUsers.admin.username, primaryUsers.admin.password);
    await loginPage.expectLoggedIn();
    await adminCourseContentPage.deleteContent(courseId.math301, title);
  });
});
