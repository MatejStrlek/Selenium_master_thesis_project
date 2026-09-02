# uni_course_management — Selenium Comparison Suite

Selenium WebDriver test suite for [`uni_course_management`](https://github.com/MatejStrlek/uni_course_management), built as the **framework-comparison counterpart** to [`Master-thesis-final-project-code`](https://github.com/MatejStrlek/Mater_thesis_final_project), which implements the same test suite against the same application using Playwright.

**Base application**: [`uni_course_management`](https://github.com/MatejStrlek/uni_course_management) — *Rapid Development of Java Applications Using Frameworks*.
**Tech stack under test**: Spring Boot 3.5 + Thymeleaf (server-rendered UI, session-based auth) with a separate stateless JWT REST API under `/api/**`; H2 in-memory database.
**This suite's stack**: `selenium-webdriver` (official Node bindings) + TypeScript + Mocha (test runner) + Chai (assertions) + Chrome via Selenium Manager.

## Why this repo exists

The thesis's research chapter evaluates testing frameworks empirically — execution time and stability benchmarks, a learning-curve assessment, and test-effectiveness metrics — comparing Playwright against an established alternative on speed, setup complexity, documentation quality, coverage, maintainability, and cross-browser support, to validate Playwright's suitability for educational use (the thesis's own pedagogical deliverable, the 15-week Playwright lab course). Selenium WebDriver is that alternative, and this repo is its side of the comparison.

This suite deliberately re-implements a **representative subset** of the Playwright suite's coverage — not the full graded rubric — against the exact same app, seeded data, and roles, so the two can be measured against each other while holding scope constant. Padding this suite's test count to match the other repo's would defeat the comparison; what's being measured is how each framework's own mechanics (waiting model, locator strategy, tooling, setup) shape the result for the *same* scope, not who covers more.

## Project Overview & Setup

`uni_course_management` is a Spring Boot 3.5 + Thymeleaf server-rendered web app (Spring Security session login, H2 in-memory DB) with a separate stateless JWT REST API under `/api/**`, managing university courses, enrollments, grades, and schedules across three roles — Admin, Professor, Student. This repo drives it as a black box through a real browser, same as the Playwright suite, with no access to or changes in its Java source.

**Install**:
```bash
npm install
```

**Start the target app** (H2 reseeds on container *restart* only, never between test runs — see Known Quirks below):
```bash
docker run -d --name uni-course-management -p 8081:8081 \
  -e MAIL_USERNAME=ci-test@example.com \
  -e MAIL_PASSWORD=ci-test-password \
  -e JWT_SECRET=CiTestSecretKeyThatIsAtLeast256BitsLongForHS256AlgorithmOk \
  ghcr.io/matejstrlek/uni_course_management:latest
```
(`docker start uni-course-management` on later runs, rather than `docker run` again.)

**Run the suite**:
```bash
npm test                # runs Mocha against tests/**/*.spec.ts, headed Chrome by default
HEADLESS=true npm test  # headless Chrome
```

`BASE_URL` (default `http://localhost:8081`, see `utils/env.ts`, overridable via `.env` or the environment) is the only environment override most setups need.

## Testing Strategy

E2E testing's role here is identical in principle to the Playwright suite's: `uni_course_management` is a thin, mostly server-rendered orchestration layer (Spring MVC controllers + Thymeleaf templates + Spring Security's role hierarchy) over a handful of services and a small schema, so the interaction *between* layers — auth redirects, role guards, template rendering of the right data — is where E2E coverage earns its keep, not pure business logic that a unit test would cover more cheaply. That reasoning is spelled out in full in the Playwright repo's own README and isn't repeated here.

What differs is scope and purpose. This suite exists to produce comparable measurements, not to maximize coverage of the app — so it deliberately ports only a representative slice (auth flows first, then one CRUD flow, then one data-driven suite) rather than chasing the Playwright suite's ≥15-test breadth. Every test added here should have a reason tied to the comparison (does it exercise a mechanic worth measuring — waiting, locator resilience, setup) rather than a reason tied to maximizing app coverage for its own sake.

## Test Coverage Plan

Tracks what's been ported so far and what's next, mirrored against the equivalent row in the Playwright suite's own coverage plan ([`Master-thesis-final-project-code/README.md`](https://github.com/MatejStrlek/Mater_thesis_final_project/blob/main/README.md)).

| Feature / page | Status | Selenium spec | Playwright equivalent |
|---|---|---|---|
| Login form renders (username/password/submit) | Done | `tests/public/login.spec.ts` | `tests/public/login.spec.ts` |
| Invalid credentials show an error | Done | `tests/public/login.spec.ts` | `tests/public/login.spec.ts` |
| Unauthenticated visit to a protected route redirects to `/login` | Done | `tests/public/login.spec.ts` | `tests/public/login.spec.ts` |
| One admin CRUD flow (course create/edit/delete) | Not started | — | `tests/admin/courses.spec.ts` |
| One data-driven suite (e.g. blocked-routes/permissions table) | Not started | — | `tests/student/permissions.spec.ts` |
| Network-mocked error state | Not planned yet — Selenium has no `page.route()` equivalent; would need a proxy or Selenium 4's Chromium-only CDP interception, noted as a likely capability gap rather than a straightforward port | — | `tests/admin/courses-network.spec.ts` |
| API-level test (no browser) | Not started | — | `tests/api/*.spec.ts` |
| Visual regression, accessibility scans, CI | Out of scope for this suite's representative-subset goal unless the comparison specifically calls for them | — | `tests/*/visual.spec.ts`, README §Accessibility Findings |

## Architecture

```
tests/        Mocha spec files, matched by .mocharc.json's `spec` glob (tests/**/*.spec.ts).
               Organized by role to mirror the Playwright repo: public/ so far,
               admin/, professor/, student/ to be added as coverage grows.
pages/         Page Object Model. BasePage.ts (shared goto() + waitForUrlContains()
               explicit-wait helper), LoginPage.ts.
utils/         env.ts (baseURL via dotenv/BASE_URL), driver.ts (createDriver() —
               builds/configures a fresh Chrome WebDriver per test, the Selenium
               equivalent of a browser-context fixture), test-data.ts (seeded users).
```

**Composition, and why it looks different from the Playwright side**: Playwright's `fixtures/index.ts` merges every Page Object into one `base.extend()`-built `test` export, so a spec destructures `{ loginPage }` and gets a ready instance for free. Mocha has no equivalent dependency-injection mechanism, so this suite's `beforeEach` explicitly does what a fixture would do implicitly — build a driver, construct each Page Object it needs, navigate — and `afterEach` explicitly quits the driver, since there's no automatic context teardown either:

```ts
beforeEach(async () => {
  driver = await createDriver();
  loginPage = new LoginPage(driver);
  await loginPage.open();
});

afterEach(async () => {
  await driver.quit();
});
```

Every Page Object extends `BasePage` (shared `goto(path)` and `waitForUrlContains(fragment, timeout)`) instead of duplicating navigation/waiting logic — the same "small base, composed extensions" shape the Playwright repo's Page Objects use, just without a fixture layer sitting on top of it.

**Locator strategy**: CSS selectors (`By.css('#username')`, `By.css('[data-testid="login-error"]')`) are the default here, not the last resort the way they are in the Playwright repo. Selenium has no built-in role/label-first locator API (`getByRole`/`getByLabel`) — `By.css`/`By.xpath`/`By.id` are the primary tools, so this suite reaches for the app's own `data-testid` attributes (already added by the app's maintainer for the Playwright suite — e.g. `login-error`, `login-username`) where one exists, and falls back to plain `id`/`type` CSS selectors otherwise. This is one of the concrete maintainability data points for the comparison: the Playwright suite's locators double as an accessibility check by construction, and this suite's don't.

**Explicit waits, not auto-waiting**: every point where the Playwright equivalent relies on a web-first assertion polling automatically, this suite calls `driver.wait(until.<condition>(...), timeout)` explicitly — see `LoginPage.getErrorMessage()` (waits for the error alert to be located, then visible, before reading its text) and `BasePage.waitForUrlContains()` (waits for the URL to change before asserting on it). No test in this suite uses a fixed sleep; the absence of a hard wait is intentional and mirrors the Playwright repo's own rule against `page.waitForTimeout()`, even though Selenium makes it easier to reach for one.

## Framework Comparison Notes

Running notes on concrete differences found while building this suite, kept here so the eventual thesis writeup has real, dated observations instead of reconstructed ones.

- **Setup complexity**: reaching a first passing test required four separate packages (`selenium-webdriver`, `mocha`, `chai`, `ts-node`) plus two config files (`.mocharc.json`, `tsconfig.json`) and a manual `Builder().forBrowser('chrome')...build()` call in `utils/driver.ts`. The Playwright equivalent is `npm init playwright` generating one `playwright.config.ts` and a working example test — a materially larger first-run setup surface here, worth quantifying (dependency count, config LOC, time-to-first-green-test) once both suites are directly compared.
- **Waiting model**: `LoginPage.getErrorMessage()` needed two explicit `driver.wait()` calls (element located, then visible) to safely read text that a Playwright `expect(locator).toContainText(...)` would poll for in one call. Every new Selenium test is a candidate for exactly this kind of hand-rolled synchronization; the Playwright suite structurally can't have the equivalent bug class.
- **Per-test isolation cost**: `createDriver()`/`driver.quit()` in `beforeEach`/`afterEach` spin up and tear down a real Chrome process per test. This is a genuine, measurable overhead candidate for the execution-time benchmark once suite sizes are comparable — Playwright's browser-context-per-test is lighter by construction (one browser process shared, many isolated contexts).
- **Locator resilience**: this suite's only non-trivial locator so far (`[data-testid="login-error"]`) exists specifically because a `data-testid` was already there from the Playwright work — without it, the fallback would have been a CSS selector on `.alert.alert-danger`, coupling the test to styling classes. Worth tracking how often this suite ends up on a styling-coupled selector as more pages are ported, versus the Playwright suite's role/label-first default.

## Debugging Walkthrough

No real test failure has been hit yet in this suite — it's early enough (3 tests, one page) that nothing has broken in a way worth a full walkthrough. This section will be filled in with a genuine incident (not a contrived one) the first time a test fails for a non-obvious reason, the same way the Playwright repo's own Debugging Walkthrough documents real CI failures rather than staged ones.

One real, smaller lesson so far: the invalid-credentials error message was written against the app's actual rendered text and `data-testid`, read directly from `templates/login.html` (`Invalid username or password!`, `data-testid="login-error"`) rather than assumed from the Playwright suite's own assertion text — worth doing for every ported test, since the two suites reading the same template doesn't guarantee either one currently asserts the literal, current copy.

## Suite Health

Current local run: **3/3 passing** (`npm test`, ~3s, headed Chrome, against a freshly-started container). All 3 tests are read-only against the app (no mutation, no cleanup needed), so repeatability isn't yet a concern the way it is once a CRUD flow is ported — see the Playwright repo's own Critical Evaluation and Flaky Test sections for the shared-mutable-H2-state issue this suite will need to guard against identically once it starts mutating data. No test is currently skipped or quarantined; no quarantine mechanism exists yet since nothing has needed one.

## CI

Not yet set up. Once coverage is representative (post the CRUD-flow and data-driven-suite milestones in the Test Coverage Plan above), a GitHub Actions workflow will be added — likely a close mirror of the Playwright repo's `.github/workflows/playwright.yml` shape (start the app container, install deps, run the suite, upload the Mocha/mochawesome report as a build artifact), so CI setup effort is itself comparable between the two.

## Status

Early stage: auth coverage complete (3 tests, `tests/public/login.spec.ts`). Next: port one admin CRUD flow and one data-driven suite (see Test Coverage Plan), then begin collecting the actual comparison metrics — wall-clock execution time against the Playwright suite, a repeated-run stability check, and a setup-complexity/maintainability tally — once scope between the two suites is genuinely comparable.
