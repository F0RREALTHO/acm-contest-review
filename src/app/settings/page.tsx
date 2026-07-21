"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, RefreshCw, GripVertical, Check, X } from "lucide-react";

interface Contest {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  enabled: boolean;
  showInNav: boolean;
  displayOrder: number;
  lastSync: string | null;
  _count?: { problems: number; leaderboardEntries: number };
}

export default function ContestManagementPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContest, setNewContest] = useState({ name: "", slug: "", icon: "", displayOrder: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Contest>>({});

  const { data: contests, isLoading } = useQuery<Contest[]>({
    queryKey: ["contests-admin"],
    queryFn: async () => {
      const res = await fetch("/api/contests");
      if (!res.ok) throw new Error("Failed to fetch contests");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newContest) => {
      const res = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create contest");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contests-admin"] });
      queryClient.invalidateQueries({ queryKey: ["contests-nav"] });
      setNewContest({ name: "", slug: "", icon: "", displayOrder: 0 });
      setShowAddForm(false);
      toast.success("Contest created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Contest>) => {
      const res = await fetch("/api/contests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update contest");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contests-admin"] });
      queryClient.invalidateQueries({ queryKey: ["contests-nav"] });
      setEditingId(null);
      toast.success("Contest updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contests?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contest");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contests-admin"] });
      queryClient.invalidateQueries({ queryKey: ["contests-nav"] });
      toast.success("Contest deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch("/api/internal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestSlug: slug }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Sync failed");
      }
      return res.json();
    },
    onSuccess: () => toast.success("Sync started in background"),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleEnabled = (contest: Contest) => {
    updateMutation.mutate({ id: contest.id, enabled: !contest.enabled });
  };

  const toggleShowInNav = (contest: Contest) => {
    updateMutation.mutate({ id: contest.id, showInNav: !contest.showInNav });
  };

  const startEdit = (contest: Contest) => {
    setEditingId(contest.id);
    setEditValues({ id: contest.id, name: contest.name, slug: contest.slug, icon: contest.icon || "", displayOrder: contest.displayOrder });
  };

  const saveEdit = () => {
    if (editValues.id) updateMutation.mutate(editValues);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Contest Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage contests. Adding a contest here automatically creates the navigation tab, enables sync, and loads the leaderboard.
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Contest
        </Button>
      </div>

      {/* Cookie status */}
      <div className="border border-border rounded-md bg-card p-4 mb-6 flex items-center gap-3">
        <div className={`h-2.5 w-2.5 rounded-full ${process.env.NEXT_PUBLIC_HAS_COOKIE === "true" ? "bg-emerald-500" : "bg-amber-500"}`} />
        <div className="text-sm">
          <span className="text-muted-foreground">HackerRank Cookie:</span>{" "}
          <span className="text-foreground font-medium font-mono">HR_SESSION_COOKIE</span>{" "}
          <span className="text-muted-foreground">— Set via server environment variable only.</span>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="border border-border rounded-md bg-card p-4 mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">New Contest</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contest Name</label>
              <Input
                value={newContest.name}
                onChange={(e) => setNewContest({ ...newContest, name: e.target.value })}
                placeholder="Summer Challenge 2027"
                className="bg-muted border-border text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Slug (HackerRank contest ID)</label>
              <Input
                value={newContest.slug}
                onChange={(e) => setNewContest({ ...newContest, slug: e.target.value })}
                placeholder="acm-summer-challenge-2027"
                className="bg-muted border-border text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Icon (Emoji)</label>
              <Input
                value={newContest.icon}
                onChange={(e) => setNewContest({ ...newContest, icon: e.target.value })}
                placeholder="🏆"
                className="bg-muted border-border text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Order</label>
              <Input
                type="number"
                value={newContest.displayOrder}
                onChange={(e) => setNewContest({ ...newContest, displayOrder: parseInt(e.target.value) || 0 })}
                className="bg-muted border-border text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => createMutation.mutate(newContest)}
              disabled={!newContest.name || !newContest.slug || createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {createMutation.isPending ? "Creating..." : "Create Contest"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)} className="border-border text-muted-foreground">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Contest list */}
      {isLoading ? (
        <div className="text-muted-foreground">Loading contests...</div>
      ) : !contests?.length ? (
        <div className="text-muted-foreground text-center py-12">
          No contests configured. Click "Add Contest" to get started.
        </div>
      ) : (
        <div className="border border-border rounded-md bg-card overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-muted border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium w-12 text-center">#</th>
                <th className="px-4 py-3 font-medium w-12 text-center">Icon</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium text-center">Active</th>
                <th className="px-4 py-3 font-medium text-center">Nav Bar</th>
                <th className="px-4 py-3 font-medium text-center">Problems</th>
                <th className="px-4 py-3 font-medium text-center">Participants</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contests.map((contest, idx) => (
                <tr
                  key={contest.id}
                  className={`h-12 border-b border-border/50 last:border-0 hover:bg-slate-800/30 transition-colors ${
                    idx % 2 === 0 ? "bg-transparent" : "bg-black/10"
                  }`}
                >
                  {editingId === contest.id ? (
                    <>
                      <td className="px-4 py-2 text-center">
                        <Input
                          type="number"
                          value={editValues.displayOrder ?? 0}
                          onChange={(e) => setEditValues({ ...editValues, displayOrder: parseInt(e.target.value) || 0 })}
                          className="w-14 h-7 text-xs bg-muted border-border font-mono text-center"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Input
                          value={editValues.icon ?? ""}
                          onChange={(e) => setEditValues({ ...editValues, icon: e.target.value })}
                          className="w-12 h-7 text-xs bg-muted border-border text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={editValues.name ?? ""}
                          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                          className="h-7 text-xs bg-muted border-border"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={editValues.slug ?? ""}
                          onChange={(e) => setEditValues({ ...editValues, slug: e.target.value })}
                          className="h-7 text-xs bg-muted border-border font-mono"
                        />
                      </td>
                      <td className="px-4 py-2 text-center" colSpan={3} />
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={saveEdit} className="text-emerald-500 hover:text-emerald-400 transition-colors">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-mono text-xs text-center text-muted-foreground">{contest.displayOrder}</td>
                      <td className="px-4 py-2 text-center text-lg">{contest.icon || "—"}</td>
                      <td className="px-4 py-2 text-foreground font-medium">{contest.name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{contest.slug}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => toggleEnabled(contest)}
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                            contest.enabled
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700"
                          }`}
                        >
                          {contest.enabled ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => toggleShowInNav(contest)}
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                            contest.showInNav
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                              : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700"
                          }`}
                          title={contest.showInNav ? "Visible in top navigation bar" : "Hidden from top navigation bar"}
                        >
                          {contest.showInNav ? "Visible" : "Hidden"}
                        </button>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-center">{contest._count?.problems ?? "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs text-center">{contest._count?.leaderboardEntries ?? "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => syncMutation.mutate(contest.slug)}
                            disabled={syncMutation.isPending}
                            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors uppercase tracking-wider"
                            title="Sync Now"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                          </button>
                          <button
                            onClick={() => startEdit(contest)}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors uppercase tracking-wider"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${contest.name}"? This cannot be undone.`)) {
                                deleteMutation.mutate(contest.id);
                              }
                            }}
                            className="text-xs text-muted-foreground hover:text-destructive font-medium transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 text-xs text-muted-foreground space-y-1">
        <p>• Adding a contest automatically creates a navigation tab, enables leaderboard sync, and participant browsing.</p>
        <p>• The <code className="font-mono text-foreground/70">slug</code> must match the HackerRank contest URL (e.g. <code className="font-mono text-foreground/70">acm-summer-challenge-2027</code>).</p>
        <p>• Use <strong>Nav Bar</strong> toggle to show/hide a contest from the top navigation without deactivating it.</p>
        <p>• Inactive contests are always hidden from the navigation and data is preserved.</p>
      </div>
    </div>
  );
}
