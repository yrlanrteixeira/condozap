import { defineConfig } from "vitest/config";

const tier = (pct: number) => ({
  lines: pct,
  functions: pct,
  branches: pct,
  statements: pct,
});

const T1 = tier(95);
const T2 = tier(90);
const T3 = tier(80);

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.integration.test.ts",
      "test/**/*.test.ts",
      "test/**/*.integration.test.ts",
    ],
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/modules/**", "src/auth/**", "src/shared/**"],
      exclude: [
        "src/generated/**",
        "src/config/**",
        "src/server.ts",
        "src/app/**",
        "src/plugins/**",
        "**/*.routes.ts",
        "**/*.d.ts",
        "**/types/**",
        "prisma/**",
        "scripts/**",
        "test/**",
        "**/index.ts",
      ],
      thresholds: {
        // Tier 1 — 95%+
        "src/auth/**": T1,
        "src/modules/billing/**": T1,
        "src/modules/user-approval/**": T1,
        "src/modules/user-management/**": T1,
        "src/modules/complaints/**": T1,
        // Tier 2 — 90%+
        "src/modules/messages/**": T2,
        "src/modules/messaging/**": T2,
        "src/modules/notifications/**": T2,
        "src/modules/whatsapp/**": T2,
        "src/modules/evolution/**": T2,
        "src/modules/residents/**": T2,
        "src/modules/condominiums/**": T2,
        "src/modules/sla-cron/**": T2,
        "src/modules/automation/**": T2,
        "src/modules/canned-responses/**": T2,
        "src/shared/**": T2,
        // Tier 3 — 80%+
        "src/modules/dashboard/**": T3,
        "src/modules/sector-dashboard/**": T3,
        "src/modules/reports/**": T3,
        "src/modules/history/**": T3,
        "src/modules/announcements/**": T3,
        "src/modules/platform/**": T3,
        "src/modules/public/**": T3,
        "src/modules/structure/**": T3,
        "src/modules/notifier/**": T3,
        "src/modules/uploads/**": T3,
      },
    },
  },
});
