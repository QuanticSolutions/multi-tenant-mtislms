import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Sliders,
  AlertTriangle,
  Search,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory" },
      { name: "description", content: "Track school supplies, equipment, stock levels and issue transactions." },
    ],
  }),
  component: InventoryPage,
});

type Category = { id: string; name: string; description: string | null };
type Item = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  description: string | null;
  unit: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number;
  location: string | null;
  supplier: string | null;
  status: string;
  inventory_categories?: { name: string } | null;
};
type Txn = {
  id: string;
  item_id: string;
  txn_type: "in" | "out" | "adjust";
  quantity: number;
  unit_cost: number | null;
  reference: string | null;
  notes: string | null;
  issued_to: string | null;
  txn_date: string;
  inventory_items?: { name: string; unit: string } | null;
};

function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [txnOpen, setTxnOpen] = useState(false);
  const [txnItem, setTxnItem] = useState<Item | null>(null);
  const [txnType, setTxnType] = useState<"in" | "out" | "adjust">("in");

  const categories = useQuery({
    queryKey: ["inventory_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const items = useQuery({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, inventory_categories:category_id ( name )")
        .order("name");
      if (error) throw error;
      return data as Item[];
    },
  });

  const txns = useQuery({
    queryKey: ["inventory_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select("*, inventory_items:item_id ( name, unit )")
        .order("txn_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Txn[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (items.data ?? []).filter((it) => {
      if (catFilter !== "all" && it.category_id !== catFilter) return false;
      if (!s) return true;
      return (
        it.name.toLowerCase().includes(s) ||
        (it.sku ?? "").toLowerCase().includes(s) ||
        (it.location ?? "").toLowerCase().includes(s)
      );
    });
  }, [items.data, search, catFilter]);

  const stats = useMemo(() => {
    const list = items.data ?? [];
    const totalValue = list.reduce((s, it) => s + it.quantity * it.unit_cost, 0);
    const low = list.filter((it) => it.quantity <= it.reorder_level && it.status === "active").length;
    return {
      totalItems: list.length,
      totalUnits: list.reduce((s, it) => s + Number(it.quantity), 0),
      totalValue,
      low,
    };
  }, [items.data]);

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Item deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeCat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_categories"] });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Category deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Operations</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Track supplies, equipment and stock movements across the school.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingCat(null);
              setCatOpen(true);
            }}
          >
            <Tag /> New category
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setItemOpen(true);
            }}
          >
            <Plus /> New item
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat label="Items" value={stats.totalItems} icon={Package} />
        <Stat label="Total units" value={stats.totalUnits} />
        <Stat
          label="Stock value"
          value={`Rs ${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        />
        <Stat label="Low stock" value={stats.low} tone={stats.low > 0 ? "danger" : undefined} />
      </section>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <div className="mtis-card p-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, SKU or location…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {(categories.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Stock</th>
                    <th className="py-2 pr-3">Unit cost</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 && !items.isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No items match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((it) => {
                      const low = it.quantity <= it.reorder_level;
                      return (
                        <tr key={it.id} className="hover:bg-primary-pale/30">
                          <td className="py-2 pr-3">
                            <div className="font-medium">{it.name}</div>
                            {it.sku && (
                              <div className="text-[11px] text-muted-foreground">SKU {it.sku}</div>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {it.inventory_categories?.name ?? "—"}
                          </td>
                          <td className="py-2 pr-3">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${low ? "text-accent" : "text-foreground"}`}
                            >
                              {low && <AlertTriangle className="size-3.5" />}
                              {Number(it.quantity)} {it.unit}
                            </span>
                            <div className="text-[11px] text-muted-foreground">
                              reorder ≤ {Number(it.reorder_level)}
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            Rs {Number(it.unit_cost).toLocaleString()}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{it.location ?? "—"}</td>
                          <td className="py-2 pr-3">
                            <Badge variant="outline" className="capitalize">
                              {it.status}
                            </Badge>
                          </td>
                          <td className="py-2">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setTxnItem(it);
                                  setTxnType("in");
                                  setTxnOpen(true);
                                }}
                              >
                                <ArrowDownToLine /> In
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setTxnItem(it);
                                  setTxnType("out");
                                  setTxnOpen(true);
                                }}
                              >
                                <ArrowUpFromLine /> Out
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setTxnItem(it);
                                  setTxnType("adjust");
                                  setTxnOpen(true);
                                }}
                              >
                                <Sliders />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingItem(it);
                                  setItemOpen(true);
                                }}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Delete "${it.name}"?`)) removeItem.mutate(it.id);
                                }}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <div className="mtis-card p-4">
            <div className="divide-y divide-border">
              {(categories.data ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No categories yet. Create one to organise items.
                </p>
              ) : (
                (categories.data ?? []).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    <div className="grid size-9 place-items-center rounded-md bg-primary-pale text-primary">
                      <Tag className="size-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{c.name}</div>
                      {c.description && (
                        <div className="text-xs text-muted-foreground">{c.description}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingCat(c);
                        setCatOpen(true);
                      }}
                    >
                      <Pencil /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete category "${c.name}"?`)) removeCat.mutate(c.id);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <div className="mtis-card p-4">
            <h2 className="font-display text-lg font-semibold">Recent stock movements</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Quantity</th>
                    <th className="py-2 pr-3">Reference</th>
                    <th className="py-2 pr-3">Issued to</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(txns.data ?? []).length === 0 && !txns.isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No stock transactions yet.
                      </td>
                    </tr>
                  ) : (
                    (txns.data ?? []).map((t) => (
                      <tr key={t.id}>
                        <td className="py-2 pr-3 text-muted-foreground">{t.txn_date}</td>
                        <td className="py-2 pr-3 font-medium">
                          {t.inventory_items?.name ?? "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge
                            variant="secondary"
                            className={
                              t.txn_type === "in"
                                ? "bg-success-soft text-success"
                                : t.txn_type === "out"
                                  ? "bg-accent-soft text-accent"
                                  : "bg-info-soft text-info"
                            }
                          >
                            {t.txn_type === "in" ? "Stock in" : t.txn_type === "out" ? "Stock out" : "Adjustment"}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3">
                          {Number(t.quantity)} {t.inventory_items?.unit ?? ""}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{t.reference ?? "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{t.issued_to ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ItemDialog
        open={itemOpen}
        onOpenChange={(v) => {
          setItemOpen(v);
          if (!v) setEditingItem(null);
        }}
        item={editingItem}
        categories={categories.data ?? []}
      />
      <CategoryDialog
        open={catOpen}
        onOpenChange={(v) => {
          setCatOpen(v);
          if (!v) setEditingCat(null);
        }}
        category={editingCat}
      />
      <TxnDialog
        open={txnOpen}
        onOpenChange={(v) => {
          setTxnOpen(v);
          if (!v) setTxnItem(null);
        }}
        item={txnItem}
        type={txnType}
      />
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone?: "danger";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mtis-card p-4">
      <div className="flex items-center justify-between">
        <p className="mtis-eyebrow">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <p
        className={`mt-1 font-display text-2xl font-bold ${tone === "danger" ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function ItemDialog({
  open,
  onOpenChange,
  item,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Item | null;
  categories: Category[];
}) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const [form, setForm] = useState(() => itemDefaults(item));
  useMemo(() => setForm(itemDefaults(item)), [item, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        category_id: form.category_id || null,
        description: form.description || null,
        unit: form.unit || "piece",
        quantity: Number(form.quantity) || 0,
        reorder_level: Number(form.reorder_level) || 0,
        unit_cost: Number(form.unit_cost) || 0,
        location: form.location || null,
        supplier: form.supplier || null,
        status: form.status,
      };
      if (isEdit && item) {
        const { error } = await supabase.from("inventory_items").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success(isEdit ? "Item updated" : "Item created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update item details. Use stock in/out to change quantity." : "Add a supply or equipment item to inventory."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">SKU</label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select
                value={form.category_id || "none"}
                onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Uncategorised" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorised</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Unit</label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="piece, box, litre"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {isEdit ? "Current quantity" : "Opening quantity"}
              </label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                disabled={isEdit}
              />
              {isEdit && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Use stock in / out to change quantity.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reorder level</label>
              <Input
                type="number"
                value={form.reorder_level}
                onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Unit cost (Rs)</label>
              <Input
                type="number"
                value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Store room A"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Supplier</label>
              <Input
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {isEdit ? "Save changes" : "Create item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function itemDefaults(it: Item | null) {
  return {
    name: it?.name ?? "",
    sku: it?.sku ?? "",
    category_id: it?.category_id ?? "",
    description: it?.description ?? "",
    unit: it?.unit ?? "piece",
    quantity: String(it?.quantity ?? 0),
    reorder_level: String(it?.reorder_level ?? 0),
    unit_cost: String(it?.unit_cost ?? 0),
    location: it?.location ?? "",
    supplier: it?.supplier ?? "",
    status: it?.status ?? "active",
  };
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Category | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  useMemo(() => {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
  }, [category, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const payload = { name: name.trim(), description: description || null };
      if (isEdit && category) {
        const { error } = await supabase
          .from("inventory_categories")
          .update(payload)
          .eq("id", category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_categories"] });
      toast.success(isEdit ? "Category updated" : "Category created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Organise items into categories.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Stationery" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TxnDialog({
  open,
  onOpenChange,
  item,
  type,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Item | null;
  type: "in" | "out" | "adjust";
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    quantity: "1",
    unit_cost: "",
    reference: "",
    issued_to: "",
    notes: "",
    txn_date: new Date().toISOString().slice(0, 10),
  });
  useMemo(() => {
    setForm({
      quantity: "1",
      unit_cost: item ? String(item.unit_cost) : "",
      reference: "",
      issued_to: "",
      notes: "",
      txn_date: new Date().toISOString().slice(0, 10),
    });
  }, [item, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("No item selected");
      const qty = Number(form.quantity);
      if (!qty || qty <= 0) throw new Error("Quantity must be greater than 0");
      if (type === "out" && qty > Number(item.quantity)) {
        throw new Error(`Only ${item.quantity} ${item.unit} in stock`);
      }
      const signedQty = type === "adjust" ? qty - Number(item.quantity) : qty;
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("inventory_transactions").insert({
        item_id: item.id,
        txn_type: type,
        quantity: signedQty,
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        reference: form.reference || null,
        issued_to: form.issued_to || null,
        notes: form.notes || null,
        txn_date: form.txn_date,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      qc.invalidateQueries({ queryKey: ["inventory_transactions"] });
      toast.success("Transaction recorded");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const title =
    type === "in" ? "Record stock in" : type === "out" ? "Record stock out" : "Adjust stock";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {item ? (
              <>
                {item.name} — current stock:{" "}
                <span className="font-semibold text-foreground">
                  {Number(item.quantity)} {item.unit}
                </span>
              </>
            ) : (
              "Select an item"
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {type === "adjust" ? "New quantity" : "Quantity"}
              </label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input
                type="date"
                value={form.txn_date}
                onChange={(e) => setForm({ ...form, txn_date: e.target.value })}
              />
            </div>
            {type === "in" && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Unit cost (Rs, optional)
                </label>
                <Input
                  type="number"
                  value={form.unit_cost}
                  onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                {type === "in" ? "Reference / PO #" : "Reference"}
              </label>
              <Input
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </div>
            {type === "out" && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Issued to</label>
                <Input
                  value={form.issued_to}
                  onChange={(e) => setForm({ ...form, issued_to: e.target.value })}
                  placeholder="Teacher / department"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !item}>
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
