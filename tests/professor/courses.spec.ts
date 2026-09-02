import { expect } from 'chai';
import { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { ProfessorCoursesPage } from '../../pages/professor/ProfessorCoursesPage';
import { primaryUsers, course, courseId } from '../../utils/test-data';

describe('Professor course list', () => {
  let driver: WebDriver;
  let professorCoursesPage: ProfessorCoursesPage;

  beforeEach(async () => {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.login(primaryUsers.professor.username, primaryUsers.professor.password);

    professorCoursesPage = new ProfessorCoursesPage(driver);
    await professorCoursesPage.open();
  });

  afterEach(async () => {
    await driver.quit();
  });

  it('shows only courses the professor teaches', async () => {
    await professorCoursesPage.findCourseRow(course.cs101);
    const bio101Count = await professorCoursesPage.courseRowCount(course.bio101);
    expect(bio101Count).to.equal(0);
  });

  it("redirects with an unauthorized error when accessing another professor's roster", async () => {
    await professorCoursesPage.goto(`/professor/courses/${courseId.bio101}/students`);
    await professorCoursesPage.waitForUrlContains('error=unauthorized');
  });
});
