# ProdReady Verify (Phase 6: VERIFY)

Final verification of production readiness: spec compliance, security, performance, and acceptance testing.

**Estimated time**: ~15 minutes

**Prerequisites**: Complete `/prodready.build` and pass `/prodready.gate build`

## Instructions

Perform comprehensive verification to ensure the application is production-ready.

### Prerequisites Check

1. Verify Docker builds successfully
2. Verify CI/CD configured
3. Verify documentation exists

Create verify directory:
```
.prodready/verify/
```

---

## Step 1: Specification Compliance

Verify implementation matches specification from define and design phases.

### 1.1 User Story Coverage

For each user story in `.prodready/define/requirements/user-stories.md`:
- Check if implemented
- Check if all acceptance criteria met
- Map to test coverage

### 1.2 API Contract Compliance

Compare implementation against `.prodready/design/api/openapi.yaml`:
- All endpoints implemented
- Request/response schemas match
- Error responses correct

### 1.3 Data Model Compliance

Compare implementation against the schema file from Define phase (`.prodready/define/data-model/schema.*`):
- All entities present
- Relationships correct
- Indexes defined

### Generate Report

`.prodready/verify/spec-compliance.md`:

```markdown
# Specification Compliance Report

Generated: [timestamp]

## User Stories

| ID | Title | Status | Test Coverage |
|----|-------|--------|---------------|
| US-001 | User Registration | ✓ Implemented | auth.spec.ts |
| US-002 | User Login | ✓ Implemented | auth.spec.ts |
| US-003 | [Feature] | ✓ Implemented | [test file] |
| ... | ... | ... | ... |

**Coverage**: X/Y stories implemented (Z%)

## API Endpoints

| Method | Path | Status | Test |
|--------|------|--------|------|
| POST | /api/auth/register | ✓ | ✓ |
| POST | /api/auth/login | ✓ | ✓ |
| GET | /api/[resource] | ✓ | ✓ |
| ... | ... | ... | ... |

**Coverage**: X/Y endpoints implemented (Z%)

## Data Model

| Entity | Fields | Relations | Status |
|--------|--------|-----------|--------|
| User | ✓ Complete | ✓ | ✓ |
| [Entity] | ✓ Complete | ✓ | ✓ |
| ... | ... | ... | ... |

## Gaps

[List any gaps or deviations from spec]

## Result

**Compliance: [100%/X%]**
```

---

## Step 2: Security Audit

Perform security checks.

### 2.1 Dependency Audit

Run the dependency audit tool for the chosen package manager:
- **npm**: `npm audit`
- **pip**: `pip-audit` or `safety check`
- **bundler**: `bundle audit`
- **go**: `govulncheck ./...`

### 2.2 Secrets Detection

```bash
# Install if needed
npx gitleaks detect --source . --report-path gitleaks-report.json
```

### 2.3 OWASP Checks

Manual or automated checks for:

| Check | Description |
|-------|-------------|
| Injection | SQL, NoSQL, Command injection |
| Auth | Proper authentication/authorization |
| Data Exposure | No sensitive data in responses |
| XXE | XML External Entity prevention |
| Access Control | Proper permission checks |
| Security Config | Secure headers, CORS |
| XSS | Input sanitization, output encoding |
| Deserialization | Safe data parsing |
| Components | No vulnerable dependencies |
| Logging | No sensitive data in logs |

### 2.4 Code Review Checks

- No hardcoded secrets
- Password hashing (bcrypt)
- JWT secret from environment
- Input validation (Zod)
- Rate limiting (if applicable)
- HTTPS enforcement (if applicable)

### Generate Report

`.prodready/verify/security-report.md`:

```markdown
# Security Audit Report

Generated: [timestamp]

## Dependency Scan

```
npm audit results:
[output]
```

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | X |
| Low | Y |

## Secrets Detection

```
gitleaks results:
[output or "No secrets found"]
```

## OWASP Top 10 Checklist

| # | Vulnerability | Status | Notes |
|---|---------------|--------|-------|
| A01 | Broken Access Control | ✓ Pass | Auth middleware on all routes |
| A02 | Cryptographic Failures | ✓ Pass | bcrypt for passwords, JWT signed |
| A03 | Injection | ✓ Pass | ORM/parameterized queries prevent SQL injection |
| A04 | Insecure Design | ✓ Pass | - |
| A05 | Security Misconfiguration | ✓ Pass | Secure headers configured |
| A06 | Vulnerable Components | ✓ Pass | npm audit clean |
| A07 | Auth Failures | ✓ Pass | Rate limiting, secure sessions |
| A08 | Data Integrity Failures | ✓ Pass | Input validation with Zod |
| A09 | Logging Failures | ✓ Pass | No sensitive data logged |
| A10 | SSRF | ✓ Pass | No external URL fetching |

## Code Review

- [x] No hardcoded secrets
- [x] Passwords properly hashed
- [x] JWT secret from environment
- [x] All inputs validated
- [x] Secure headers configured
- [x] Error messages don't leak info

## Issues Found

[List any issues with severity and recommended fix]

## Result

**Status: [PASSED/X issues found]**

- Critical: 0
- High: 0
- Medium: X
- Low: Y
```

---

## Step 3: Performance Audit

Test application performance.

### 3.1 Core Web Vitals (if frontend applicable)

If the project includes a frontend, use Lighthouse:

```bash
npx lighthouse http://localhost:3000 --output json --output-path ./lighthouse.json
```

Targets:
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### 3.2 API Performance

Test API response times:

```bash
# Simple test with curl
time curl http://localhost:3000/api/health

# Or use Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/[resource]
```

Targets:
- p50: < 100ms
- p95: < 200ms
- p99: < 500ms

### 3.3 Database Performance

Check for:
- Missing indexes
- N+1 queries
- Slow queries

```bash
# Check Prisma query logs
# Add in schema.prisma:
# generator client {
#   provider = "prisma-client-js"
#   previewFeatures = ["metrics"]
# }
```

### 3.4 Bundle Size (if frontend applicable)

```bash
npm run build
# Check bundle analyzer output if configured
```

Target: < 200KB initial JS

### Generate Report

`.prodready/verify/performance-report.md`:

```markdown
# Performance Report

Generated: [timestamp]

## Core Web Vitals

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP | X.Xs | < 2.5s | ✓ Pass |
| FID | Xms | < 100ms | ✓ Pass |
| CLS | X.XX | < 0.1 | ✓ Pass |
| Performance Score | XX/100 | > 90 | ✓ Pass |

## API Response Times

| Endpoint | p50 | p95 | p99 | Status |
|----------|-----|-----|-----|--------|
| GET /api/health | Xms | Xms | Xms | ✓ |
| GET /api/[resource] | Xms | Xms | Xms | ✓ |
| POST /api/[resource] | Xms | Xms | Xms | ✓ |

## Database

| Check | Status |
|-------|--------|
| All indexes defined | ✓ |
| No N+1 queries detected | ✓ |
| Query times < 100ms | ✓ |

## Bundle Analysis

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Initial JS | XXkB | < 200kB | ✓ Pass |
| Total Size | XXkB | - | - |

## Optimization Recommendations

[List any recommended optimizations]

## Result

**Status: [PASSED/X targets missed]**
```

---

## Step 4: Acceptance Testing

Run full E2E test suite with traceability.

### 4.1 Run E2E Tests

```bash
npm run test:e2e
```

### 4.2 Map to User Stories

For each test scenario from `.prodready/define/test-scenarios/*.feature`:
- Verify corresponding E2E test exists
- Verify test passes

### Generate Report

`.prodready/verify/acceptance-results.md`:

```markdown
# Acceptance Test Results

Generated: [timestamp]
Test Framework: Playwright

## Summary

| Status | Count |
|--------|-------|
| ✓ Passed | XX |
| ✗ Failed | 0 |
| ⊘ Skipped | 0 |
| **Total** | **XX** |

## Test Traceability

| User Story | Feature File | E2E Test | Result |
|------------|--------------|----------|--------|
| US-001 | auth.feature | auth.spec.ts | ✓ Pass |
| US-002 | auth.feature | auth.spec.ts | ✓ Pass |
| US-003 | [feature].feature | [test].spec.ts | ✓ Pass |
| ... | ... | ... | ... |

## Test Details

### auth.spec.ts

- ✓ should register new user (1.2s)
- ✓ should login with valid credentials (0.8s)
- ✓ should reject invalid credentials (0.5s)

### [feature].spec.ts

- ✓ [test case 1] (X.Xs)
- ✓ [test case 2] (X.Xs)

## Failures

[None or list of failures with details]

## Result

**All acceptance tests passed: ✓**
```

---

## Step 5: Launch Checklist

Final comprehensive checklist.

### Generate Checklist

`.prodready/verify/launch-checklist.md`:

```markdown
# Launch Checklist

Project: [Name]
Date: [timestamp]
Verified by: ProdReady

## Specification

- [x] All user stories implemented
- [x] All API endpoints match OpenAPI spec
- [x] Data model matches schema
- [x] Test coverage > 80%

## Security

- [x] No critical/high vulnerabilities in dependencies
- [x] No secrets in codebase
- [x] OWASP Top 10 addressed
- [x] Authentication working correctly
- [x] Authorization checks in place
- [x] Input validation on all endpoints

## Performance

- [x] Core Web Vitals meet targets (if frontend)
- [x] API response times < 200ms (p95)
- [x] Database queries optimized
- [x] No N+1 queries

## Testing

- [x] Unit tests passing
- [x] Integration tests passing
- [x] E2E tests passing
- [x] All acceptance criteria verified

## Infrastructure

- [x] Docker builds successfully
- [x] docker compose.prod.yml configured
- [x] Health checks working
- [x] Environment variables documented
- [x] CI/CD pipeline working

## Documentation

- [x] README.md complete
- [x] DEPLOYMENT.md complete
- [x] API documentation complete
- [x] .env.example has all variables

## Pre-Deployment

- [ ] Production environment variables set
- [ ] Database credentials secured
- [ ] Domain configured (if applicable)
- [ ] SSL certificate ready (if applicable)
- [ ] Backup strategy defined
- [ ] Monitoring configured (optional)

---

## Deployment Command

```bash
# On production server:
docker compose -f docker compose.prod.yml up -d

# Run migrations:
docker compose -f docker compose.prod.yml exec app npx prisma migrate deploy
```

---

## Result

🎉 **PRODUCTION READY**

All automated checks passed. Complete the pre-deployment checklist items before deploying.
```

---

## Final Output

```
╔═══════════════════════════════════════════════════════════╗
║              Phase 6: VERIFY Complete                     ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Reports Generated:                                       ║
║  ├── .prodready/verify/spec-compliance.md                ║
║  ├── .prodready/verify/security-report.md                ║
║  ├── .prodready/verify/performance-report.md             ║
║  ├── .prodready/verify/acceptance-results.md             ║
║  └── .prodready/verify/launch-checklist.md               ║
║                                                           ║
║  Results:                                                 ║
║  ✓ Spec Compliance: 100%                                 ║
║  ✓ Security: No critical/high issues                     ║
║  ✓ Performance: All targets met                          ║
║  ✓ Acceptance: XX/XX tests passed                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

➤ Next: /prodready.gate verify
```

---

## If Issues Found

If any verification step fails:

```
╔═══════════════════════════════════════════════════════════╗
║              Phase 6: VERIFY - Issues Found               ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  ✓ Spec Compliance: 100%                                 ║
║  ✗ Security: 2 high severity issues                      ║
║  ✓ Performance: All targets met                          ║
║  ✗ Acceptance: 24/26 tests passed (2 failing)            ║
║                                                           ║
║  Issues:                                                  ║
║  1. High: Vulnerable dependency: lodash < 4.17.21        ║
║  2. High: Missing rate limiting on auth endpoints        ║
║  3. E2E: "should handle edge case X" failing             ║
║  4. E2E: "should validate input Y" failing               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

➤ Fix with: /prodready.fix security
➤ Then: /prodready.fix test
➤ Finally: /prodready.gate verify
```
