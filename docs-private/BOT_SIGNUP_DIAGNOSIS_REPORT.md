# Bot Signup Diagnosis Report
Generated: 2026-01-27T23:58:50.798Z

## Executive Summary

- **Total users**: 739
- **Verification rate (PENDING/EXPIRED)**: 27.9%
- **Never-verified old accounts (>7 days)**: 27

### Key Findings

- **Bot signal strength**: MODERATE
- **PENDING + EXPIRED accounts**: 43 (5.8% of total)
- **ACTIVE accounts**: 696 (94.2% of total)
- **⚠️ Repeated display names detected**: Top repeated name appears 11 times
- **⚠️ Rapid signup bursts detected**: Peak of 57 signups in one hour

## Status Breakdown

- **ACTIVE**: 696 (94.2%)
- **PENDING**: 43 (5.8%)

## Email Verification

- **Verified**: 61 (8.3%)
- **Unverified**: 678 (91.7%)

**Median time to verify** (legitimate users): 2.1 minutes

## Top Email Domains (Last 30 Days)

| Domain | Signups | Verified | Verification Rate |
|--------|---------|----------|-------------------|
| test.com | 52 | 0 | 0.0% |
| gmail.com | 13 | 1 | 7.7% |
| test.example.com | 10 | 6 | 60.0% |
| yahoo.com | 3 | 0 | 0.0% |
| aol.com | 2 | 0 | 0.0% |
| outlook.com | 2 | 0 | 0.0% |
| hotmail.com | 2 | 1 | 50.0% |
| example.com | 2 | 1 | 50.0% |
| voiceoverguy.co.uk | 1 | 1 | 100.0% |
| richarddibritannia.com | 1 | 1 | 100.0% |
| aravancargo.com | 1 | 0 | 0.0% |
| peakperformancems.com | 1 | 0 | 0.0% |
| higginbotham.net | 1 | 1 | 100.0% |
| kendallgroup.com | 1 | 1 | 100.0% |
| araglegal.com | 1 | 1 | 100.0% |

## Signup Volume (Last 30 Days)

```
2025-12-29:   0 
2025-12-30:   0 
2025-12-31:   0 
2026-01-01:   0 
2026-01-02:   0 
2026-01-03:   0 
2026-01-04:   0 
2026-01-05:   0 
2026-01-06:   0 
2026-01-07:   0 
2026-01-08:   0 
2026-01-09:   0 
2026-01-10:   0 
2026-01-11:   1 █
2026-01-12:   0 
2026-01-13:   0 
2026-01-14:   0 
2026-01-15:   1 █
2026-01-16:  11 ██████
2026-01-17:   6 ███
2026-01-18:   0 
2026-01-19:   8 ████
2026-01-20:   8 ████
2026-01-21:   5 ███
2026-01-22:   1 █
2026-01-23:   0 
2026-01-24:   0 
2026-01-25:   0 
2026-01-26:   0 
2026-01-27:  58 █████████████████████████████
```

## Suspicious Patterns

### Repeated Display Names (PENDING/EXPIRED)

| Display Name | Count |
|--------------|-------|
| "Test User" | 11 |

### Rapid Signup Bursts (Last 7 Days)

| Hour | Signups |
|------|--------|
| 2026-01-27T18:00:00.000Z | 57 |

### Old Never-Verified Accounts

**27** accounts older than 7 days that have never verified their email.

## Recommendations

### ⚠️ Bot Activity Detected

The low verification rate (27.9%) and high number of PENDING/EXPIRED accounts strongly suggest bot activity.

**Immediate actions**:
1. Implement CAPTCHA (Cloudflare Turnstile) on signup form
2. Add rate limiting to prevent rapid automated signups
3. Add honeypot fields and timing checks
4. Consider requiring email verification before username reservation

**Repeated display names** suggest either:
- Automated bot using same default values
- Manual testing/spam from same source

**Rapid signup bursts** indicate:
- Automated bot attacks
- Need for stricter rate limiting (e.g., max 3 signups per IP per hour)

## Next Steps

1. ✅ Review this report
2. ⏳ Implement Cloudflare Turnstile on signup
3. ⏳ Add rate limiting using Prisma-backed table
4. ⏳ Add honeypot + timing checks
5. ⏳ Monitor signup patterns after deployment
6. ⏳ Consider periodic cleanup of old EXPIRED accounts
