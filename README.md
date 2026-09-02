# Selenium Reference Suite — Framework Comparison

Companion project to [`Master-thesis-final-project-code`](../Master-thesis-final-project-code), which implements the same test suite against the same target application (`uni_course_management`) using Playwright. This repo re-implements a representative subset of that coverage using **Selenium WebDriver** instead, so the two can be compared head-to-head for the thesis's research section (execution time/stability, learning curve, setup complexity, documentation quality, coverage, maintainability, cross-browser support).

## Stack

- [`selenium-webdriver`](https://www.npmjs.com/package/selenium-webdriver) (Node bindings, official)
- TypeScript
- Mocha + Chai (test runner + assertions — Selenium has no built-in test runner, unlike Playwright)
- Chrome via Selenium Manager (bundled with Selenium 4.6+, resolves the matching driver automatically — no manual chromedriver download needed)

## Setup

```bash
npm install
```

Requires the same `uni_course_management` app running locally (see the Playwright repo's `CLAUDE.md` for the `docker run` command). Defaults to `http://localhost:8081`; override with a `.env` file or `BASE_URL` env var.

## Commands

```bash
npm test              # run all tests headless config depends on HEADLESS env var
HEADLESS=true npm test # run headless
```

## Structure

Mirrors the Playwright repo's layout so the comparison stays apples-to-apples:

- `pages/` — Page Object Model (`BasePage`, `LoginPage`, ...)
- `utils/` — `env.ts` (baseURL), `driver.ts` (WebDriver builder), `test-data.ts` (seeded users/courses)
- `tests/` — Mocha specs, organized by role (`public/`, `admin/`, `professor/`, `student/`)

## Status

Scaffolding only — one smoke test (`tests/public/login.spec.ts`) confirming the login page loads. Next: port a representative subset of the Playwright suite's coverage (auth, one CRUD flow, one data-driven suite) and start collecting the comparison metrics.
