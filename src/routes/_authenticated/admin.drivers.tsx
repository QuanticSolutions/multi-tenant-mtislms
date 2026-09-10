import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/admin/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/drivers")({
  head: () => ({
    meta: [
      { title: "Transport Drivers — Madina Tul Ilm" },
      {
        name: "description",
        content: "Maintain school transport drivers and link them to students.",
      },
      { property: "og:title", content: "Transport Drivers — Madina Tul Ilm" },
      {
        property: "og:description",
        content: "Maintain school transport drivers and link them to students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DriversPage,
});

export type DriverRow = {
  id: string;
  full_name: string;
  phone: string | null;
  cnic: string | null;
  licence_no: string | null;
  vehicle_registration: string | null;
  vehicle_model: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

function DriversPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DriverRow | null>(null);

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as DriverRow[];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["driver-student-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("driver_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data ?? []) {
        if (r.driver_id) map[r.driver_id] = (map[r.driver_id] ?? 0) + 1;
      }
      return map;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (drivers ?? []).filter((d) => {
      const matchesQ =
        !q ||
        d.full_name.toLowerCase().includes(q) ||
        (d.phone?.toLowerCase().includes(q) ?? false) ||
        (d.vehicle_registration?.toLowerCase().includes(q) ?? false);
      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" ? d.is_active : !d.is_active);
      return matchesQ && matchesActive;
    });
  }, [drivers, search, activeFilter]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Driver removed");
      qc.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeFilterCount = (activeFilter !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mtis-eyebrow">Students</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Transport drivers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Driver contacts and vehicles. Assign a driver to a student from the student record.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus /> Add driver
            </Button>
          </DialogTrigger>
          <DriverDialog
            key={editing?.id ?? "new"}
            existing={editing}
            onDone={() => {
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </div>

      <div className="mtis-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone or vehicle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {activeFilterCount > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setActiveFilter("all");
              }}
            >
              <X className="size-4" /> Clear filters
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {drivers?.length ?? 0} drivers
          </div>
        </div>
      </div>

      <div className="mtis-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading drivers…</div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-pale text-primary">
              <Bus className="size-5" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold">No drivers yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add a driver, then link students to them from the student form.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-primary-pale/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{d.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.licence_no ? `Licence ${d.licence_no}` : d.cnic ? `CNIC ${d.cnic}` : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="text-foreground">{d.vehicle_registration ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{d.vehicle_model ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{counts?.[d.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={d.is_active ? "success" : "secondary"}>
                      {d.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(d.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(d);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => {
                        if (confirm(`Remove ${d.full_name}?`)) deleteMut.mutate(d.id);
                      }}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}

function DriverDialog({
  existing,
  onDone,
}: {
  existing: DriverRow | null;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    full_name: existing?.full_name ?? "",
    phone: existing?.phone ?? "",
    cnic: existing?.cnic ?? "",
    licence_no: existing?.licence_no ?? "",
    vehicle_registration: existing?.vehicle_registration ?? "",
    vehicle_model: existing?.vehicle_model ?? "",
    notes: existing?.notes ?? "",
    is_active: existing?.is_active ?? true,
  }));

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Driver name is required");
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone || null,
        cnic: form.cnic || null,
        licence_no: form.licence_no || null,
        vehicle_registration: form.vehicle_registration || null,
        vehicle_model: form.vehicle_model || null,
        notes: form.notes || null,
        is_active: form.is_active,
      };
      if (existing) {
        const { error } = await supabase.from("drivers").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("drivers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existing ? "Driver updated" : "Driver added");
      qc.invalidateQueries({ queryKey: ["drivers"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{existing ? "Edit driver" : "Add driver"}</DialogTitle>
        <DialogDescription>
          Only driver and vehicle details are stored — routes and fares are not used.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldBox label="Driver name *">
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </FieldBox>
        <FieldBox label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </FieldBox>
        <FieldBox label="CNIC">
          <Input value={form.cnic} onChange={(e) => set("cnic", e.target.value)} />
        </FieldBox>
        <FieldBox label="Licence no">
          <Input value={form.licence_no} onChange={(e) => set("licence_no", e.target.value)} />
        </FieldBox>
        <FieldBox label="Vehicle registration">
          <Input
            value={form.vehicle_registration}
            onChange={(e) => set("vehicle_registration", e.target.value)}
            placeholder="LEA-1234"
          />
        </FieldBox>
        <FieldBox label="Vehicle model">
          <Input
            value={form.vehicle_model}
            onChange={(e) => set("vehicle_model", e.target.value)}
            placeholder="Toyota Hiace"
          />
        </FieldBox>
        <FieldBox label="Status">
          <Select
            value={form.is_active ? "active" : "inactive"}
            onValueChange={(v) => set("is_active", v === "active")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </FieldBox>
        <FieldBox label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
        </FieldBox>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={saveMut.isPending}>
          Cancel
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? "Saving…" : existing ? "Update driver" : "Save driver"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function FieldBox({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}
