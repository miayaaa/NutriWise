# NutriWise

NutriWise is a nutrition tracking app that helps you log meals, analyze food with AI, and monitor your dietary habits.

## Features

- Food logging with AI analysis
- Dashboard analytics
- Google Authentication
- Cross-platform Support (PWA)

## Stack

- [Next.js](https://nextjs.org) `/app` dir
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) Components
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://www.prisma.io) ORM
- [Zod](https://zod.dev) Validations
- [Neon](https://neon.tech/) Database (PostgreSQL)

## Running Locally

1. Clone the repository.

```bash
git clone https://github.com/miayaaa/NutriWise.git
```

2. Install dependencies using pnpm.

```bash
pnpm install
```

3. Copy `.env.example` to `.env.local` and update the variables.

```bash
cp .env.example .env.local
```

4. Generate prisma client before starting development server.

```bash
pnpm postinstall
```

5. Start the development server.

```bash
pnpm dev
```
