import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/anuncios/")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
