// Shared team & roles UI — custom role builder + member editor used by both the
// client dashboard (light) and the platform admin console (dark). All state
// changes flow through the parent via callbacks; persistence is the parent's job.
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  cn,
  Check,
  Pencil,
  ShieldCheck,
  Trash2,
  X,
} from "./deps";

export type RoleRow = { id: string; name: string; description: string; permissions: string[]; members: number };
export type PermissionDef = { id: string; group: string; label: string; desc: string };
export type MemberRow = { id: string; name: string; email: string; role: string; roleName: string | null; invitePending: boolean; initials: string; locationIds?: string[] };

/* ------------------------------- Role builder ----------------------------- */

export function RoleBuilder({ dark, initial, catalog, onSave, onCancel }: {
  dark: boolean;
  initial: RoleRow | null;
  catalog: PermissionDef[];
  onSave: (payload: { name: string; description: string; permissions: string[] }, isNew: boolean) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [perms, setPerms] = useState<string[]>(initial?.permissions || []);

  const groups = [...new Set(catalog.map((p) => p.group))];
  const toggle = (id: string) => setPerms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const inputCls = dark
    ? "h-9 w-full rounded-lg border border-white/10 bg-brand px-3 text-[12.5px] text-white placeholder:text-white/30 outline-none focus:border-white/30"
    : "h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[12.5px] text-neutral-800 placeholder:text-neutral-300 outline-none focus:border-brand";

  return (
    <div className={cn("space-y-3 rounded-2xl border p-4", dark ? "border-mint/25 bg-brand-deep/60" : "border-mint/40 bg-white")}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} className={dark ? "text-mint" : "text-mint-deep"} />
        <p className={cn("text-[13px] font-semibold", dark ? "text-white" : "text-brand")}>
          {initial ? `Edit role — ${initial.name}` : "New custom role"}
        </p>
      </div>
      <div className={cn("grid gap-3", dark ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
        <label className="block">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-white/35" : "text-neutral-400")}>Role name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Front Desk Agent" className={cn("mt-1", inputCls)} />
        </label>
        <label className="block">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-white/35" : "text-neutral-400")}>Description (optional)</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this teammate handles" className={cn("mt-1", inputCls)} />
        </label>
      </div>
      <div className="space-y-2.5">
        {groups.map((g) => (
          <div key={g}>
            <p className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-white/35" : "text-neutral-400")}>{g}</p>
            <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
              {catalog.filter((p) => p.group === g).map((p) => {
                const on = perms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    title={p.desc}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "flex items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
                      dark
                        ? on ? "bg-mint/15 ring-1 ring-mint/40" : "bg-white/5 hover:bg-white/10"
                        : on ? "bg-mint-soft ring-1 ring-mint/50" : "bg-surface hover:bg-neutral-100",
                    )}
                  >
                    <span className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      on ? (dark ? "border-mint bg-mint text-brand-deep" : "border-mint-deep bg-mint-deep text-white") : (dark ? "border-white/20" : "border-neutral-300"),
                    )}>
                      {on && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-[12px] font-semibold leading-tight", dark ? "text-white" : "text-brand")}>{p.label}</span>
                      <span className={cn("mt-0.5 block text-[10.5px] leading-snug", dark ? "text-white/40" : "text-neutral-400")}>{p.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          disabled={!name.trim()}
          className={cn("h-9 flex-1 rounded-xl text-[12.5px] font-semibold", dark ? "bg-mint text-brand-deep hover:bg-mint/90" : "bg-mint-deep text-white hover:bg-mint-deep/90")}
          onClick={() => onSave({ name: name.trim(), description: description.trim(), permissions: perms }, !initial)}
        >
          <Check size={13} className="mr-1.5" /> {initial ? "Save role" : "Create role"}
        </Button>
        <Button size="sm" variant="ghost" className={cn("h-9 rounded-xl text-[12.5px]", dark ? "text-white/60 hover:bg-white/5 hover:text-white" : "text-neutral-500")} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- Roles panel ------------------------------ */

export function RolesPanel({ dark, roles, catalog, onCreate, onUpdate, onDelete }: {
  dark: boolean;
  roles: RoleRow[];
  catalog: PermissionDef[];
  onCreate: (payload: { name: string; description: string; permissions: string[] }) => void;
  onUpdate: (id: string, payload: { name: string; description: string; permissions: string[] }) => void;
  onDelete: (role: RoleRow) => void;
}) {
  const [mode, setMode] = useState<"list" | "new">("list");
  const [editing, setEditing] = useState<RoleRow | null>(null);

  if (mode === "new" || editing) {
    return (
      <RoleBuilder
        dark={dark}
        initial={editing}
        catalog={catalog}
        onSave={(payload, isNew) => {
          if (isNew) onCreate(payload);
          else if (editing) onUpdate(editing.id, payload);
          setMode("list");
          setEditing(null);
        }}
        onCancel={() => { setMode("list"); setEditing(null); }}
      />
    );
  }

  return (
    <div className="space-y-2">
      {roles.length === 0 && (
        <p className={cn("rounded-xl px-2.5 py-3 text-[12px]", dark ? "bg-white/5 text-white/40" : "bg-surface text-neutral-400")}>
          No custom roles yet — presets (manager, observer) apply. Build one to grant exactly the permissions a teammate needs.
        </p>
      )}
      {roles.map((r) => (
        <div key={r.id} className={cn("flex items-start gap-3 rounded-xl px-3.5 py-3", dark ? "bg-brand-deep/50" : "bg-surface")}>
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", dark ? "bg-white/10 text-mint" : "bg-mint-soft text-mint-deep")}>
            <ShieldCheck size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-[13px] font-semibold", dark ? "text-white" : "text-brand")}>
              {r.name} <span className={cn("ml-1 text-[10.5px] font-bold", dark ? "text-white/35" : "text-neutral-400")}>{r.members} member{r.members === 1 ? "" : "s"}</span>
            </p>
            {r.description && <p className={cn("truncate text-[11px]", dark ? "text-white/40" : "text-neutral-400")}>{r.description}</p>}
            <p className={cn("mt-1 text-[10.5px] leading-relaxed", dark ? "text-white/35" : "text-neutral-400")}>
              {r.permissions.length === 0
                ? "No permissions yet"
                : r.permissions.map((p) => catalog.find((c) => c.id === p)?.label || p).join(" · ")}
            </p>
          </div>
          <button onClick={() => setEditing(r)} className={cn("rounded-lg p-1.5", dark ? "text-white/40 hover:bg-white/5 hover:text-white" : "text-neutral-400 hover:bg-white hover:text-brand")} aria-label={`Edit ${r.name}`}>
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(r)} className={cn("rounded-lg p-1.5", dark ? "text-white/30 hover:bg-white/5 hover:text-red-300" : "text-neutral-300 hover:bg-white hover:text-red-500")} aria-label={`Delete ${r.name}`}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <Button size="sm" variant="outline" className={cn("h-9 w-full rounded-xl text-[12.5px]", dark && "border-white/15 bg-transparent text-white/80 hover:bg-white/5 hover:text-white")} onClick={() => setMode("new")}>
        <ShieldCheck size={14} className="mr-1.5" /> New custom role
      </Button>
    </div>
  );
}

/* ------------------------------ Member editor ----------------------------- */

export function MemberEditor({ dark, member, presets, customRoles, locations, onSave, onCancel }: {
  dark: boolean;
  member: MemberRow;
  presets: [string, string][]; // [value, label]
  customRoles: RoleRow[];
  locations?: { id: string; name: string }[]; // when provided — per-branch assignment (doc §1F)
  onSave: (payload: { name: string; role?: string; roleId?: string | null; locationIds?: string[] }) => void;
  onCancel: () => void;
}) {
  const initialRoleId = member.role === "member" ? customRoles.find((r) => r.name === member.roleName)?.id || "" : "";
  const [name, setName] = useState(member.name);
  const [roleId, setRoleId] = useState<string>(initialRoleId);
  const [preset, setPreset] = useState<string>(member.role === "member" ? presets[presets.length - 1]?.[0] || "" : member.role);
  const [locIds, setLocIds] = useState<string[]>(member.locationIds || []);

  const inputCls = dark
    ? "h-9 w-full rounded-lg border border-white/10 bg-brand px-3 text-[12.5px] text-white placeholder:text-white/30 outline-none focus:border-white/30"
    : "h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[12.5px] text-neutral-800 outline-none focus:border-brand";

  return (
    <div className={cn("mt-2 space-y-2.5 rounded-2xl border p-3.5", dark ? "border-mint/25 bg-brand-deep/60" : "border-mint/40 bg-white")}>
      <label className="block">
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-white/35" : "text-neutral-400")}>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={cn("mt-1", inputCls)} />
      </label>
      <div>
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-white/35" : "text-neutral-400")}>Role & permissions</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {presets.map(([value, label]) => (
            <button key={value} type="button" disabled={!!roleId}
              onClick={() => setPreset(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                !roleId && preset === value
                  ? dark ? "bg-mint text-brand-deep" : "bg-brand text-white"
                  : dark ? "bg-white/5 text-white/60 hover:text-white" : "bg-surface text-neutral-500 hover:text-neutral-700",
                roleId && "opacity-40",
              )}>
              {label}
            </button>
          ))}
          {customRoles.map((r) => (
            <button key={r.id} type="button"
              onClick={() => setRoleId(roleId === r.id ? "" : r.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                roleId === r.id
                  ? dark ? "bg-mint text-brand-deep" : "bg-brand text-white"
                  : dark ? "bg-white/5 text-white/60 hover:text-white" : "bg-mint-soft text-mint-deep hover:bg-mint-soft/70",
              )}>
              {r.name}
            </button>
          ))}
        </div>
        <p className={cn("mt-1.5 text-[10.5px]", dark ? "text-white/30" : "text-neutral-400")}>
          {roleId
            ? `Custom role — ${customRoles.find((r) => r.id === roleId)?.permissions.length || 0} permissions, managed under Roles.`
            : presets.find(([v]) => v === preset)?.[1]}
        </p>
      </div>
      {locations && locations.length > 0 && (
        <div>
          <span className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-white/35" : "text-neutral-400")}>Assigned locations</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {locations.map((l) => {
              const active = locIds.includes(l.id);
              return (
                <button key={l.id} type="button"
                  onClick={() => setLocIds((ids) => (active ? ids.filter((x) => x !== l.id) : [...ids, l.id]))}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                    active
                      ? dark ? "bg-mint text-brand-deep" : "bg-brand text-white"
                      : dark ? "bg-white/5 text-white/60 hover:text-white" : "bg-surface text-neutral-500 hover:text-neutral-700",
                  )}>
                  {l.name}
                </button>
              );
            })}
          </div>
          <p className={cn("mt-1.5 text-[10.5px]", dark ? "text-white/30" : "text-neutral-400")}>
            {locIds.length ? `${locIds.length} of ${locations.length} branches — drill-downs and staff insights focus on these` : "All branches (owners and unassigned managers see everything)"}
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" className={cn("h-9 flex-1 rounded-xl text-[12.5px] font-semibold", dark ? "bg-mint text-brand-deep hover:bg-mint/90" : "bg-mint-deep text-white hover:bg-mint-deep/90")}
          onClick={() => onSave({ name: name.trim(), ...(roleId ? { roleId } : { role: preset }), ...(locations ? { locationIds: locIds } : {}) })}>
          <Check size={13} className="mr-1.5" /> Save member
        </Button>
        <Button size="sm" variant="ghost" className={cn("h-9 rounded-xl text-[12.5px]", dark ? "text-white/60 hover:bg-white/5 hover:text-white" : "text-neutral-500")} onClick={onCancel}>
          <X size={13} className="mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}
