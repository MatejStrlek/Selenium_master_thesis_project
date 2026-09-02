import { expect } from 'chai';
import { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { AdminCourseContentPage } from '../../pages/admin/AdminCourseContentPage';
import { primaryUsers, courseId } from '../../utils/test-data';

describe('Admin course content management', () => {
  let driver: WebDriver;
  let adminCourseContentPage: AdminCourseContentPage;

  // Content titles created by the current test, deleted in afterEach — same
  // cleanup pattern as tests/admin/courses.spec.ts.
  const createdTitles: string[] = [];

  beforeEach(async () => {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.login(primaryUsers.admin.username, primaryUsers.admin.password);

    adminCourseContentPage = new AdminCourseContentPage(driver);
  });

  afterEach(async () => {
    for (const title of createdTitles.splice(0)) {
      await adminCourseContentPage.deleteContent(courseId.cs101, title);
    }
    await driver.quit();
  });

  it('creates a new content item', async () => {
    await adminCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Admin Content 1',
      contentType: 'LECTURE',
    });
    createdTitles.push('E2E Admin Content 1');

    await adminCourseContentPage.open(courseId.cs101);
    await adminCourseContentPage.expectContentVisible('E2E Admin Content 1');
  });

  it('edits an existing content item', async () => {
    await adminCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Admin Content 2',
      contentType: 'ASSIGNMENT',
    });
    createdTitles.push('E2E Admin Content 2');

    await adminCourseContentPage.editContent(courseId.cs101, 'E2E Admin Content 2', {
      title: 'E2E Admin Content 2 Renamed',
    });
    createdTitles[createdTitles.indexOf('E2E Admin Content 2')] = 'E2E Admin Content 2 Renamed';

    await adminCourseContentPage.open(courseId.cs101);
    await adminCourseContentPage.expectContentVisible('E2E Admin Content 2 Renamed');
  });

  it('deletes a content item', async () => {
    await adminCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Admin Content 3',
      contentType: 'QUIZ',
    });
    await adminCourseContentPage.deleteContent(courseId.cs101, 'E2E Admin Content 3');
    await adminCourseContentPage.open(courseId.cs101);
    await adminCourseContentPage.expectContentHidden('E2E Admin Content 3');
  });

  it('toggles publish status on a content item', async () => {
    await adminCourseContentPage.createContent(courseId.cs101, {
      title: 'E2E Admin Content 4',
      contentType: 'ANNOUNCEMENT',
    });
    createdTitles.push('E2E Admin Content 4');

    await adminCourseContentPage.open(courseId.cs101);
    let rowText = await adminCourseContentPage.getContentRowText('E2E Admin Content 4');
    expect(rowText).to.include('Draft');

    await adminCourseContentPage.togglePublish(courseId.cs101, 'E2E Admin Content 4');

    await adminCourseContentPage.open(courseId.cs101);
    rowText = await adminCourseContentPage.getContentRowText('E2E Admin Content 4');
    expect(rowText).to.include('Published');
  });
});
