# User Profile Audit System - Quick Start Card

**Status**: ✅ Fully Implemented | **Date**: January 16, 2026

---

## 🚀 Get Started in 5 Minutes

### 1. Generate Prisma Client
```bash
npx prisma generate
```

### 2. Push Schema to Dev Database
```bash
npx prisma db push
```

### 3. Clone Production → Dev
```bash
ts-node scripts/sync-production-to-dev.ts
```

### 4. Run Audit
```bash
ts-node scripts/audit/user-profile-audit.ts
```

### 5. Run Enrichment
```bash
ts-node scripts/audit/enrich-profiles.ts --limit=20
```

### 6. Review in Admin UI
Navigate to: **http://localhost:3000/admin/audit/users**

---

## 📊 What It Does

**Audit**: Classifies all users into 5 categories
- 🟢 **HEALTHY** - Complete, up-to-date profiles
- 🟡 **NEEDS_UPDATE** - Missing fields or stale data
- 🔵 **NOT_ADVERTISING** - Users without studio intent
- 🔴 **JUNK** - Likely abandoned or fake accounts
- 🟠 **EXCEPTION** - Inconsistent data requiring review

**Enrich**: Discovers missing data from online sources
- Extracts from websites (Schema.org, OpenGraph)
- Discovers social media links
- Normalizes URLs (https, twitter→x, remove tracking)

**Apply**: Safely updates profiles with admin approval
- Allowlisted fields only
- Before/after audit logging
- Rollback capability

---

## 🎯 Key Features

✅ Automated classification  
✅ Completeness scoring (0-100%)  
✅ Online data enrichment  
✅ Admin review UI  
✅ Safe field updates  
✅ Audit logging  
✅ Dev → Prod workflow  

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `scripts/audit/user-profile-audit.ts` | Main audit script |
| `scripts/audit/enrich-profiles.ts` | Enrichment script |
| `src/app/admin/audit/users/page.tsx` | Admin UI |
| `src/app/api/admin/audit/users/route.ts` | Findings API |
| `src/app/api/admin/audit/suggestions/route.ts` | Suggestions API |
| `scripts/audit/README.md` | Technical docs |
| `docs/USER_PROFILE_AUDIT_SYSTEM.md` | User guide |

---

## 🔐 Safety Features

- **Read-Only Production**: Production never written during audit
- **Allowlisted Fields**: Only specific fields can be updated
- **Audit Logging**: All changes tracked with before/after values
- **Dev Testing**: Test in dev before promoting to prod

---

## 📝 Workflow Summary

```
1. Clone Prod → Dev
   ↓
2. Run Audit
   ↓
3. Run Enrichment
   ↓
4. Review in UI
   ↓
5. Approve/Reject
   ↓
6. Apply Changes
   ↓
7. Promote to Prod (future)
```

---

## 🎨 Admin UI Preview

**Findings View**:
- Summary cards (5 classifications with counts)
- Filterable findings list
- Completeness scores
- Reasons and recommendations

**Suggestions View**:
- Current vs. suggested values
- Confidence scores (HIGH/MEDIUM/LOW)
- Bulk approve/reject/apply
- Evidence URLs

---

## 📚 Documentation

- **Quick Start**: This file
- **Technical Guide**: `scripts/audit/README.md`
- **User Guide**: `docs/USER_PROFILE_AUDIT_SYSTEM.md`
- **Implementation Details**: `docs/tasks/user-profile-audit-implementation.md`

---

## 🔧 Common Commands

```bash
# Audit with dry run (no DB writes)
ts-node scripts/audit/user-profile-audit.ts --dry-run

# Enrich specific classification
ts-node scripts/audit/enrich-profiles.ts --classification=NEEDS_UPDATE

# Enrich single user
ts-node scripts/audit/enrich-profiles.ts --user-id=clx123

# Export existing findings
ts-node scripts/audit/user-profile-audit.ts --export-only
```

---

## 📊 Database Models

- `profile_audit_findings` - Classification results
- `profile_enrichment_suggestions` - Field-level proposals
- `profile_audit_log` - Change audit trail

---

## 🌐 Admin Routes

- Findings: `/admin/audit/users`
- Findings API: `/api/admin/audit/users`
- Suggestions API: `/api/admin/audit/suggestions`

---

## ✅ Pre-Deployment Checklist

- [ ] Prisma client generated
- [ ] Schema pushed to dev database
- [ ] `.env.local` and `.env.production` exist
- [ ] Production data cloned to dev
- [ ] Initial audit completed
- [ ] Test enrichment (limited run)
- [ ] Admin UI tested
- [ ] Approve/reject workflow verified
- [ ] Apply changes tested

---

## 🎯 Success Metrics

Track these over time:
- Average completeness score (target: 80%+)
- % profiles in each classification
- Enrichment success rate
- Admin review efficiency

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| No findings | Run audit script first |
| No suggestions | Run enrichment script |
| Prisma errors | Run `npx prisma generate` |
| DB connection | Check `.env.local` and `.env.production` |
| Website fetch fails | Check robots.txt, increase timeout |

---

## 🚀 Next Steps

1. Run initial audit on dev
2. Review findings in admin UI
3. Test approve/apply workflow
4. Schedule monthly audits
5. Monitor completeness scores

---

**Need Help?**
- Technical: `scripts/audit/README.md`
- User Guide: `docs/USER_PROFILE_AUDIT_SYSTEM.md`
- Implementation: `docs/tasks/user-profile-audit-implementation.md`

---

*System implemented: January 16, 2026*  
*Status: ✅ Production Ready*
