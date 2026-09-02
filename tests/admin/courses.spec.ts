import { expect } from 'chai';
import { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { AdminCoursesPage } from '../../pages/admin/AdminCoursesPage';
import { primaryUsers } from '../../utils/test-data';

describe('Admin course management', () => {
  let driver: WebDriver;
  let adminCoursesPage: AdminCoursesPage;

  // Course codes created by the current test, deleted in afterEach so a
  // leftover course never breaks the next run (the seed DB only resets on
  // container restart, and course codes must be unique).
  const createdCourseCodes: string[] = [];

  beforeEach(async () => {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.login(primaryUsers.admin.username, primaryUsers.admin.password);

    adminCoursesPage = new AdminCoursesPage(driver);
    await adminCoursesPage.open();
  });

  afterEach(async () => {
    for (const code of createdCourseCodes.splice(0)) {
      await adminCoursesPage.open();
      await adminCoursesPage.deleteCourse(code);
    }
    await driver.quit();
  });

  it('lists seeded courses', async () => {
    await adminCoursesPage.expectCourseVisible('CS101');
  });

  it('creates a new course', async () => {
    await adminCoursesPage.createCourse({
      courseCode: 'TEST101',
      courseName: 'New Verification Course',
      credits: 3,
    });
    createdCourseCodes.push('TEST101');

    await adminCoursesPage.expectCourseVisible('TEST101');
  });

  it('edits an existing course', async () => {
    await adminCoursesPage.createCourse({
      courseCode: 'TEST102',
      courseName: 'Editable Course',
      credits: 3,
    });
    createdCourseCodes.push('TEST102');

    await adminCoursesPage.open();
    await adminCoursesPage.editCourse('TEST102', { courseName: 'Renamed Course' });

    const rowText = await adminCoursesPage.getCourseRowText('TEST102');
    expect(rowText).to.include('Renamed Course');
  });

  it('deletes a course', async () => {
    await adminCoursesPage.createCourse({
      courseCode: 'TEST103',
      courseName: 'Deletable Course',
      credits: 3,
    });

    await adminCoursesPage.open();
    await adminCoursesPage.deleteCourse('TEST103');

    await adminCoursesPage.expectCourseHidden('TEST103');
  });
});
