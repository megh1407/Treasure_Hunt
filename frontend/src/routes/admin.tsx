import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, X, FileDown } from "lucide-react";
import { api } from "@/services/gameApi";
import { formatTime } from "@/game/config";
import { DevelopedBy } from "@/components/DevelopedBy";
import type { AdminStats, AdminLeaderboardEntry } from "@/services/types";

const title = "Admin Control Room — Core Quest Finder";
const description = "Organizer administration console for Core Quest Finder.";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = sessionStorage.getItem("admin_token");
    if (saved) {
      setToken(saved);
    }
  }, []);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<AdminLeaderboardEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [playerToDelete, setPlayerToDelete] = useState<AdminLeaderboardEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const filteredLeaderboard = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return leaderboard;
    return leaderboard.filter((p) => {
      const nameMatch = p.playerName?.toLowerCase().includes(q);
      const enrollMatch = p.enrollmentNumber?.toLowerCase().includes(q);
      const emailMatch = p.email?.toLowerCase().includes(q);
      const contactMatch = p.contactNumber?.toLowerCase().includes(q);
      const branchMatch = p.branch?.toLowerCase().includes(q);
      return Boolean(nameMatch || enrollMatch || emailMatch || contactMatch || branchMatch);
    });
  }, [leaderboard, searchQuery]);

  const loadAdminData = useCallback(async (authToken: string) => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      const [statsData, lbData] = await Promise.all([
        api.getAdminStats(authToken),
        api.getAdminLeaderboard(authToken),
      ]);
      setStats(statsData);
      setLeaderboard(lbData);
    } catch (err: any) {
      if (err?.message?.includes("Unauthorized") || err?.message?.includes("Admin authentication")) {
        sessionStorage.removeItem("admin_token");
        setToken(null);
        setLoginError("Session expired. Please log in again.");
      } else {
        setDataError(err?.message || "Failed to fetch admin data.");
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadAdminData(token);
    }
  }, [token, loadAdminData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await api.adminLogin(password);
      if (res.token) {
        sessionStorage.setItem("admin_token", res.token);
        setToken(res.token);
        setPassword("");
      } else {
        setLoginError("Invalid password.");
      }
    } catch (err: any) {
      setLoginError(err?.message || "Authentication failed. Invalid password.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await api.adminLogout(token);
      } catch {
        // ignore logout network errors
      }
    }
    sessionStorage.removeItem("admin_token");
    setToken(null);
    setStats(null);
    setLeaderboard([]);
  };

  const handleDeletePlayer = async () => {
    if (!token || !playerToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deletePlayer(token, playerToDelete.playerId);
      setPlayerToDelete(null);
      await loadAdminData(token);
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete player.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!token || isExporting) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await api.downloadAdminExcel(token);
    } catch {
      setExportError("Unable to download contestant data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- Render Login Gate if unauthenticated or before client hydration ---
  if (!token || !isMounted) {
    return (
      <main className="holo-grid min-h-dvh flex items-center justify-center bg-background px-4 py-12">
        <div className="holo-panel w-full max-w-md rounded-2xl p-8 border border-primary/30 shadow-2xl">
          <div className="text-center">
            <p className="font-display text-[11px] tracking-[0.4em] text-primary">UPDATES 2K26 · ORGANIZERS ONLY</p>
            <h1 className="mt-2 font-display text-2xl tracking-wider text-foreground text-glow">
              ADMIN CONTROL ROOM
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Please enter the master organizer password to access live telemetry and contestant management.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-pw" className="block text-[11px] font-medium tracking-wider uppercase text-muted-foreground">
                Master Password
              </label>
              <input
                id="admin-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                required
                className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/80 px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {loginError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-lg bg-primary px-4 py-2.5 font-display text-xs font-semibold tracking-wider text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoggingIn ? "AUTHENTICATING..." : "AUTHENTICATE"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ← Return to Main Portal
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // --- Render Admin Dashboard ---
  return (
    <main className="holo-grid min-h-dvh bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="font-display text-[10px] tracking-[0.4em] text-primary">UPDATES 2K26</p>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl text-foreground font-display tracking-wider text-glow">
              ORGANIZER CONTROL ROOM
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadAdminData(token)}
              disabled={isLoadingData}
              className="rounded-lg border border-border/80 bg-background/60 px-3 py-1.5 text-xs text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              {isLoadingData ? "Refreshing..." : "↻ Refresh"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              Lock & Sign Out
            </button>
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors ml-2">
              Home
            </Link>
          </div>
        </div>

        {dataError && (
          <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive">
            {dataError}
          </div>
        )}

        {exportError && (
          <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive flex items-center justify-between">
            <span>{exportError}</span>
            <button onClick={() => setExportError(null)} className="text-destructive font-bold text-xs">
              ✕
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Total Contestants"
            value={stats ? String(stats.totalPlayers) : "—"}
            sub="Registered players in database"
          />
          <Kpi
            label="Active In-Game"
            value={stats ? String(stats.currentlyPlaying) : "—"}
            sub="Current live sessions"
          />
          <Kpi
            label="Finished All Levels"
            value={stats ? String(stats.completedAllLevels) : "—"}
            sub="Level 10 completed"
          />
          <Kpi
            label="Total Time"
            value={
              stats?.totalTimeSeconds !== undefined && stats.totalTimeSeconds > 0
                ? formatTime(stats.totalTimeSeconds)
                : leaderboard.length > 0
                ? formatTime(leaderboard.reduce((a, p) => a + (p.finalTimeSeconds || 0), 0))
                : "—"
            }
            sub="Cumulative mission time"
          />
        </div>

        {/* Master Contestant Management Table */}
        <section className="holo-panel mt-8 rounded-2xl p-6 border border-border/80">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-sm tracking-widest text-primary">
                CONTESTANT TELEMETRY & LEADERBOARD
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sorted strictly by progress (Level 10 down to 1) and fastest completion time.
              </p>
            </div>
            <span className="font-display text-xs text-muted-foreground">
              Total Records: {leaderboard.length}
            </span>
          </div>

          {/* Search & Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                id="admin-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search player by name or enrollment..."
                className="w-full rounded-lg border border-border/80 bg-background/60 pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="admin-clear-search-btn"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {searchQuery.trim() && (
                <span className="font-mono text-xs text-primary/80">
                  Found {filteredLeaderboard.length} of {leaderboard.length} operatives
                </span>
              )}

              <button
                type="button"
                id="admin-download-excel-btn"
                onClick={handleDownloadExcel}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-display tracking-wider text-primary hover:bg-primary/20 hover:border-primary transition-all disabled:opacity-50"
                title="Download authoritative contestant report as Excel spreadsheet"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>{isExporting ? "Preparing Excel…" : "Download Excel"}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[55rem] text-left text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/60 bg-background/40">
                <tr>
                  <th className="px-3 py-3 font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">Contestant</th>
                  <th className="px-3 py-3 font-semibold">Enrollment</th>
                  <th className="px-3 py-3 font-semibold">Contact / Email</th>
                  <th className="px-3 py-3 font-semibold">Branch</th>
                  <th className="px-3 py-3 font-semibold">Progress</th>
                  <th className="px-3 py-3 font-semibold">Game Time</th>
                  <th className="px-3 py-3 font-semibold">Penalty Time</th>
                  <th className="px-3 py-3 font-semibold">Total Time</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border/40">
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                      {isLoadingData
                        ? "Loading contestant data..."
                        : searchQuery.trim()
                        ? `No matching players found for "${searchQuery.trim()}".`
                        : "No players registered yet."}
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((player, index) => {
                    const isCompleted = player.status === "completed" || player.currentLevel >= 10;
                    return (
                      <tr
                        key={player.playerId}
                        className="hover:bg-primary/5 transition-colors"
                      >
                        <td className="px-3 py-3 font-display text-primary/80 font-mono">
                          {index + 1}
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-medium text-foreground">{player.playerName}</span>
                        </td>
                        <td className="px-3 py-3 font-mono text-muted-foreground">
                          {player.enrollmentNumber}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          <div>{player.contactNumber || "—"}</div>
                          <div className="text-[10px] opacity-70">{player.email}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                            {player.branch || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-border/50 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCompleted ? "bg-emerald-400" : "bg-primary"}`}
                                style={{ width: `${Math.min(100, (player.currentLevel / 10) * 100)}%` }}
                              />
                            </div>
                            <span className="font-display text-[11px] font-medium">
                              Lvl {player.currentLevel}/10
                            </span>
                            {isCompleted && (
                              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                Done
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-muted-foreground">
                          {formatTime(player.gameTimeSeconds ?? 0)}
                        </td>
                        <td className="px-3 py-3 font-mono text-destructive">
                          {player.penaltySeconds > 0 ? `+${player.penaltySeconds}s` : "0s"}
                        </td>
                        <td className="px-3 py-3 font-display font-mono text-foreground font-semibold">
                          {formatTime(player.finalTimeSeconds ?? 0)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => {
                              setDeleteError(null);
                              setPlayerToDelete(player);
                            }}
                            className="rounded px-2 py-1 text-[11px] text-destructive/80 hover:bg-destructive/20 hover:text-destructive transition-colors font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Organizer Control Room Footer / Developer Credits */}
        <div className="mt-8 mb-4">
          <DevelopedBy variant="compact" />
        </div>
      </div>

      {/* Confirmation Modal for Player Deletion */}
      {playerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="holo-panel w-full max-w-md rounded-2xl p-6 border border-destructive/50 bg-background shadow-2xl">
            <h3 className="font-display text-lg text-destructive tracking-wider">
              CONFIRM PLAYER DELETION
            </h3>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete player{" "}
              <strong className="text-foreground">{playerToDelete.playerName}</strong> (Enrollment:{" "}
              <span className="font-mono text-primary">{playerToDelete.enrollmentNumber}</span>)?
            </p>
            <p className="mt-2 text-xs text-destructive/90 bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
              WARNING: This will erase their player account, game session, inventory, and all level progress from the database. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPlayerToDelete(null)}
                disabled={isDeleting}
                className="rounded-lg border border-border/80 px-4 py-2 text-xs text-foreground hover:bg-background/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePlayer}
                disabled={isDeleting}
                className="rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="holo-panel rounded-xl p-4 border border-border/60">
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl text-primary font-bold">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground/80">{sub}</p>
    </div>
  );
}
