import { createFileRoute } from "@tanstack/react-router";
import { PublicListings } from "@/components/public-listings";
import { PublicFooter, PublicHeader } from "./anuncios";

export const Route = createFileRoute("/anuncios/")({
  component: AnunciosIndexPage,
});

function AnunciosIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <PublicListings />
      <PublicFooter />
    </div>
  );
}