import { expect } from 'chai';
import { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';
import { AdminUsersPage } from '../../pages/admin/AdminUsersPage';
import { primaryUsers } from '../../utils/test-data';

describe('Admin user management', () => {
  let driver: WebDriver;
  let adminUsersPage: AdminUsersPage;

  // Usernames created by the current test, deleted in afterEach — same
  // cleanup pattern as tests/admin/courses.spec.ts.
  const createdUsernames: string[] = [];

  beforeEach(async () => {
    driver = await createDriver();
    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.login(primaryUsers.admin.username, primaryUsers.admin.password);

    adminUsersPage = new AdminUsersPage(driver);
    await adminUsersPage.open();
  });

  afterEach(async () => {
    for (const username of createdUsernames.splice(0)) {
      await adminUsersPage.open();
      await adminUsersPage.deleteUser(username);
    }
    await driver.quit();
  });

  it('creates a new user', async () => {
    await adminUsersPage.createUser({
      username: 'e2etest1',
      password: 'password',
      firstName: 'Test',
      lastName: 'UserOne',
      email: 'e2etest1@example.com',
      role: 'STUDENT',
    });
    createdUsernames.push('e2etest1');

    await adminUsersPage.expectUserVisible('e2etest1');
  });

  it('edits an existing user', async () => {
    await adminUsersPage.createUser({
      username: 'e2etest2',
      password: 'password',
      firstName: 'Test',
      lastName: 'UserTwo',
      email: 'e2etest2@example.com',
      role: 'STUDENT',
    });
    createdUsernames.push('e2etest2');

    await adminUsersPage.open();
    await adminUsersPage.editUser('e2etest2', { lastName: 'Renamed' });

    await adminUsersPage.open();
    const rowText = await adminUsersPage.getUserRowText('e2etest2');
    expect(rowText).to.include('Renamed');
  });

  it('deletes a user', async () => {
    await adminUsersPage.createUser({
      username: 'e2etest3',
      password: 'password',
      firstName: 'Test',
      lastName: 'UserThree',
      email: 'e2etest3@example.com',
      role: 'STUDENT',
    });
    await adminUsersPage.open();
    await adminUsersPage.deleteUser('e2etest3');
    await adminUsersPage.expectUserHidden('e2etest3');
  });

  it('filters the user list by role', async () => {
    await adminUsersPage.filterByRole('PROFESSOR');
    await adminUsersPage.expectUserVisible(primaryUsers.professor.username);
    await adminUsersPage.expectUserHidden(primaryUsers.student.username);

    await adminUsersPage.filterByRole('STUDENT');
    await adminUsersPage.expectUserVisible(primaryUsers.student.username);
    await adminUsersPage.expectUserHidden(primaryUsers.professor.username);
  });
});
