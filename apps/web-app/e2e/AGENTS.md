# E2E Testing Rules

- Use `getByRole`, `getByLabel`, and `getByText` as primary locators.
- Use `getByTestId` only when accessibility attributes are ambiguous.
- Never use CSS selectors, XPath, or DOM structure for locating elements.
- Keep every test independently runnable with its own setup and assertions.
- Never use `page.waitForTimeout()`. Wait for URL, response, or visible state.
- Assert observable business outcomes rather than implementation details.
- Use unique identifiers for test data and clean up data created by each test.
- Use `storageState` for authentication; never log in through the UI in specs.
