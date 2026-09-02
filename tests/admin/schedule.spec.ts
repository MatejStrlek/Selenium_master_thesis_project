import { expect } from 'chai';
import { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { AdminSchedulePage } from '../../pages/admin/AdminSchedulePage';
import { primaryUsers, courseId } from '../../utils/test-data';

describe('Admin schedule management', () => {
  let driver: WebDriver;
  let adminSchedulePage: AdminSchedulePage;

  // Rooms created by the current test, deleted in afterEach — same
  // leftover-cleanup pattern as tests/admin/courses.spec.ts.
  const createdRooms: string[] = [];

  beforeEach(async () => {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.login(primaryUsers.admin.username, primaryUsers.admin.password);

    adminSchedulePage = new AdminSchedulePage(driver);
    await adminSchedulePage.open();
  });

  afterEach(async () => {
    for (const room of createdRooms.splice(0)) {
      await adminSchedulePage.open();
      await adminSchedulePage.deleteEntry(room);
    }
    await driver.quit();
  });

  it('creates a new schedule entry', async () => {
    await adminSchedulePage.createEntry({
      courseId: courseId.cs101,
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '10:00',
      room: 'E2E-ROOM-101',
    });
    createdRooms.push('E2E-ROOM-101');

    await adminSchedulePage.expectEntryVisible('E2E-ROOM-101');
  });

  it('edits an existing schedule entry', async () => {
    await adminSchedulePage.createEntry({
      courseId: courseId.cs101,
      dayOfWeek: 'TUESDAY',
      startTime: '11:00',
      endTime: '12:00',
      room: 'E2E-ROOM-102',
    });
    createdRooms.push('E2E-ROOM-102');

    await adminSchedulePage.open();
    await adminSchedulePage.editEntry('E2E-ROOM-102', { room: 'E2E-ROOM-102-RENAMED' });
    createdRooms[createdRooms.indexOf('E2E-ROOM-102')] = 'E2E-ROOM-102-RENAMED';

    await adminSchedulePage.expectEntryVisible('E2E-ROOM-102-RENAMED');
  });

  it('deletes a schedule entry', async () => {
    await adminSchedulePage.createEntry({
      courseId: courseId.cs101,
      dayOfWeek: 'WEDNESDAY',
      startTime: '13:00',
      endTime: '14:00',
      room: 'E2E-ROOM-103',
    });
    await adminSchedulePage.open();
    await adminSchedulePage.deleteEntry('E2E-ROOM-103');
    await adminSchedulePage.expectEntryHidden('E2E-ROOM-103');
  });
});
