import { BasePage } from './BasePage';

/** /dashboard — role-agnostic landing page shared by every role. */
export class DashboardPage extends BasePage {
  async open(): Promise<void> {
    await this.goto('/dashboard');
  }
}
