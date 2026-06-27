import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { slugify, formatDateBR } from "@/lib/blog-utils";
import { Pencil, Trash2, Plus } from "lucide-react";
import { AiCoverGenerator } from "@/components/ai-cover-generator";
import { AiArticleAssistant, type GeneratedArticle } from "@/components/ai-article-assistant";
import { UnsplashPicker } from "@/components/unsplash-picker";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  component: AdminBlog,
});

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  author_name: string;
  published: boolean;
  created_at: string;
};

function AdminBlog() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Post> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    setPosts((data ?? []) as Post[]);
    setLoading(false);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (isAdmin === null) return <div className="p-8 text-sm text-muted-foreground">Verificando permissões...</div>;
  if (!isAdmin) return <div className="p-8"><h1 className="text-xl font-semibold">Acesso negado</h1><p className="mt-2 text-sm text-muted-foreground">Esta página é exclusiva para administradores.</p></div>;

  const save = async () => {
    if (!editing?.title || !editing?.excerpt || !editing?.content) {
      toast.error("Preencha título, resumo e conteúdo.");
      return;
    }
    const payload = {
      title: editing.title,
      slug: editing.slug || slugify(editing.title),
      excerpt: editing.excerpt.slice(0, 150),
      content: editing.content,
      cover_image_url: editing.cover_image_url || null,
      author_name: editing.author_name || "Equipe AlugaFlow",
      published: !!editing.published,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("posts").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("posts").insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success("Salvo!");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir este post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    load();
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog — Admin</h1>
          <p className="text-sm text-muted-foreground">Gerencie os artigos publicados em <Link to="/blog" className="text-primary underline">/blog</Link>.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AiArticleAssistant
            onArticleReady={(a: GeneratedArticle) => setEditing({
              published: false,
              author_name: "Equipe AlugaFlow",
              title: a.title,
              slug: a.slug,
              excerpt: a.excerpt,
              content: a.content,
            })}
          />
          <Button onClick={() => setEditing({ published: false, author_name: "Equipe AlugaFlow" })}><Plus className="mr-2 h-4 w-4" /> Novo post</Button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/40 text-left"><tr><th className="p-3">Título</th><th className="p-3">Status</th><th className="p-3">Data</th><th className="p-3 text-right">Ações</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Carregando...</td></tr> :
              posts.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Nenhum post ainda.</td></tr> :
              posts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3"><div className="font-medium">{p.title}</div><div className="text-xs text-muted-foreground">/{p.slug}</div></td>
                  <td className="p-3">{p.published ? <Badge>Publicado</Badge> : <Badge variant="secondary">Rascunho</Badge>}</td>
                  <td className="p-3 text-muted-foreground">{formatDateBR(p.created_at)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl flex max-h-[90vh] flex-col p-0">
          <DialogHeader className="border-b px-6 py-4"><DialogTitle>{editing?.id ? "Editar post" : "Novo post"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
              <div>
                <Label>Título</Label>
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Resumo (máx 150)</Label>
                <Textarea maxLength={150} value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
                <p className="mt-1 text-xs text-muted-foreground">{(editing.excerpt ?? "").length}/150</p>
              </div>
              <div>
                <Label>Conteúdo (## títulos, - listas, **negrito**)</Label>
                <Textarea rows={10} value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
              </div>
              <div>
                <Label>Foto de capa</Label>
                <Input placeholder="Cole uma URL ou gere com IA" value={editing.cover_image_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })} />
                <AiCoverGenerator
                  title={editing.title}
                  onCoverReady={(url) => setEditing((prev) => ({ ...(prev ?? {}), cover_image_url: url }))}
                />
                {editing.cover_image_url && (
                  <img src={editing.cover_image_url} alt="Prévia da capa" className="mt-2 aspect-[16/9] w-full rounded-md border object-cover" />
                )}
              </div>
              <div>
                <Label>Autor</Label>
                <Input value={editing.author_name ?? ""} onChange={(e) => setEditing({ ...editing, author_name: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} />
                <Label>Publicado</Label>
              </div>
            </div>
          )}
          <DialogFooter className="border-t bg-background px-6 py-4">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
