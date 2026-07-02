import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  BookOpen,
  Library as LibraryIcon,
  Undo2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/library")({
  head: () => ({
    meta: [
      { title: "Library — Madina Tul Ilm" },
      { name: "description", content: "Manage book catalog and student book issues." },
    ],
  }),
  component: LibraryPage,
});

type BookRow = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  publisher: string | null;
  publication_year: number | null;
  total_copies: number;
  available_copies: number;
  shelf_location: string | null;
};

type IssueRow = {
  id: string;
  book_id: string;
  student_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: "issued" | "returned" | "overdue" | "lost";
  fine_amount: number;
  notes: string | null;
  books?: { title: string; author: string } | null;
  students?: { full_name: string; admission_no: string } | null;
};

function LibraryPage() {
  return (
    <AppShell>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Library</h1>
            <p className="text-sm text-muted-foreground">
              Manage your book catalog and track student borrowings.
            </p>
          </div>
        </div>
        <Tabs defaultValue="books" className="space-y-4">
          <TabsList>
            <TabsTrigger value="books">
              <BookOpen className="size-4 mr-2" /> Catalog
            </TabsTrigger>
            <TabsTrigger value="issues">
              <LibraryIcon className="size-4 mr-2" /> Issues & Returns
            </TabsTrigger>
          </TabsList>
          <TabsContent value="books">
            <BooksTab />
          </TabsContent>
          <TabsContent value="issues">
            <IssuesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ─────────── Books Tab ─────────── */

function BooksTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: books, isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("title", { ascending: true });
      if (error) throw error;
      return data as BookRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!books) return [];
    const q = search.trim().toLowerCase();
    if (!q) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn ?? "").toLowerCase().includes(q) ||
        (b.category ?? "").toLowerCase().includes(q),
    );
  }, [books, search]);

  const totalBooks = books?.length ?? 0;
  const totalCopies = books?.reduce((s, b) => s + b.total_copies, 0) ?? 0;
  const available = books?.reduce((s, b) => s + b.available_copies, 0) ?? 0;
  const issued = totalCopies - available;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Titles" value={totalBooks} />
        <Stat label="Total copies" value={totalCopies} />
        <Stat label="Available" value={available} tone="success" />
        <Stat label="Issued" value={issued} tone="warning" />
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search title, author, ISBN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-1" /> Add book
              </Button>
            </DialogTrigger>
            <AddBookDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["books"] }); }} />
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No books yet"
            description="Add your first book to the library catalog."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Author</th>
                  <th className="py-2 pr-3">ISBN</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Shelf</th>
                  <th className="py-2 pr-3 text-right">Copies</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 hover:bg-primary-pale/30">
                    <td className="py-2 pr-3 font-medium">{b.title}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.author}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.isbn ?? "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.category ?? "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{b.shelf_location ?? "—"}</td>
                    <td className="py-2 pr-3 text-right">
                      <span className={b.available_copies === 0 ? "text-destructive font-semibold" : "font-medium"}>
                        {b.available_copies}
                      </span>
                      <span className="text-muted-foreground"> / {b.total_copies}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AddBookDialog({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    publisher: "",
    publication_year: "",
    total_copies: "1",
    shelf_location: "",
  });

  const m = useMutation({
    mutationFn: async () => {
      const title = form.title.trim();
      const author = form.author.trim();
      if (!title || !author) throw new Error("Title and author are required");
      const copies = Math.max(0, parseInt(form.total_copies || "1", 10));
      const payload = {
        title,
        author,
        isbn: form.isbn.trim() || null,
        category: form.category.trim() || null,
        publisher: form.publisher.trim() || null,
        publication_year: form.publication_year ? parseInt(form.publication_year, 10) : null,
        total_copies: copies,
        available_copies: copies,
        shelf_location: form.shelf_location.trim() || null,
      };
      const { error } = await supabase.from("books").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book added");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add a new book</DialogTitle>
        <DialogDescription>Enter the details to register a book in the catalog.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title *" className="col-span-2">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
        </Field>
        <Field label="Author *">
          <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} maxLength={150} />
        </Field>
        <Field label="ISBN">
          <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} maxLength={20} />
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={80} />
        </Field>
        <Field label="Publisher">
          <Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} maxLength={120} />
        </Field>
        <Field label="Publication year">
          <Input type="number" value={form.publication_year} onChange={(e) => setForm({ ...form, publication_year: e.target.value })} />
        </Field>
        <Field label="Total copies">
          <Input type="number" min={0} value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} />
        </Field>
        <Field label="Shelf location" className="col-span-2">
          <Input value={form.shelf_location} onChange={(e) => setForm({ ...form, shelf_location: e.target.value })} maxLength={50} />
        </Field>
      </div>
      <DialogFooter>
        <Button disabled={m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? "Saving…" : "Save book"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ─────────── Issues Tab ─────────── */

function IssuesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data: issues, isLoading } = useQuery({
    queryKey: ["book_issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_issues")
        .select("*, books(title,author), students(full_name,admission_no)")
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data as IssueRow[];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    if (!issues) return [];
    return issues.filter((i) => {
      const isOverdue = i.status === "issued" && i.due_date < today;
      const effective = isOverdue ? "overdue" : i.status;
      if (statusFilter !== "all" && effective !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        (i.books?.title ?? "").toLowerCase().includes(q) ||
        (i.students?.full_name ?? "").toLowerCase().includes(q) ||
        (i.students?.admission_no ?? "").toLowerCase().includes(q)
      );
    });
  }, [issues, search, statusFilter, today]);

  const active = issues?.filter((i) => i.status === "issued" || i.status === "overdue").length ?? 0;
  const overdue = issues?.filter((i) => (i.status === "overdue") || (i.status === "issued" && i.due_date < today)).length ?? 0;
  const returned = issues?.filter((i) => i.status === "returned").length ?? 0;

  const returnMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("book_issues")
        .update({ status: "returned", return_date: today })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book returned");
      qc.invalidateQueries({ queryKey: ["book_issues"] });
      qc.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total issues" value={issues?.length ?? 0} />
        <Stat label="Active" value={active} tone="warning" />
        <Stat label="Overdue" value={overdue} tone="danger" />
        <Stat label="Returned" value={returned} tone="success" />
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search book or student…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-1" /> Issue book
              </Button>
            </DialogTrigger>
            <IssueBookDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["book_issues"] }); qc.invalidateQueries({ queryKey: ["books"] }); }} />
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={LibraryIcon}
            title="No issues found"
            description="Issue a book to a student to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-3">Book</th>
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Issued</th>
                  <th className="py-2 pr-3">Due</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const isOverdue = i.status === "issued" && i.due_date < today;
                  const status = isOverdue ? "overdue" : i.status;
                  return (
                    <tr key={i.id} className="border-b border-border/60 hover:bg-primary-pale/30">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{i.books?.title ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{i.books?.author}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{i.students?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{i.students?.admission_no}</div>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{i.issue_date}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {i.due_date}
                        {isOverdue && (
                          <AlertTriangle className="inline size-3 ml-1 text-destructive" />
                        )}
                      </td>
                      <td className="py-2 pr-3"><StatusBadge status={status} /></td>
                      <td className="py-2 pr-3 text-right">
                        {(i.status === "issued" || i.status === "overdue") ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={returnMut.isPending}
                            onClick={() => returnMut.mutate(i.id)}
                          >
                            <Undo2 className="size-3.5 mr-1" /> Return
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{i.return_date ?? "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function IssueBookDialog({ onDone }: { onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    book_id: "",
    student_id: "",
    issue_date: today,
    due_date: defaultDue,
    notes: "",
  });

  const { data: books } = useQuery({
    queryKey: ["books-available"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("id,title,author,available_copies")
        .gt("available_copies", 0)
        .order("title");
      if (error) throw error;
      return data as Array<{ id: string; title: string; author: string; available_copies: number }>;
    },
  });

  const { data: students } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,full_name,admission_no")
        .order("full_name");
      if (error) throw error;
      return data as Array<{ id: string; full_name: string; admission_no: string }>;
    },
  });

  const m = useMutation({
    mutationFn: async () => {
      if (!form.book_id || !form.student_id) throw new Error("Pick a book and a student");
      if (form.due_date < form.issue_date) throw new Error("Due date must be on or after issue date");
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("book_issues").insert({
        book_id: form.book_id,
        student_id: form.student_id,
        issue_date: form.issue_date,
        due_date: form.due_date,
        notes: form.notes.trim() || null,
        issued_by: userRes.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Book issued"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Issue a book</DialogTitle>
        <DialogDescription>Lend a book from the catalog to a student.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Book *" className="col-span-2">
          <Select value={form.book_id} onValueChange={(v) => setForm({ ...form, book_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a book" /></SelectTrigger>
            <SelectContent>
              {(books ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title} — {b.author} ({b.available_copies} avail.)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Student *" className="col-span-2">
          <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
            <SelectContent>
              {(students ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.admission_no})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Issue date">
          <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
        </Field>
        <Field label="Due date">
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </Field>
        <Field label="Notes" className="col-span-2">
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={300} />
        </Field>
      </div>
      <DialogFooter>
        <Button disabled={m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? "Issuing…" : "Issue book"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/* ─────────── Shared bits ─────────── */

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" | "danger" }) {
  const toneCls =
    tone === "success" ? "text-emerald-600" :
    tone === "warning" ? "text-amber-600" :
    tone === "danger" ? "text-destructive" :
    "text-foreground";
  return (
    <div className="mtis-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-display font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: IssueRow["status"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    issued: { label: "Issued", cls: "bg-blue-100 text-blue-700" },
    overdue: { label: "Overdue", cls: "bg-red-100 text-red-700" },
    returned: { label: "Returned", cls: "bg-emerald-100 text-emerald-700" },
    lost: { label: "Lost", cls: "bg-gray-200 text-gray-700" },
  };
  const it = map[status];
  return <Badge className={`${it.cls} border-0 font-medium`}>{it.label}</Badge>;
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto size-10 text-muted-foreground/50 mb-3" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
