# 📁 Project Structure

## **Root Directory**

```
vostudiofinder/
├── src/                    # Source code
│   ├── app/               # Next.js app router pages & API routes
│   ├── components/        # React components
│   ├── lib/              # Utility functions & helpers
│   └── types/            # TypeScript type definitions
│
├── prisma/                # Database
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migration files
│
├── public/                # Static assets
│   ├── images/           # Images
│   ├── favicon/          # Favicon files
│   └── background-images/ # Background images
│
├── scripts/               # Build & utility scripts
│   ├── migrate-with-protection.sh
│   ├── sync-prod-to-dev.sh
│   ├── show-db-env.sh
│   └── *.ts              # TypeScript utility scripts
│
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
│
├── docs/                  # Documentation
│   ├── tasks/            # Task lists & PRDs
│   ├── DATABASE_SAFETY_SETUP.md
│   ├── MIGRATION_*.md    # Migration documentation
│   └── *.md              # Other documentation
│
├── backups/               # Database backups (gitignored)
│   ├── database/         # Database dumps
│   └── images/           # Image backups
│
├── logs/                  # Application logs (gitignored)
│
├── project-archive/       # Archived files (gitignored)
│
└── [Config Files]         # Root configuration files
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── jest.config.cjs
    ├── playwright.config.ts
    ├── eslint.config.mjs
    ├── postcss.config.mjs
    ├── vercel.json
    ├── docker-compose.yml
    ├── Dockerfile
    ├── README.md
    └── env.example
```

---

## **Key Directories Explained**

### **`src/app/`**
Next.js 13+ App Router structure:
- `page.tsx` files = routes
- `route.ts` files = API endpoints
- `layout.tsx` files = shared layouts
- `loading.tsx` files = loading states
- `error.tsx` files = error boundaries

### **`src/components/`**
Organized by feature:
```
components/
├── admin/          # Admin panel components
├── auth/           # Authentication components
├── dashboard/      # User dashboard
├── home/           # Homepage components
├── profile/        # Profile components
├── search/         # Search & filtering
├── studio/         # Studio components
└── ui/             # Reusable UI components
```

### **`src/lib/`**
Utility functions and configurations:
```
lib/
├── auth.ts         # Authentication config
├── db.ts           # Database client
├── logger.ts       # Logging utility
├── maps.ts         # Google Maps integration
├── utils/          # Utility functions
└── validations/    # Zod schemas
```

### **`docs/`**
All documentation files:
- Migration guides
- API documentation
- Architecture decisions
- Task lists & PRDs
- Deployment guides

### **`scripts/`**
Utility scripts:
- Database migration helpers
- Data seeding scripts
- Deployment scripts
- Safety scripts (db sync, migration protection)

---

## **Important Files**

| File | Purpose |
|------|---------|
| `README.md` | Project overview & setup |
| `package.json` | Dependencies & npm scripts |
| `tsconfig.json` | TypeScript configuration |
| `next.config.ts` | Next.js configuration |
| `prisma/schema.prisma` | Database schema |
| `env.example` | Environment variables template |
| `.gitignore` | Git ignore rules |
| `vercel.json` | Vercel deployment config |

---

## **Configuration Files**

### **TypeScript**
- `tsconfig.json` - Main TypeScript config
- `next-env.d.ts` - Next.js type definitions (auto-generated)
- `*.d.ts` files - Custom type declarations

### **Styling**
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS configuration
- `src/app/globals.css` - Global styles

### **Testing**
- `jest.config.cjs` - Jest configuration
- `jest.setup.cjs` - Jest setup file
- `playwright.config.ts` - Playwright E2E tests

### **Linting**
- `eslint.config.mjs` - ESLint configuration
- `.prettierrc` - Prettier configuration

### **Error Tracking**
- `sentry.client.config.ts` - Sentry client config
- `sentry.server.config.ts` - Sentry server config
- `sentry.edge.config.ts` - Sentry edge config

---

## **Environment Files**

```
.env.local          # Local development (DEV database)
.env.production     # Production (PRODUCTION database)
env.example         # Template for environment variables
```

**Never commit:** `.env.local`, `.env.production`  
**Always commit:** `env.example`

---

## **Build Artifacts (Gitignored)**

```
.next/              # Next.js build output
out/                # Static export output
dist/               # Distribution files
node_modules/       # Dependencies
*.tsbuildinfo       # TypeScript incremental builds
logs/               # Application logs
backups/            # Database backups
```

---

## **NPM Scripts**

See `package.json` for full list. Key scripts:

```bash
# Development
npm run dev         # Start dev server
npm run build       # Production build
npm run start       # Start production server

# Database
npm run db:check    # Show database environment
npm run db:sync     # Sync production to dev
npm run db:migrate:dev    # Migrate dev database
npm run db:migrate:prod   # Migrate production (protected)

# Testing
npm test            # Run tests
npm run test:watch  # Watch mode
npm run lint        # Lint code

# Type checking
npm run type-check  # TypeScript check
```

---

## **Navigation Tips**

### **Finding Code**

```bash
# Find API routes
ls src/app/api/**/route.ts

# Find page components
ls src/app/**/page.tsx

# Find reusable components
ls src/components/

# Find utilities
ls src/lib/
```

### **Finding Documentation**

```bash
# All docs
ls docs/

# Migration docs
ls docs/MIGRATION*.md

# Task lists
ls docs/tasks/

# Safety guide
cat docs/DATABASE_SAFETY_SETUP.md
```

---

## **Clean Codebase Checklist**

✅ All documentation in `docs/`  
✅ No loose `.md` files in root (except `README.md`)  
✅ Backups organized in subdirectories  
✅ Tasks moved to `docs/tasks/`  
✅ Temporary files removed (assets, dev.log)  
✅ Config files consolidated (no duplicates)  
✅ `.gitignore` updated and clean  
✅ Clear directory structure  

---

**Last Updated:** December 16, 2025

