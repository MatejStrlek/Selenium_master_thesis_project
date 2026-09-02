import { expect } from 'chai';
import { WebDriver } from 'selenium-webdriver';
import { createDriver } from '../../utils/driver';
import { LoginPage } from '../../pages/LoginPage';

describe('Login page', () => {
  let driver: WebDriver;
  let loginPage: LoginPage;

  beforeEach(async () => {
    driver = await createDriver();
    loginPage = new LoginPage(driver);
    await loginPage.open();
  });

  afterEach(async () => {
    await driver.quit();
  });

  it('shows username, password, and submit fields', async () => {
    expect(await driver.findElement({ css: '#username' }).isDisplayed()).to.be.true;
    expect(await driver.findElement({ css: '#password' }).isDisplayed()).to.be.true;
    expect(await driver.findElement({ css: 'button[type=submit]' }).isDisplayed()).to.be.true;
  });
});
