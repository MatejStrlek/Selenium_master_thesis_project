import { expect } from 'chai';
import { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { ProfessorCourseContentPage } from '../../pages/professor/ProfessorCourseContentPage';
import { primaryUsers, courseId } from '../../utils/test-data';

describe('Professor course content management', () => {
  let driver: WebDriver;
  let professorCourseContentPage: ProfessorCourseContentPage;

  const createdTitles: string[] = [];

  beforeEach(async () => {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.login(primaryUsers.professor.username, primaryUsers.professor.password);

    professorCourseContentPage = new ProfessorCourseContentPage(driver);
  });

  afterEach(async () => {
    for (const title of createdTitles.splice(0)) {
      await professorCourseContentPage.deleteContent(courseId.cs101, title);
    }
    await driver.quit();
  });

  it('creates a new content item', async () => {
    await professorCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Professor Content 1',
      contentType: 'LECTURE',
    });
    createdTitles.push('E2E Professor Content 1');

    await professorCourseContentPage.open(courseId.cs101);
    await professorCourseContentPage.expectContentVisible('E2E Professor Content 1');
  });

  it('edits an existing content item', async () => {
    await professorCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Professor Content 2',
      contentType: 'ASSIGNMENT',
    });
    createdTitles.push('E2E Professor Content 2');

    await professorCourseContentPage.editContent(courseId.cs101, 'E2E Professor Content 2', {
      title: 'E2E Professor Content 2 Renamed',
    });
    createdTitles[createdTitles.indexOf('E2E Professor Content 2')] = 'E2E Professor Content 2 Renamed';

    await professorCourseContentPage.open(courseId.cs101);
    await professorCourseContentPage.expectContentVisible('E2E Professor Content 2 Renamed');
  });

  it('deletes a content item via the confirm modal', async () => {
    await professorCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Professor Content 3',
      contentType: 'QUIZ',
    });
    await professorCourseContentPage.deleteContent(courseId.cs101, 'E2E Professor Content 3');
    await professorCourseContentPage.open(courseId.cs101);
    await professorCourseContentPage.expectContentHidden('E2E Professor Content 3');
  });

  it('toggles publish status on a content item', async () => {
    await professorCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Professor Content 4',
      contentType: 'ANNOUNCEMENT',
    });
    createdTitles.push('E2E Professor Content 4');

    await professorCourseContentPage.open(courseId.cs101);
    let rowText = await professorCourseContentPage.getContentRowText('E2E Professor Content 4');
    expect(rowText).to.include('Draft');

    await professorCourseContentPage.togglePublish(courseId.cs101, 'E2E Professor Content 4');

    await professorCourseContentPage.open(courseId.cs101);
    rowText = await professorCourseContentPage.getContentRowText('E2E Professor Content 4');
    expect(rowText).to.include('Published');
  });
});
