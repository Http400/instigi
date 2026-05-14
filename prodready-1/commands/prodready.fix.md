# ProdReady Fix

Analyze and fix issues detected by gate validation (feedback loop).

**Usage**: `/prodready.fix [issue-type]`

**Arguments**: `$ARGUMENTS` (one of: test, lint, security, performance, spec)

## Instructions

Based on the issue type, analyze the problem and apply fixes.

---

## Issue Type: TEST

Fix failing tests.

### Process

1. **Run tests and capture output**:
   ```bash
   npm test 2>&1
   ```

2. **Parse failure output** to identify:
   - Which test files failed
   - Which test cases failed
   - Expected vs Received values
   - Stack trace location

3. **For each failing test**:
   - Read the test file
   - Read the implementation file being tested
   - Identify the mismatch (wrong property name, missing mock, logic error)
   - Apply the minimal fix

4. **Common fixes**:
   - Property name mismatch: Update implementation or test
   - Missing mock: Add mock in test setup
   - Assertion error: Fix logic or expected value
   - Async issue: Add await or fix promise handling

5. **Re-run tests** to verify fix:
   ```bash
   npm test
   ```

6. **Output**:
   ```
   Analyzing failing tests...

   1. tests/unit/[file]:XX
      Error: [description]
      Fix: [what was done]
      ✓ Fixed

   Re-running tests...
   ✓ All tests pass

   ➤ Next: /prodready.gate implement
   ```

---

## Issue Type: LINT

Fix ESLint and TypeScript errors.

### Process

1. **Run linter and type checker** (adapt to tech stack from `tech-stack.md`):
   ```bash
   # Default (TypeScript): npm run lint && npx tsc --noEmit
   # Python: ruff check . && mypy .
   # Go: golangci-lint run && go vet ./...
   ```

2. **Parse errors** to identify:
   - File and line number
   - Error code (e.g., @typescript-eslint/no-unused-vars)
   - Error message

3. **Apply fixes**:
   - For auto-fixable: `npm run lint -- --fix` (or `ruff check --fix`, etc.)
   - For type errors: Fix type annotations, imports, etc.
   - For non-auto-fixable: Manual edit

4. **Common fixes**:
   - Unused variable: Remove or prefix with `_`
   - Missing type: Add explicit type annotation
   - Import error: Fix import path
   - Unsafe type usage: Add proper typing

5. **Re-run checks** to verify (adapt to tech stack):
   ```bash
   # Default: npm run lint && npx tsc --noEmit
   # Python: ruff check . && mypy .
   ```

6. **Output**:
   ```
   Analyzing lint errors...

   1. src/[file]:XX - [rule]
      Fix: [what was done]
      ✓ Fixed

   Re-running lint...
   ✓ No errors

   ➤ Next: /prodready.gate implement
   ```

---

## Issue Type: SECURITY

Fix security vulnerabilities.

### Process

1. **Run security scans** (adapt to tech stack):
   ```bash
   # npm: npm audit
   # pip: pip-audit or safety check
   # bundler: bundle audit
   # go: govulncheck ./...
   npx gitleaks detect --source . 2>&1
   ```

2. **Analyze issues**:
   - Dependency vulnerabilities (language-specific audit tool)
   - Hardcoded secrets (gitleaks)
   - OWASP issues in code

3. **Apply fixes**:
   - **Dependencies**: `npm audit fix`, `pip install --upgrade`, or manual upgrade
   - **Secrets**: Remove from code, add to .env, update .gitignore
   - **OWASP**: Fix input validation, sanitization, etc.

4. **Common security fixes**:
   - SQL injection: Use ORM or parameterized queries
   - XSS: Sanitize user input, use proper escaping
   - Hardcoded secret: Move to environment variable
   - Outdated dependency: Update to patched version

5. **Re-run scans** to verify

6. **Output**:
   ```
   Analyzing security issues...

   1. [severity] - [description]
      Location: [file:line or package]
      Fix: [what was done]
      ✓ Fixed

   Re-running security scan...
   ✓ No critical/high issues

   ➤ Next: /prodready.gate verify
   ```

---

## Issue Type: PERFORMANCE

Fix performance issues.

### Process

1. **Identify issues** from `.prodready/verify/performance-report.md`:
   - Slow API endpoints
   - N+1 queries
   - Large bundle size
   - Poor Core Web Vitals

2. **Analyze root cause**:
   - Database: Check for missing indexes, N+1 queries
   - API: Check for unnecessary data fetching
   - Frontend: Check for large bundles, unoptimized images

3. **Apply fixes**:

   **Database**:
   - Add missing indexes to schema file
   - Use `include` instead of multiple queries
   - Add pagination

   **API**:
   - Add caching
   - Optimize data fetching
   - Use select to limit fields

   **Frontend**:
   - Code splitting
   - Image optimization
   - Remove unused dependencies

4. **Re-run performance tests** to verify

5. **Output**:
   ```
   Analyzing performance issues...

   1. [issue type] - [description]
      Impact: [metric affected]
      Fix: [what was done]
      ✓ Fixed

   Re-running performance check...
   ✓ All targets met

   ➤ Next: /prodready.gate verify
   ```

---

## Issue Type: SPEC

Fix specification compliance issues.

### Process

1. **Read spec-compliance.md** from `.prodready/verify/`

2. **Identify mismatches**:
   - Missing API endpoints
   - Wrong response format
   - Missing fields
   - Incorrect behavior vs user story

3. **Cross-reference with**:
   - `.prodready/define/requirements/user-stories.md`
   - `.prodready/design/api/openapi.yaml`
   - `.prodready/define/data-model/schema.*`

4. **Apply fixes**:
   - Add missing endpoints
   - Fix response structure
   - Add missing fields
   - Correct business logic

5. **Re-run spec validation** to verify

6. **Output**:
   ```
   Analyzing spec compliance issues...

   1. [user story ID] - [description]
      Expected: [from spec]
      Actual: [current implementation]
      Fix: [what was done]
      ✓ Fixed

   Re-running spec check...
   ✓ 100% compliant

   ➤ Next: /prodready.gate verify
   ```

---

## General Output Format

```
┌───────────────────────────────────────────────────────────┐
│ /prodready.fix [type]                                     │
│                                                           │
│ Analyzing [N] issues...                                   │
│                                                           │
│ 1. [location]                                             │
│    Issue: [description]                                   │
│    Fix: [solution applied]                                │
│    ✓ Fixed                                                │
│                                                           │
│ Re-running checks...                                      │
│ ✓ All [type] issues resolved                              │
│                                                           │
│ ➤ Next: /prodready.gate [phase]                          │
└───────────────────────────────────────────────────────────┘
```

## If Fix Fails

If automatic fix is not possible:

```
⚠ Cannot auto-fix: [reason]

Manual intervention required:
1. [step 1]
2. [step 2]

After manual fix, run: /prodready.gate [phase]
```
