import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router";
import { Search, MapPin, X, Loader, Plus, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { API_ROUTES, PATHS } from "../constants";
import type { MinistryListItem } from "../../types/database";

const BASE = `https://${projectId}.supabase.co/functions/v1`;
const REST = `https://${projectId}.supabase.co/rest/v1`;
const anonHeaders = { apikey: publicAnonKey, Authorization: `Bearer ${publicAnonKey}` };
const serverHeaders = { Authorization: `Bearer ${publicAnonKey}` };
const ADD_MINISTRY_KEY = "sb_publishable_AAHOHAHBpgtHBCsLslwZ8w_Y21Nuxmy";

const INITIAL_WAIT_S = 60;
const POLL_INTERVAL_S = 10;

type PollPhase = "idle" | "initial_wait" | "polling" | "found";
type ConfirmState = "pending" | "correct" | "incorrect";

type FoundMinistry = {
  ministry_id: string;
  status: string;
  generated_report: string | null;
};

function previewMarkdown(md: string): string {
  return md.split("\n").filter((l) => l.trim()).slice(0, 10).join("\n");
}

function PulsingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary"
          animate={{ opacity: [0.25, 1, 0.25], scale: [0.75, 1, 0.75] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function SearchPage() {
  // ─── Ministry list ────────────────────────────────────────────────────────
  const [ministries, setMinistries] = useState<MinistryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // ─── Modal form ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [ministryName, setMinistryName] = useState("");
  const [identifiableFact, setIdentifiableFact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ─── Polling ──────────────────────────────────────────────────────────────
  const [pollPhase, setPollPhase] = useState<PollPhase>("idle");
  const [countdown, setCountdown] = useState(INITIAL_WAIT_S);
  const [foundMinistry, setFoundMinistry] = useState<FoundMinistry | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Confirmation ─────────────────────────────────────────────────────────
  const [confirmState, setConfirmState] = useState<ConfirmState>("pending");
  const [retryFact, setRetryFact] = useState("");
  const [retrySubmitting, setRetrySubmitting] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  // ─── Leader info ──────────────────────────────────────────────────────────
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");

  // ─── Polling logic ────────────────────────────────────────────────────────
  const checkMinistry = async (name: string): Promise<FoundMinistry | null> => {
    try {
      const res = await fetch(
        `${REST}/ministry_reports?ministry_name=eq.${encodeURIComponent(name)}&select=ministry_id,status,generated_report&limit=1`,
        { headers: anonHeaders }
      );
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  };

  const startPolling = (name: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPollPhase("polling");
    pollRef.current = setInterval(async () => {
      const result = await checkMinistry(name);
      if (result && result.status !== "waiting_generation") {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setFoundMinistry(result);
        setPollPhase("found");
      }
    }, POLL_INTERVAL_S * 1000);
  };

  const startInitialWait = (name: string) => {
    setPollPhase("initial_wait");
    setCountdown(INITIAL_WAIT_S);
    if (countRef.current) clearInterval(countRef.current);
    let remaining = INITIAL_WAIT_S;
    countRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countRef.current!);
        countRef.current = null;
        startPolling(name);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const callAddMinistry = async (name: string, fact: string) => {
    const res = await fetch(`${BASE}/add_ministry`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ADD_MINISTRY_KEY}`,
        apikey: ADD_MINISTRY_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ministryName: name, identifiableFact: fact }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
    return data;
  };

  const handleAddMinistry = async () => {
    if (!ministryName.trim() || !identifiableFact.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await callAddMinistry(ministryName.trim(), identifiableFact.trim());
      setSubmitted(true);
      startInitialWait(ministryName.trim());
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!retryFact.trim()) return;
    setRetrySubmitting(true);
    setRetryError(null);
    try {
      await callAddMinistry(ministryName.trim(), retryFact.trim());
      setIdentifiableFact(retryFact.trim());
      setRetryFact("");
      setConfirmState("pending");
      setFoundMinistry(null);
      startInitialWait(ministryName.trim());
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : String(e));
    } finally {
      setRetrySubmitting(false);
    }
  };

  const closeModal = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countRef.current) clearInterval(countRef.current);
    setModalOpen(false);
    setMinistryName("");
    setIdentifiableFact("");
    setSubmitting(false);
    setSubmitError(null);
    setSubmitted(false);
    setPollPhase("idle");
    setCountdown(INITIAL_WAIT_S);
    setFoundMinistry(null);
    setConfirmState("pending");
    setRetryFact("");
    setRetryError(null);
    setLeaderName("");
    setLeaderEmail("");
  };

  // ─── Ministry list fetch ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${BASE}${API_ROUTES.MINISTRIES}`, { headers: serverHeaders })
      .then(async (r) => {
        const text = await r.text();
        try {
          const data = JSON.parse(text);
          if (data.error) setFetchError(`Server error: ${data.error}`);
          else setMinistries(data.ministries ?? []);
        } catch {
          setFetchError(`Unexpected response (${r.status}): ${text.slice(0, 200)}`);
        }
      })
      .catch((e) => setFetchError(`Network error: ${String(e)}`))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query) return ministries;
    const q = query.toLowerCase();
    return ministries.filter(
      (m) =>
        m.ministry_name.toLowerCase().includes(q) ||
        (m.hq_location ?? "").toLowerCase().includes(q) ||
        (m.mission ?? "").toLowerCase().includes(q)
    );
  }, [query, ministries]);

  const reportFound = pollPhase === "found" && foundMinistry?.status === "not_verified";
  const isCorrect = confirmState === "correct";
  const isIncorrect = confirmState === "incorrect";

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-foreground mb-2" style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "2.25rem" }}>
            Browse Ministries
          </h1>
          <p className="text-muted-foreground">
            {loading ? "Loading…" : `${ministries.length} organization${ministries.length === 1 ? "" : "s"} in the network`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium shrink-0 transition-opacity hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Add Ministry
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, location, or mission…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading ministries…</span>
        </div>
      )}
      {fetchError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-5 mb-6">
          <p className="text-destructive text-sm">Failed to load ministries: {fetchError}</p>
        </div>
      )}
      {!loading && !fetchError && (
        <>
          <p className="text-sm text-muted-foreground mb-6">
            {filtered.length === 0 ? "No ministries found" : `Showing ${filtered.length} ministr${filtered.length === 1 ? "y" : "ies"}`}
          </p>
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">No results found</p>
              <p className="text-sm">Try adjusting your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((m) => (
                <Link
                  key={m.ministry_id}
                  to={PATHS.MINISTRY(m.ministry_id)}
                  className="bg-card rounded-xl overflow-hidden border border-border group hover:shadow-md transition-all duration-200"
                >
                  <div className="relative h-44 overflow-hidden bg-secondary flex items-center justify-center">
                    {m.logo_url ? (
                      <img src={m.logo_url} alt={m.ministry_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary" style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "1.5rem" }}>
                        {m.ministry_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1rem" }}>
                      {m.ministry_name}
                    </h3>
                    {m.mission && <p className="text-muted-foreground text-xs mb-4 line-clamp-2 leading-relaxed">{m.mission}</p>}
                    {m.hq_location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{m.hq_location}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Add Ministry Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-background border border-border rounded-2xl shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: "90vh" }}>
            {/* Header */}
            <div className="px-8 pt-8 pb-4 shrink-0">
              <button onClick={closeModal} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.25rem" }}>
                Recommend a Ministry
              </h2>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-8 pb-8 space-y-6">

              {/* ── 1. Form ─────────────────────────────────────────────── */}
              <div className={`space-y-5 transition-opacity duration-300 ${submitted ? "opacity-50 pointer-events-none" : ""}`}>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Ministry Name
                  </label>
                  <input
                    type="text"
                    value={ministryName}
                    onChange={(e) => setMinistryName(e.target.value)}
                    placeholder="e.g. Living Waters Ministry"
                    className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Identifiable Fact
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Should be able to follow "the one" — e.g. "that operates in rural Kenya"
                  </p>
                  <input
                    type="text"
                    value={identifiableFact}
                    onChange={(e) => setIdentifiableFact(e.target.value)}
                    placeholder="e.g. based in Austin, TX that serves homeless youth"
                    className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-3"
                  />
                  <div className="bg-primary/8 border border-primary/20 rounded-lg px-4 py-3">
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      "Produce a profile of{" "}
                      <span className="text-foreground font-semibold not-italic">{ministryName || "[ministry name]"}</span>
                      {" "}(the one{" "}
                      <span className="text-primary font-semibold not-italic">{identifiableFact || "[identifiable fact]"}</span>
                      )…"
                    </p>
                  </div>
                </div>

                {submitError && <p className="text-destructive text-xs">{submitError}</p>}

                <button
                  onClick={handleAddMinistry}
                  disabled={submitting || !ministryName.trim() || !identifiableFact.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-90"
                >
                  {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Submitting…" : "Submit Ministry"}
                </button>
              </div>

              {/* ── 2. Generating animation ───────────────────────────── */}
              <div className={`transition-opacity duration-500 ${submitted ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                <div className="h-px bg-border mb-6" />
                <div className="bg-secondary/40 border border-border rounded-xl p-5">
                  {pollPhase === "found" ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground" style={{ fontFamily: "'Lora', serif" }}>Report generated</p>
                        <p className="text-xs text-muted-foreground">Ready for review below</p>
                      </div>
                    </div>
                  ) : pollPhase === "polling" ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <PulsingDots />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground" style={{ fontFamily: "'Lora', serif" }}>Generating report…</p>
                        <p className="text-xs text-muted-foreground">Checking every {POLL_INTERVAL_S}s</p>
                      </div>
                    </div>
                  ) : pollPhase === "initial_wait" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PulsingDots />
                          <p className="text-sm font-medium text-foreground" style={{ fontFamily: "'Lora', serif" }}>Generating report…</p>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{countdown}s</span>
                      </div>
                      <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: INITIAL_WAIT_S, ease: "linear" }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">This typically takes 1–3 minutes. We'll check shortly.</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 opacity-50">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Waiting for submission…</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── 3. Report preview ─────────────────────────────────── */}
              <div className={`transition-opacity duration-500 ${reportFound ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                <div className="h-px bg-border mb-6" />
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Report Preview
                </p>
                {reportFound && foundMinistry?.generated_report ? (
                  <div className="bg-card border border-border rounded-xl p-4 text-xs leading-relaxed overflow-hidden" style={{ maxHeight: "200px" }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <p className="font-bold text-foreground mb-1" style={{ fontFamily: "'Lora', serif" }}>{children}</p>,
                        h2: ({ children }) => <p className="font-semibold text-foreground mb-1" style={{ fontFamily: "'Lora', serif" }}>{children}</p>,
                        h3: ({ children }) => <p className="font-semibold text-foreground" style={{ fontFamily: "'Lora', serif" }}>{children}</p>,
                        p: ({ children }) => <p className="text-muted-foreground mb-1.5">{children}</p>,
                        ul: ({ children }) => <ul className="pl-4 text-muted-foreground mb-1.5">{children}</ul>,
                        li: ({ children }) => <li className="mb-0.5">{children}</li>,
                        strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                        a: ({ children }) => <span className="text-primary">{children}</span>,
                      }}
                    >
                      {previewMarkdown(foundMinistry.generated_report)}
                    </ReactMarkdown>
                    <div className="pt-2 border-t border-border mt-2">
                      <p className="text-muted-foreground/60 text-xs italic">Preview — showing first 10 lines</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-xl p-4 h-24 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Preview will appear here</p>
                  </div>
                )}
              </div>

              {/* ── 4. Correct / Incorrect ────────────────────────────── */}
              <div className={`transition-opacity duration-500 ${reportFound && confirmState === "pending" ? "opacity-100" : reportFound ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                <div className="h-px bg-border mb-6" />
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Is this the right ministry?
                </p>

                {confirmState === "pending" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmState("correct")}
                      disabled={!reportFound}
                      className="flex-1 flex items-center justify-center gap-2 border border-primary text-primary py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors disabled:opacity-40"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Correct Ministry
                    </button>
                    <button
                      onClick={() => setConfirmState("incorrect")}
                      disabled={!reportFound}
                      className="flex-1 flex items-center justify-center gap-2 border border-border text-muted-foreground py-2.5 rounded-lg text-sm font-medium hover:text-foreground hover:border-foreground transition-colors disabled:opacity-40"
                    >
                      <XCircle className="w-4 h-4" />
                      Incorrect
                    </button>
                  </div>
                )}

                {isIncorrect && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Enter a more specific identifiable fact to retry:</p>
                    <input
                      type="text"
                      value={retryFact}
                      onChange={(e) => setRetryFact(e.target.value)}
                      placeholder="e.g. founded in 1987 in Nashville, TN"
                      className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {retryError && <p className="text-destructive text-xs">{retryError}</p>}
                    <div className="flex gap-3">
                      <button
                        onClick={handleRetry}
                        disabled={retrySubmitting || !retryFact.trim()}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                      >
                        {retrySubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {retrySubmitting ? "Retrying…" : "Retry"}
                      </button>
                      <button
                        onClick={() => setConfirmState("pending")}
                        className="px-4 border border-border text-muted-foreground rounded-lg text-sm hover:text-foreground transition-colors"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {isCorrect && (
                  <div className="flex items-center gap-2 text-primary text-sm">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Great! Please add the ministry leader's details below.</span>
                  </div>
                )}
              </div>

              {/* ── 5. Ministry leader info ───────────────────────────── */}
              <div className={`transition-opacity duration-500 ${isCorrect ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                <div className="h-px bg-border mb-6" />
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Ministry Leader
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={leaderName}
                      onChange={(e) => setLeaderName(e.target.value)}
                      placeholder="e.g. Pastor John Smith"
                      className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={leaderEmail}
                      onChange={(e) => setLeaderEmail(e.target.value)}
                      placeholder="e.g. pastor@ministry.org"
                      className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <button
                    disabled={!leaderName.trim() || !leaderEmail.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete Submission
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
