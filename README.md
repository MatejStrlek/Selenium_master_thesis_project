# uni_course_management — Selenium Comparison Suite

Selenium WebDriver test suite for [`uni_course_management`](https://github.com/MatejStrlek/uni_course_management), built as the **framework-comparison counterpart** to [`Master-thesis-final-project-code`](https://github.com/MatejStrlek/Mater_thesis_final_project), which implements the same test suite against the same application using Playwright.

**Base application**: [`uni_course_management`](https://github.com/MatejStrlek/uni_course_management) — *Rapid Development of Java Applications Using Frameworks*.
**Tech stack under test**: Spring Boot 3.5 + Thymeleaf (server-rendered UI, session-based auth) with a separate stateless JWT REST API under `/api/**`; H2 in-memory database.
**This suite's stack**: `selenium-webdriver` (official Node bindings) + TypeScript + Mocha (test runner) + Chai (assertions) + Chrome via Selenium Manager.

## Why this repo exists

The thesis's research chapter evaluates testing frameworks empirically — execution time and stability benchmarks, a learning-curve assessment, and test-effectiveness metrics — comparing Playwright against an established alternative on speed, setup complexity, documentation quality, coverage, maintainability, and cross-browser support, to validate Playwright's suitability for educational use (the thesis's own pedagogical deliverable, the 15-week Playwright lab course). Selenium WebDriver is that alternative, and this repo is its side of the comparison.

This suite reaches **full E2E parity** with the Playwright suite's pure browser-driven functional tests — 42 tests across 15 files, covering every real admin/professor/student/shared/public flow — while deliberately excluding three categories that aren't meaningful for a *browser-automation framework* comparison: visual regression (no Selenium equivalent without extra image-diff tooling), network-mocking (no `page.route()` equivalent), and pure API tests (neither framework drives a browser for those, so they wouldn't differentiate the two). Both suites now cover the identical set of real user flows against the same app, seeded data, and roles; what's being measured is how each framework's own mechanics (waiting model, locator strategy, tooling, setup) shape the result for genuinely equal scope, not who covers more.

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

What differs is purpose, not scope any more: this suite exists to produce comparable measurements, so every real functional flow the Playwright suite covers has a matching Selenium test here — the same admin/professor/student roles, the same CRUD/permission/localization/cross-role flows, against the same seeded data. The categories deliberately left out (visual regression, network-mocking, pure API tests) aren't gaps in coverage so much as axes that wouldn't tell you anything about *browser-automation frameworks specifically*, since neither suite's approach to them is framework-differentiating.

## Test Coverage Plan

Tracks what's been ported so far and what's next, mirrored against the equivalent row in the Playwright suite's own coverage plan ([`Master-thesis-final-project-code/README.md`](https://github.com/MatejStrlek/Mater_thesis_final_project/blob/main/README.md)).

**Full E2E parity: 42/42 tests, 15 spec files, all passing.**

| Feature / page | Status | Selenium spec | Playwright equivalent |
|---|---|---|---|
| Login: fields, invalid credentials, unauthenticated redirect (3) | Done | `tests/public/login.spec.ts` | `tests/public/login.spec.ts` |
| Admin course CRUD (4) | Done | `tests/admin/courses.spec.ts` | `tests/admin/courses.spec.ts` |
| Admin schedule CRUD (3) | Done | `tests/admin/schedule.spec.ts` | `tests/admin/schedule.spec.ts` |
| Admin user management: CRUD + role filter (4) | Done | `tests/admin/users.spec.ts` | `tests/admin/users.spec.ts` |
| Admin course content: CRUD + publish toggle (4) | Done | `tests/admin/content.spec.ts` | `tests/admin/content.spec.ts` |
| Professor course list scoping + unauthorized-roster redirect (2) | Done | `tests/professor/courses.spec.ts` | `tests/professor/courses.spec.ts` |
| Professor grading: pre-seeded grade, grade-completes-enrollment, CSV export (3) | Done | `tests/professor/grading.spec.ts` | `tests/professor/grading.spec.ts` |
| Professor course content: CRUD (Bootstrap-modal delete) + publish toggle (4) | Done | `tests/professor/content.spec.ts` | `tests/professor/content.spec.ts` |
| Student enroll/drop (2) | Done | `tests/student/courses.spec.ts` | `tests/student/courses.spec.ts` |
| Student permissions — data-driven, 6 blocked routes (6) | Done | `tests/student/permissions.spec.ts` | `tests/student/permissions.spec.ts` |
| Shared: language switching across 3 roles + persistence + content-page localization (6) | Done | `tests/shared/localization.spec.ts` | `tests/shared/localization.spec.ts` |
| Shared: cross-role content viewing (admin publishes → student views) (1) | Done | `tests/shared/student-content.spec.ts` | `tests/shared/student-content.spec.ts` |
| Basic CI (install, run, upload report) | Done | `.github/workflows/selenium.yml` | `.github/workflows/playwright.yml` |
| Visual regression, accessibility scans, network-mocking, pure API tests, sharded/matrix CI | Deliberately excluded — see "Why this repo exists" above | — | `tests/*/visual.spec.ts`, `tests/*/*-network.spec.ts`, `tests/api/*.spec.ts` |

## Architecture

```
tests/        Mocha spec files, matched by .mocharc.json's `spec` glob (tests/**/*.spec.ts).
               Organized by role, one-to-one with the Playwright repo's folders:
               public/, admin/, professor/, student/, shared/ (role-agnostic —
               localization, cross-role content viewing).
pages/         Page Object Model, one class per page/flow. BasePage.ts (shared
               goto/click/waitAndClick/findByLabel/fillByLabel/setValueByLabel/
               selectByLabel/logout/switchLanguage), LoginPage.ts, DashboardPage.ts,
               admin/ (AdminCoursesPage, AdminSchedulePage, AdminUsersPage,
               AdminCourseContentPage), professor/ (ProfessorCoursesPage,
               ProfessorGradingPage, ProfessorCourseContentPage), student/
               (StudentCoursesPage, StudentEnrollmentsPage, StudentCourseContentPage).
utils/         env.ts (baseURL), driver.ts (createDriver()), test-data.ts (seeded
               users/course codes/numeric ids), downloads.ts (prepareDownloadDir/
               waitForDownload — filesystem-polling substitute for Playwright's
               waitForEvent('download'), used by the CSV-export test).
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

Every Page Object extends `BasePage` instead of duplicating navigation/waiting/interaction logic — the same "small base, composed extensions" shape the Playwright repo's Page Objects use, just without a fixture layer sitting on top of it.

**Locator strategy**: CSS selectors and `data-testid` attributes (already added by the app's maintainer for the Playwright suite) are the default here, not the last resort the way `getByTestId` is in the Playwright repo. But this suite also has a genuine `getByLabel()` equivalent — `BasePage.findByLabel()` finds a form field via its `<label>` text and resolves the `for` attribute, exactly mirroring Playwright's label-based lookup. It exists for a concrete reason, not just parity: several of this app's Thymeleaf forms use a *different* field `id` between their create and edit templates (e.g. admin content's description field is `#description` on create, `#contentDescription` on edit) — a real inconsistency `findByLabel` sidesteps entirely instead of forcing every Page Object to special-case both ids. `fillByLabel`, `setValueByLabel`, and `selectByLabel` build on it for text inputs, time/date inputs, and `<select>`s respectively. Row lookups still use XPath (`By.xpath('//tr[td/strong[...]]')`) since Selenium has no `getByRole('row', {name})` equivalent for matching a row by its full text content.

**Bootstrap-rendered UI (modals, dropdowns) needs "wait for visible," not "wait for located."** Both the professor content delete-confirmation modal and the navbar's language dropdown render their target elements into the DOM immediately — Bootstrap only toggles a CSS class to show/hide them, it doesn't add/remove markup. So `until.elementLocated` finds them instantly regardless of animation state; the actual wait needed is `until.elementIsVisible` on an already-resolved element. `BasePage.switchLanguage()` and `ProfessorCourseContentPage.deleteContent()` both follow this pattern — a genuinely different wait shape from every other explicit wait in this suite, and one it would be easy to get wrong (waiting for "located" and clicking too early, hitting a still-fading-in element).

**Explicit waits, not auto-waiting**: every point where the Playwright equivalent relies on a web-first assertion polling automatically, this suite calls `driver.wait(until.<condition>(...), timeout)` explicitly — see `LoginPage.getErrorMessage()` (waits for the error alert to be located, then visible, before reading its text) and `BasePage.waitForUrlContains()` (waits for the URL to change before asserting on it). No test in this suite uses a fixed sleep; the absence of a hard wait is intentional and mirrors the Playwright repo's own rule against `page.waitForTimeout()`, even though Selenium makes it easier to reach for one.

## Framework Comparison Notes

Running notes on concrete differences found while building this suite, kept here so the eventual thesis writeup has real, dated observations instead of reconstructed ones.

- **Setup complexity**: reaching a first passing test required four separate packages (`selenium-webdriver`, `mocha`, `chai`, `ts-node`) plus two config files (`.mocharc.json`, `tsconfig.json`) and a manual `Builder().forBrowser('chrome')...build()` call in `utils/driver.ts`. The Playwright equivalent is `npm init playwright` generating one `playwright.config.ts` and a working example test — a materially larger first-run setup surface here, worth quantifying (dependency count, config LOC, time-to-first-green-test) once both suites are directly compared.
- **Waiting model**: `LoginPage.getErrorMessage()` needed two explicit `driver.wait()` calls (element located, then visible) to safely read text that a Playwright `expect(locator).toContainText(...)` would poll for in one call. Every new Selenium test is a candidate for exactly this kind of hand-rolled synchronization; the Playwright suite structurally can't have the equivalent bug class.
- **Per-test isolation cost**: `createDriver()`/`driver.quit()` in `beforeEach`/`afterEach` spin up and tear down a real Chrome process per test. This is a genuine, measurable overhead candidate for the execution-time benchmark once suite sizes are comparable — Playwright's browser-context-per-test is lighter by construction (one browser process shared, many isolated contexts).
- **Locator resilience**: this suite's only non-trivial locator so far (`[data-testid="login-error"]`) exists specifically because a `data-testid` was already there from the Playwright work — without it, the fallback would have been a CSS selector on `.alert.alert-danger`, coupling the test to styling classes. Worth tracking how often this suite ends up on a styling-coupled selector as more pages are ported, versus the Playwright suite's role/label-first default.
- **Native `.click()` reliability on below-the-fold elements**: building `AdminCoursesPage`, every row-action click (edit/delete on a course further down the table) threw `element click intercepted`, consistently, on this machine — a real, verified environment quirk: `window.scrollY` stayed `0` even after an explicit `window.scrollTo(0, 3000)`, so Selenium's own scroll-into-view-before-click behavior never actually moved the viewport, and the click landed at a page coordinate genuinely outside what was rendered. The fix (`AdminCoursesPage.click()`) dispatches the click via `executeScript('arguments[0].click()')` instead of the native WebDriver click, which sidesteps viewport/coordinate calculation entirely and still triggers the row's real `onsubmit="confirm(...)"` handler correctly. Playwright's actionability checks (element attached, visible, stable, receives events) run before every action specifically to catch and wait out exactly this class of problem automatically — this is the first concrete case in this suite where Selenium's lower-level model demanded a manual workaround for something Playwright's model is structurally immune to.
- **Retries recover flakiness identically, but visibility differs**: `.mocharc.json`'s `"retries": 2` absorbs the same class of one-off environment slowness (mostly repeated Chrome/chromedriver process launches, see the Debugging Walkthrough's fourth finding) that Playwright's own `retries` config exists for. The mechanism is directly comparable; the *reporting* isn't — Mocha shows a retried-then-passed test identically to a clean first-try pass, while Playwright surfaces it as a distinct `flaky` outcome. A suite-health metric like "X flaky tests this run" is something this suite structurally cannot produce from `npm test`'s own output alone, unlike the Playwright side's.
- **`<input type="time">` + `sendKeys()` is a genuine Selenium gotcha, not an app bug.** Building `AdminSchedulePage`, typing `"09:00"` character-by-character into Chrome's segmented time widget left the field native-invalid (confirmed live via the browser's own "Please enter a valid value" tooltip). Fixed with `BasePage.setValueByLabel()` — direct `.value` assignment plus `input`/`change` event dispatch via `executeScript`, bypassing the segmented UI entirely. Playwright's `.fill()` has no equivalent failure mode on the same field.
- **No download-event API — filesystem polling instead.** Playwright's `page.waitForEvent('download')` gives a typed `Download` object for one line of code. Selenium has nothing comparable; `professorGradingPage.exportCsv()` needed `driver.setDownloadPath()` (a wrapper over the Chromium DevTools `Page.setDownloadBehavior` command — without it, headless Chrome silently refuses to download at all) plus a hand-rolled directory poller (`utils/downloads.ts`). It works, and it's not a large amount of code, but it's meaningfully more plumbing for something Playwright treats as a one-liner — a concrete setup-complexity/test-effectiveness data point for content involving real file downloads.
- **A real bug caught by checking the DOM instead of assuming a locator was safe.** Every row's Bootstrap delete-confirmation modal (`ProfessorCourseContentPage`) is rendered in the DOM simultaneously — one modal per row, all present at once, Bootstrap just toggles visibility. A `[data-testid^="confirm-delete-content-"]` *prefix* selector would silently match the *first* modal in document order rather than the one that actually opened, on any page with more than one content row. Verified against the live template that the modal is nested inside that row's own `<td>`, so scoping the lookup to the already-found `row` element (the same pattern already used everywhere else in this suite) was the correct, simpler fix — not a special case. Worth noting for the maintainability write-up: Selenium's flat, string-based selectors make this exact class of bug easy to introduce silently; Playwright's `Locator` chaining (`row.locator(...)`) makes the same scoping mistake just as possible, so the real lesson here is about verifying DOM structure rather than assuming a selector's blast radius, not a framework-inherent difference.
- **Fallback template text lied twice, not once.** The login page's fallback error text was already a known trap (see Debugging Walkthrough below); the professor content list's "Unpublished" fallback text turned out to be equally misleading — the real i18n message, checked directly in `messages.properties` rather than trusted from the template's inline placeholder, is "Draft". Two independent confirmations of the same lesson: never assert on a Thymeleaf template's inline fallback text without checking the actual message property it resolves to at runtime.

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

**A fourth finding, the one that took longest to pin down**: even with the click and timeout fixes above, `tests/admin/courses.spec.ts` kept failing intermittently — a *different* test each run — always the same way: `TimeoutError: Waiting for element to be located By(css selector, [data-testid="create-course-button"])` right after submitting the create/edit form. Two things were checked and ruled out before landing on the real explanation:
1. **Not leftover test data**: reproduced on `TEST101` immediately after a verified fresh container restart, so it couldn't be a duplicate-course-code validation error.
2. **Not a real functional bug**: a standalone debug script doing the exact same login → create → submit sequence, with generous manual polling and full URL/title logging every second, never failed once — the redirect to `/admin/courses?success=created` and the button's presence were both confirmed essentially instantly, every time.

That combination — reproducible in the full suite, never in an isolated single-browser script — pointed at genuine tail-latency variance from running many sequential Chrome launches back-to-back (4 admin tests + 3 login tests per `npm test` invocation, each spinning up and tearing down its own real browser process), occasionally exceeding even a 15s wait on this machine. Rather than chase an ever-larger fixed timeout to cover an unbounded tail, `.mocharc.json` now sets `"retries": 2` — Mocha's own retry mechanism, a direct, legitimate parallel to the Playwright reference suite's own `retries: 2` in CI, not a workaround unique to this suite. Verified over 3 fresh-restart runs: all 7/7 passed, with two of the three runs visibly taking ~26s instead of ~9s — a retry silently absorbing a transient failure, exactly as intended.

**Worth flagging as its own comparison point**: Mocha's retries recover the test, but a retried-then-passed test is reported identically to a first-try pass — there's no equivalent of Playwright's distinct `flaky` outcome surfacing "this passed, but only on the second attempt" as a first-class, visible signal. The longer wall-clock time was the only clue a retry happened at all; nothing in Mocha's own output says so.

While tracking this down, one latent bug was also found and fixed: `AdminCoursesPage` originally waited for the post-submit redirect via `waitForUrlContains('/admin/courses')`, but that string is also a substring of `/admin/courses/create` and `/admin/courses/edit/{id}` — a failed submit that re-renders the create/edit form (e.g. a real validation error) would have satisfied that wait immediately and silently masked the failure instead of surfacing it. Replaced with `waitForListPage()`, which waits for `[data-testid="create-course-button"]` specifically — a marker that only exists on the actual list page.

One smaller lesson from the login work: the invalid-credentials error message was written against the app's actual rendered text and `data-testid`, read directly from `templates/login.html` (`Invalid username or password!`, `data-testid="login-error"`) rather than assumed from the Playwright suite's own assertion text — worth doing for every ported test, since the two suites reading the same template doesn't guarantee either one currently asserts the literal, current copy.

**A fifth finding, from porting the full-parity scope (admin schedule/users/content, professor courses/grading/content, student courses/permissions, shared localization/content-viewing)**: three more real, non-obvious issues, each caught by checking against the live app or the DOM rather than assuming:

1. **`<input type="time">` genuinely can't be filled with plain `sendKeys()`.** Building `AdminSchedulePage`'s create-entry flow, typing `"09:00"` produced Chrome's own native validation error — visible in the browser as "Please enter a valid value. The field is incomplete" — rather than actually setting the field. Chrome renders `type="time"` as a segmented hour/minute widget, and typing a colon-separated string character-by-character doesn't reliably populate it. Fixed by setting `.value` directly via `executeScript` and dispatching `input`/`change` events (`BasePage.setValueByLabel()`), bypassing the segmented UI entirely. Confirmed working by watching the schedule entry actually appear in the list afterward, not just by the absence of an exception.
2. **A scoping bug caught before it shipped, by checking the template instead of assuming.** `ProfessorCourseContentPage`'s delete flow needed a Bootstrap confirm-modal button, and every row's modal is rendered in the DOM at once (Bootstrap only toggles visibility). The obvious `[data-testid^="confirm-delete-content-"]` prefix selector would have matched whichever modal happens to come first in document order on any page with more than one content row — a real, latent multi-row bug. Grepping the actual template confirmed the modal is nested inside that row's own `<td>`, so scoping the lookup to the already-found `row` element (the pattern already used everywhere else in this suite) is both correct and the simplest fix — no id-matching workaround needed once the DOM structure was actually verified.
3. **CSV export needed real download plumbing, not an event wait.** Playwright's `page.waitForEvent('download')` doesn't exist in Selenium. `professorGradingPage.exportCsv()` uses `driver.setDownloadPath()` (a Chromium DevTools Protocol wrapper — without it, headless Chrome silently refuses to download anything at all) plus a small filesystem poller (`utils/downloads.ts`) that waits for a matching file to appear. Verified end-to-end: the exported filename is read back from disk and asserted to contain `.csv`, not just "no error was thrown."

## Suite Health

Current local run: **42/42 passing** (`npm test`, roughly 1 minute, headed Chrome, against a freshly-started container). All mutating specs (admin/professor CRUD, student enroll/drop, the shared content-viewing flow) clean up after themselves the same way the Playwright suite does — throwaway entities deleted in `afterEach` or inline, never asserting on exact seed-data counts. `retries: 2` (`.mocharc.json`) absorbs the transient per-launch Chrome slowness documented in the Debugging Walkthrough's fourth finding — verified stable across every repeated fresh-restart run at this larger scope too. Running `npm test` several times back-to-back *without* restarting the container still reproduces the documented H2-reseed quirk (a real app-level constraint shared with the Playwright suite, not something retries should or can paper over) — restart the container before a clean comparison run. No test is currently skipped or quarantined.

## CI

`.github/workflows/selenium.yml` — a deliberately simple single-job workflow, not the Playwright repo's sharded 2-job matrix + merge-reports pipeline, since a 42-test suite completing in about a minute doesn't yet justify that complexity (revisit if the suite grows much further). On push/PR to `main`/`master`: checkout, `npm ci`, start the same `uni_course_management` Docker image the Playwright workflow uses, wait for it to be ready (hardened to require **two consecutive** `200`s — see the Debugging Walkthrough's third finding below), run the suite headless (`HEADLESS=true`, `BASE_URL=http://localhost:8081`) via `npm test` piped through `tee` into a log file, dump `docker logs` on failure, and upload that log as a build artifact.

**A real setup-complexity data point along the way**: the obvious choice for an HTML report artifact — `mochawesome`, the most common third-party Mocha HTML reporter — turned out to be broken against this project's Mocha 12 (`Cannot find module 'mocha/lib/utils'`, an internal path Mocha removed in a later major version; mochawesome's own last release predates that and was never updated). Mocha's built-in `json` reporter was tried as a fallback next, but made CI debugging *worse*, not better: it prints nothing to stdout while running, so a real failure showed only "exit code 1" in the Actions log with the actual reason buried in a downloadable artifact nobody would think to fetch first. Settled on the default `spec` reporter piped to a log file instead — zero extra dependency, and failures stay visible in the log itself, which is what CI output is actually for. This is a genuine, concrete instance of Selenium's community-reporter ecosystem lagging its own test runner's release cadence — Playwright ships one first-party HTML reporter that's always in sync with the test runner by construction, since they're the same project.

`ubuntu-latest` ships Chrome preinstalled, and Selenium Manager (bundled with `selenium-webdriver` 4.6+) resolves a matching chromedriver automatically — so, notably, this workflow needs no separate browser/driver install step at all, unlike the Playwright side's `npx playwright install --with-deps`. Worth keeping as an honest counterpoint in the eventual setup-complexity writeup: not everything favors Playwright.

## Status

**Full E2E parity reached: 42/42 tests passing across 15 spec files** — every real functional flow the Playwright suite covers (public login, admin/professor/student CRUD and permission checks, cross-role localization and content viewing), matched one-to-one, against the same app and seeded data. CI is green (`.github/workflows/selenium.yml`). Visual regression, network-mocking, and pure API tests are deliberately out of scope (see "Why this repo exists"). Next: begin collecting the actual comparison metrics — wall-clock execution time against the Playwright suite (same machine, same app state, same scope), a repeated-run stability check (retries off, count first-attempt failures), a setup-complexity tally (dependencies, config, LOC to first green test), and a maintainability/locator-resilience read — now that scope between the two suites is genuinely, fully comparable.
