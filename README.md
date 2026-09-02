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
| Admin course CRUD (list, create, edit, delete) | Done | `tests/admin/courses.spec.ts` | `tests/admin/courses.spec.ts` |
| One data-driven suite (e.g. blocked-routes/permissions table) | Not started | — | `tests/student/permissions.spec.ts` |
| Network-mocked error state | Not planned yet — Selenium has no `page.route()` equivalent; would need a proxy or Selenium 4's Chromium-only CDP interception, noted as a likely capability gap rather than a straightforward port | — | `tests/admin/courses-network.spec.ts` |
| API-level test (no browser) | Not started | — | `tests/api/*.spec.ts` |
| Basic CI (install, run, upload report) | Done | `.github/workflows/selenium.yml` | `.github/workflows/playwright.yml` |
| Visual regression, accessibility scans, sharded/matrix CI | Out of scope for this suite's representative-subset goal unless the comparison specifically calls for them | — | `tests/*/visual.spec.ts`, README §Accessibility Findings |

## Architecture

```
tests/        Mocha spec files, matched by .mocharc.json's `spec` glob (tests/**/*.spec.ts).
               Organized by role to mirror the Playwright repo: public/ so far,
               admin/, professor/, student/ to be added as coverage grows.
pages/         Page Object Model. BasePage.ts (shared goto() + waitForUrlContains()
               explicit-wait helper), LoginPage.ts, admin/AdminCoursesPage.ts.
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
- **Native `.click()` reliability on below-the-fold elements**: building `AdminCoursesPage`, every row-action click (edit/delete on a course further down the table) threw `element click intercepted`, consistently, on this machine — a real, verified environment quirk: `window.scrollY` stayed `0` even after an explicit `window.scrollTo(0, 3000)`, so Selenium's own scroll-into-view-before-click behavior never actually moved the viewport, and the click landed at a page coordinate genuinely outside what was rendered. The fix (`AdminCoursesPage.click()`) dispatches the click via `executeScript('arguments[0].click()')` instead of the native WebDriver click, which sidesteps viewport/coordinate calculation entirely and still triggers the row's real `onsubmit="confirm(...)"` handler correctly. Playwright's actionability checks (element attached, visible, stable, receives events) run before every action specifically to catch and wait out exactly this class of problem automatically — this is the first concrete case in this suite where Selenium's lower-level model demanded a manual workaround for something Playwright's model is structurally immune to.

## Debugging Walkthrough

**A real incident from building `tests/admin/courses.spec.ts`**: every test that clicked a course row's Edit or Delete button failed with `ElementClickInterceptedError: element click intercepted: Element is not clickable at point (x, y)`, reproducibly, even for a row that clearly existed and was located successfully (`until.elementLocated` found it fine — the failure was specifically on `.click()`).

Diagnosis, done with a throwaway debug script (login as admin, create a course, then inspect the delete button directly) rather than guessing:
1. `deleteButton.getRect()` reported `y ≈ 1500`, while `window.innerHeight` was `1221` — the element was genuinely below the fold.
2. Called `arguments[0].scrollIntoView({block: "center"})` via `executeScript` and re-measured: `window.scrollY` was still `0`.
3. Tried an unconditional `window.scrollTo(0, 3000)` directly — `scrollY` still read back as `0` immediately after, even though `document.body.scrollHeight` (`1571`) was genuinely taller than the viewport. The page was not scrolling at all, for reasons not fully root-caused (not a CSS `overflow: hidden`, both `html`/`body` compute to `overflow: visible`) — worth treating as a Selenium/ChromeDriver/Windows-DPI environment quirk rather than an app bug, since `document.elementFromPoint()` at the same viewport-relative coordinates consistently returned `null`, meaning nothing was rendered where the native click was aiming, not that something else was covering the button.
4. Confirmed the workaround: `executeScript('arguments[0].click()', element)` clicked the button successfully and the app's real `confirm()` dialog appeared right after — proving the button itself was interactable, just not via Selenium's native click-with-scroll path in this environment.

**Fix applied**: `AdminCoursesPage.click()` (see `pages/admin/AdminCoursesPage.ts`) wraps every row-action click in an `executeScript`-dispatched click instead of the native WebDriver `.click()`. This is now the default click path for anything in this Page Object that might be off-screen in a growing table — a concrete, reusable lesson (and a real data point for the Framework Comparison section above) rather than a one-off patch.

**A related, second finding**: with that fix in place, `tests/admin/courses.spec.ts` still failed intermittently — but only ever the *first* test in the file (`lists seeded courses`), timing out waiting for the CS101 row. Root cause: the very first Chrome/chromedriver launch in the whole Mocha process is measurably slower than every subsequent one (Selenium Manager's driver resolution happens once, cold), and the shared `DEFAULT_TIMEOUT` (10s) across `BasePage`/`LoginPage`/`AdminCoursesPage` was too tight to absorb that one-time cost. Raised to 15s in all three files — verified across several fresh-container runs afterward with no recurrence. Worth noting directly for the comparison: Playwright's own default action/assertion timeout is 30s specifically to absorb this kind of environment variance without configuration; Selenium's explicit-wait model requires picking that number yourself, and picking it too low reads as a flaky suite when the actual cause is a slow first browser launch, not a real defect.

**A second, smaller incident, genuinely about test data, not tooling**: running `npm test` three times back-to-back without restarting the app container reproduced the exact class of failure the Playwright repo's own Critical Evaluation section warns about — `createCourse('TEST103')` failed because a `TEST103` from an earlier interrupted run was still in the DB (H2 only reseeds on container *restart*, confirmed directly: `docker restart uni-course-management` + polling `/login` until `200` before the next run made it pass consistently again). Not a suite defect; this app-level constraint applies identically to both suites, and is exactly why `CLAUDE.md` calls it out as a known quirk to guard against up front rather than discover the hard way per-test.

**A third, subtler restart-timing race**, found while repeatedly restarting the container during the above debugging: a *single* successful `curl .../login` returning `200` right after `docker restart` isn't always a reliable "the app is truly ready" signal — one run went on to fail in a way inconsistent with a cold DB, immediately fixed by re-polling. The practical fix, since applied to local verification and to `.github/workflows/selenium.yml`'s own readiness check: require **two consecutive** `200`s before proceeding, not just one. The Playwright repo's own CI workflow uses a single-check loop and hasn't reported hitting this, but it's a real, reproduced race worth guarding against here now that it's been found, rather than leaving it for a future flaky CI run to rediscover.

One smaller lesson from the login work: the invalid-credentials error message was written against the app's actual rendered text and `data-testid`, read directly from `templates/login.html` (`Invalid username or password!`, `data-testid="login-error"`) rather than assumed from the Playwright suite's own assertion text — worth doing for every ported test, since the two suites reading the same template doesn't guarantee either one currently asserts the literal, current copy.

## Suite Health

Current local run: **7/7 passing** (`npm test`, ~9s, headed Chrome, against a freshly-started container): 3 login tests (read-only, no cleanup needed) + 4 admin course-CRUD tests (mutating — `createdCourseCodes` cleanup in `afterEach`, mirroring the Playwright repo's own leftover-course pattern). Verified passing repeatably on a freshly-restarted container; verified *failing* when `npm test` is run 3x back-to-back without a restart, for the documented reason in the Debugging Walkthrough above (a real app-level constraint, not a suite defect) — the practical rule for this suite until CI automates the restart: restart the container before a clean comparison run, not between every local iteration. No test is currently skipped or quarantined; no quarantine mechanism exists yet since nothing has needed one beyond a container restart.

## CI

`.github/workflows/selenium.yml` — a deliberately simple single-job workflow, not the Playwright repo's sharded 2-job matrix + merge-reports pipeline, since this suite's 7 tests don't yet justify that complexity (revisit once coverage grows). On push/PR to `main`/`master`: checkout, `npm ci`, start the same `uni_course_management` Docker image the Playwright workflow uses, wait for it to be ready (hardened to require **two consecutive** `200`s — see the Debugging Walkthrough's third finding above), run the suite headless (`HEADLESS=true`, `BASE_URL=http://localhost:8081`) via `npm run test:report`, dump `docker logs` on failure, and upload the Mocha JSON report as a build artifact.

**A real setup-complexity data point along the way**: the obvious choice for an HTML report artifact — `mochawesome`, the most common third-party Mocha HTML reporter — turned out to be broken against this project's Mocha 12 (`Cannot find module 'mocha/lib/utils'`, an internal path Mocha removed in a later major version; mochawesome's own last release predates that and was never updated). Rather than pin Mocha to an older version just to get an HTML report, `test:report` uses Mocha's built-in `json` reporter instead — zero extra dependency, zero compatibility risk, but also zero interactive report viewer. This is a genuine, concrete instance of Selenium's community-reporter ecosystem lagging its own test runner's release cadence — Playwright ships one first-party HTML reporter that's always in sync with the test runner by construction, since they're the same project.

`ubuntu-latest` ships Chrome preinstalled, and Selenium Manager (bundled with `selenium-webdriver` 4.6+) resolves a matching chromedriver automatically — so, notably, this workflow needs no separate browser/driver install step at all, unlike the Playwright side's `npx playwright install --with-deps`. Worth keeping as an honest counterpoint in the eventual setup-complexity writeup: not everything favors Playwright.

## Status

Auth coverage (3 tests, `tests/public/login.spec.ts`), admin course CRUD (4 tests, `tests/admin/courses.spec.ts`), and a basic CI workflow (`.github/workflows/selenium.yml`) are done — 7/7 passing. Next: one data-driven suite (see Test Coverage Plan), then begin collecting the actual comparison metrics — wall-clock execution time against the Playwright suite, a repeated-run stability check, and a setup-complexity/maintainability tally — once scope between the two suites is genuinely comparable.
