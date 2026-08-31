import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * Pure layout — /subscribe/index.tsx (step 1: create account) and
 * /subscribe/plans.tsx (step 2: choose + pay) are both children of this
 * route in the file-based route tree (subscribe.plans.tsx nests under
 * subscribe.tsx by TanStack Router's dot-segment convention), so this file
 * must render an <Outlet /> or the child routes' content never appears —
 * the URL would change on navigate() but the screen wouldn't. Same pattern
 * as app.tsx + app.index.tsx.
 */
export const Route = createFileRoute("/subscribe")({
  component: () => <Outlet />,
});
