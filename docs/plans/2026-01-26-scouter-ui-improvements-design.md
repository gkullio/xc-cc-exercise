# Scouter UI Improvements Design

**Date:** 2026-01-26
**Branch:** `feature/scouter-ui-improvements`

## Overview

Three updates to the onsite demo apps:
1. Add test detail modals to Scouter app
2. Update copy in Design Objectives (capsule-info)
3. Add RFC1918 validation to Dragon Radar latency tests

---

## 1. Test Detail Modal (Scouter App)

### Interaction Design
- Add info icon (ⓘ) next to each test checkbox label
- Click icon → opens modal with technical description
- Checkbox toggle remains unchanged
- Modal closes via X button or clicking outside

### Files to Modify
- `scouter-app/public/index.html` - Add info icons and modal HTML
- `scouter-app/public/css/style.css` - Modal styles
- `scouter-app/public/js/app.js` - Modal open/close logic

### Technical Descriptions (Technical Only)

**Dragon Radar API Tests:**

| Test | Description |
|------|-------------|
| Rate Limiting | Sends 50 rapid requests to /api/radar/scan within 2 seconds. Verifies 429 responses when limits exceeded. |
| Caching Strategy | Compares Cache-Control headers and response times between initial and subsequent requests to verify CDN caching. |
| Global Performance | Measures round-trip latency across 3 requests. Classifies: Excellent (<50ms), Good (<100ms), Acceptable (<150ms), Poor (>200ms). |
| API Security | Tests SQL injection, path traversal, and oversized header attacks. Verifies 403/400 blocking responses. |

**Capsule Store Tests:**

| Test | Description |
|------|-------------|
| WAF Protection | Sends OWASP Top 10 attack patterns (XSS, SQLi, command injection). Counts blocked vs allowed requests. |
| Bot Protection | Tests with automated user-agent strings and suspicious patterns. Verifies bot mitigation rules trigger. |
| DDoS Mitigation | Simulates burst traffic patterns. Checks for rate limiting and challenge responses under load. |
| PCI Compliance | Validates TLS version, cipher suites, and security headers for PCI-DSS requirements. |

### Modal UI Spec
- Dark theme matching existing aesthetic
- Max-width: 500px
- Backdrop overlay (semi-transparent dark)
- Header: Test name
- Body: Technical description
- Close: X button top-right, click-outside-to-dismiss

---

## 2. Copy Updates (capsule-info/index.html)

Update the Design Objectives section (lines ~270-300):

### 01 - Multi-Cloud Architecture
**New:**
> Use F5 XC to unify security and connectivity across AWS, Azure, and the West City on-premises data center. Provide east/west connectivity for the gravity chamber control systems.

### 02 - API Security
**New:**
> Protect the Dragon Radar API (high-volume, global) and e-commerce payment APIs (PCI-DSS scope) using F5 XC services.

### 03 - DDoS, WAF & Bot Protection
**New:**
> Defend against sophisticated Layer 7 attacks targeting product launches. Address the credential stuffing challenge using residential proxies.

### 04 - Performance Optimization
**New:**
> Reduce Dragon Radar API latency for European users from 950ms to under 150ms. Handle 340%+ traffic spikes during product announcements.

### 05 - Unified Management
**New:**
> Provide Bulma's security team centralized visibility and policy control, eliminating the 23 hours/week spent reconciling alerts across platforms.

---

## 3. RFC1918 Validation (Dragon Radar Tests)

### Problem
The performance/latency test needs to hit an external endpoint. If FQDN resolves to RFC1918 (private) address, latency measurements are meaningless.

### Solution
Add validation before running `testPerformance` in `scouter-app/lib/tests/radar.js`:

1. Resolve FQDN to IP using `dns.resolve4()`
2. Check if IP falls in RFC1918 ranges:
   - 10.0.0.0/8
   - 172.16.0.0/12
   - 192.168.0.0/16
3. If private → fail with clear message
4. If public → proceed with latency tests

### Implementation
Reuse helper functions from `scouter-app/lib/tests/chamber.js`:
- `PRIVATE_RANGES` constant
- `ipToLong()` function
- `isPrivateIP()` function

Either:
- Extract to shared utility file, or
- Duplicate in radar.js (simpler, acceptable for 2 usages)

Recommend: Duplicate for simplicity (YAGNI).

---

## Implementation Order

1. **Copy updates** (simplest, low risk)
2. **RFC1918 validation** (backend only, testable)
3. **Modal UI** (frontend, most complex)

---

## Testing

- Manual testing of modal open/close
- Verify copy renders correctly
- Test RFC1918 validation with:
  - Private IP (should fail)
  - Public hostname (should pass)
  - Direct IP input (should handle both)
