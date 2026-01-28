# Documentation

This folder contains public documentation for the VoiceoverStudioFinder project.

## 📁 Folder Structure

```
docs/                   - Public documentation (safe to commit)
docs-private/          - Private docs with credentials (gitignored)
tests/                 - Test documentation
scripts/               - Script documentation
```

## 📚 Key Documentation

### **Current Status**
- `FUTURE_DEVELOPMENT.md` - Deferred features and future enhancements
- `MIGRATION_STATUS.md` - Database migration tracking
- `RENEWAL_SYSTEM_UPDATE.md` - Membership renewal system documentation

### **Deployment**
- `deployment-guide.md` - General deployment instructions
- `database-safety-setup.md` - Database protection setup
- `environment-setup.md` - Environment configuration guide

### **Features**
- `prd-username-reservation-system.md` - Username reservation feature
- `AUDIT_SYSTEM_QUICK_START.md` - User profile audit system
- `NOTIFICATION_SYSTEM_IMPLEMENTATION.md` - In-app notifications

### **Bug Fixes & Improvements**
- `SEARCH_MAP_IMPROVEMENTS.md` - Map and search enhancements
- `MOBILE_DASHBOARD_OPTIMIZATION.md` - Mobile UI improvements
- `SECURITY_FIX_VISIBILITY_TOGGLE_VALIDATION.md` - Security patches

### **Email System**
- `email-deliverability-action-plan.md` - Email delivery optimization
- `email-sender-best-practices.md` - Email best practices
- `EMAIL_SYSTEM_BUG_FIXES.md` - Email bug fixes

### **Stripe Integration**
- `stripe-setup-guide.md` - Stripe configuration
- `stripe-dev-quick-start.md` - Development setup
- `stripe-troubleshooting.md` - Common issues

### **Bot Protection**
- `BOT_PROTECTION_DEPLOYMENT.md` - Bot protection setup (public version)
- See `docs-private/` for sensitive deployment details

## 🔒 Private Documentation

Sensitive documentation (API keys, credentials, production data) is stored in:

```
docs-private/          - Contains sensitive info (NOT in git)
├── CLOUDFLARE_SETUP_COMPLETE.md
├── BOT_PROTECTION_SUMMARY.md
├── BOT_SIGNUP_DIAGNOSIS_REPORT.md
├── DEPLOYMENT_NOTES.md
└── DEPLOYMENT_MIGRATION_COMPLETE.md
```

**⚠️ Never commit files from `docs-private/` to git!**

## 📝 Creating New Documentation

### **Public Documentation** (save to `docs/`)
- Feature specifications (PRDs)
- Implementation guides
- Bug fix summaries
- User-facing documentation
- API documentation (without keys)

### **Private Documentation** (save to `docs-private/`)
- API keys and secrets
- Database credentials
- Production deployment logs
- User data analysis
- Internal diagnosis reports

## 🔍 Finding Documentation

Use these commands to search:

```bash
# Search all documentation
grep -r "keyword" docs/

# List all markdown files
find docs/ -name "*.md"

# Search by category
ls docs/*stripe*
ls docs/*email*
ls docs/*audit*
```

## 🏷️ Documentation Standards

When creating new documentation:

1. **Use descriptive filenames**: `feature-name-implementation.md`
2. **Include date**: Add "Last Updated: YYYY-MM-DD" at top
3. **Add to this README**: Link important docs in appropriate section
4. **Use proper formatting**: Markdown with headers, code blocks, lists
5. **Sanitize sensitive data**: Use placeholders like `[YOUR_API_KEY]`

## 📊 Documentation by Category

### **Admin Tools**
- `admin-mobile-audit.md`
- `admin-profile-improvements-prd.md`
- `ADMIN_MOBILE_IMPLEMENTATION.md`

### **Testing**
- `MANUAL_TESTING_CHECKLIST.md`
- `mobile-qa-checklist.md`
- `audit-test-results.md`

### **Database**
- `DATABASE_MIGRATION_DEPLOYMENT.md`
- `database-safety-setup.md`
- See `/prisma/migrations/` for migration files

### **Mobile**
- `mobile-overhaul-prd.md`
- `MOBILE_DASHBOARD_OPTIMIZATION.md`
- `mobile-technical-corrections.md`

---

**Last Updated**: January 28, 2026
