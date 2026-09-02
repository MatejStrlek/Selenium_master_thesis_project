import { expect } from 'chai';
import { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { ProfessorCoursesPage } from '../../pages/professor/ProfessorCoursesPage';
import { ProfessorGradingPage } from '../../pages/professor/ProfessorGradingPage';
import { prepareDownloadDir } from '../../utils/downloads';
import { primaryUsers, course } from '../../utils/test-data';

describe('Professor grading', () => {
  let driver: WebDriver;
  let professorCoursesPage: ProfessorCoursesPage;
  let professorGradingPage: ProfessorGradingPage;

  beforeEach(async () => {
    driver = await createDriver();
    await prepareDownloadDir(driver);

    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.login(primaryUsers.professor.username, primaryUsers.professor.password);

    professorCoursesPage = new ProfessorCoursesPage(driver);
    professorGradingPage = new ProfessorGradingPage(driver);
  });

  afterEach(async () => {
    await driver.quit();
  });

  // Reads MATH201's roster, deliberately separate from CS101 below, which
  // grades away CS101's first available student — sharing one course
  // between "reads a pre-seeded grade" and "grades away first available"
  // caused real, repeated failures in the Playwright reference suite (see
  // its README Suite Health note).
  it('shows a pre-seeded grade for a still-active enrollment', async () => {
    await professorCoursesPage.open();
    await professorCoursesPage.manageStudents(course.math201);
    await professorGradingPage.expectCurrentGrade('Petrovic', 3);
  });

  it('grading a student completes their enrollment and removes them from the active roster', async () => {
    await professorCoursesPage.open();
    await professorCoursesPage.manageStudents(course.cs101);

    const gradedStudent = await professorGradingPage.gradeFirstAvailableStudent(5);
    await professorGradingPage.expectNotInRoster(gradedStudent);
  });

  it('exports the course roster as a CSV download', async () => {
    await professorCoursesPage.open();
    await professorCoursesPage.manageStudents(course.cs101);

    const filename = await professorGradingPage.exportCsv();
    expect(filename.toLowerCase()).to.include('.csv');
  });
});
