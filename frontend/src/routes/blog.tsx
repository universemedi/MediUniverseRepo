import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * Pure layout — /blog/index.tsx (the article list) and /blog/$slug.tsx (a
 * single post) are both children of this route in the file-based route tree
 * (blog.$slug.tsx nests under blog.tsx by TanStack Router's dot-segment
 * convention), so this file must render an <Outlet /> or the child routes'
 * content never appears correctly. Same pattern as subscribe.tsx + subscribe.index.tsx.
 */
export const Route = createFileRoute("/blog")({
  component: () => <Outlet />,
});
