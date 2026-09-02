import { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { StudentCoursesPage } from '../../pages/student/StudentCoursesPage';
import { StudentEnrollmentsPage } from '../../pages/student/StudentEnrollmentsPage';
import { primaryUsers, course } from '../../utils/test-data';

describe('Student course enrollment', () => {
  let driver: WebDriver;
  let studentCoursesPage: StudentCoursesPage;
  let studentEnrollmentsPage: StudentEnrollmentsPage;

  beforeEach(async () => {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.login(primaryUsers.student.username, primaryUsers.student.password);

    studentCoursesPage = new StudentCoursesPage(driver);
    studentEnrollmentsPage = new StudentEnrollmentsPage(driver);
  });

  afterEach(async () => {
    await driver.quit();
  });

  it('can enroll in an available course', async () => {
    await studentCoursesPage.open();
    await studentCoursesPage.enroll(course.phy201);

    await studentEnrollmentsPage.open();
    await studentEnrollmentsPage.expectEnrolled(course.phy201);

    // leave the world as found, so this test is safe to re-run
    await studentEnrollmentsPage.drop(course.phy201);
  });

  it('can drop an enrolled course', async () => {
    await studentCoursesPage.open();
    await studentCoursesPage.enroll(course.eng201);

    await studentEnrollmentsPage.open();
    await studentEnrollmentsPage.expectEnrolled(course.eng201);

    await studentEnrollmentsPage.drop(course.eng201);
    await studentEnrollmentsPage.expectNotEnrolled(course.eng201);
  });
});
