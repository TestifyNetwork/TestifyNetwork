import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { API_ROUTES, CONNECTION_OPTIONS, TESTIFY_OPTIONS, PATHS } from "../constants";
import type { MinistryDetail } from "../../types/database";
import {
  MapPin, ArrowLeft, Send, FlaskConical,
  Mic2, BookOpen, MessagesSquare, ScrollText, NotebookPen, Loader,
} from "lucide-react";

function injectCitationLinks(markdown: string, citations: string[]): string {
  return markdown.replace(/\[(\d+)\](?!\()/g, (match, num) => {
    const url = citations[parseInt(num, 10)];
    if (!url || url === "EMPTY" || !url.startsWith("http")) return match;
    return `[\\[${num}\\]](${url})`;
  });
}

function buildSourcesList(citations: string[]): { num: number; url: string }[] {
  return citations
    .map((url, idx) => ({ num: idx, url }))
    .filter(({ num, url }) => num > 0 && url && url !== "EMPTY" && url.startsWith("http"));
}

type Section = "research" | "interview" | "testimonies" | "dialogue" | "documents" | "notes";

const sections: { key: Section; label: string; icon: React.ElementType; blurb: string }[] = [
  { key: "research",     label: "Research Report",                icon: FlaskConical,   blurb: "AI Agent Facts and Analytics" },
  { key: "interview",   label: "Ministry Leader Interview",       icon: Mic2,           blurb: "Conversations with leadership" },
  { key: "testimonies", label: "Testimonies",                     icon: BookOpen,       blurb: "Stories from the community" },
  { key: "dialogue",    label: "Dialogue Channel",                icon: MessagesSquare, blurb: "Open discussion and questions" },
  { key: "documents",   label: "Annual Report, 990, Newsletters", icon: ScrollText,     blurb: "Official filings and publications" },
  { key: "notes",       label: "My Private Notes",                icon: NotebookPen,    blurb: "Personal notes visible only to you" },
];

const BASE = `https://${projectId}.supabase.co/functions/v1`;
const authHeaders = { Authorization: `Bearer ${publicAnonKey}` };

type ChatMessage = { id: string; author: string; text: string; timestamp: string; avatar: string };

export function MinistryPage() {
  const { id } = useParams<{ id: string }>();

  const [ministry, setMinistry] = useState<MinistryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<Section>("research");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [privateNotes, setPrivateNotes] = useState("");
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const [testifyStatus, setTestifyStatus] = useState<Record<string, boolean>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const citations = ministry?.generated_citations ?? [];
  const processedReport = ministry?.generated_report
    ? injectCitationLinks(ministry.generated_report, citations)
    : null;
  const sources = buildSourcesList(citations);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setFetchError(null);
    fetch(`${BASE}${API_ROUTES.MINISTRY(id)}`, { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setFetchError(data.error);
        else if (!data.ministry) setFetchError("Ministry not found.");
        else setMinistry(data.ministry);
      })
      .catch((e) => setFetchError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [
      ...prev,
      { id: String(Date.now()), author: "You", text, timestamp: "Just now", avatar: "Y" },
    ]);
    setChatInput("");
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const toggleCheck = (
    map: Record<string, boolean>,
    setMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    key: string
  ) => setMap((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-muted-foreground">
        <Loader className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading ministry…</span>
      </div>
    );
  }

  if (fetchError || !ministry) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="text-foreground mb-4" style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.75rem" }}>
          Ministry not found
        </h1>
        <p className="text-muted-foreground mb-8">{fetchError ?? "We couldn't find a ministry with that ID."}</p>
        <Link to={PATHS.SEARCH} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm">
          Browse all ministries
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <Link
          to={PATHS.SEARCH}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Ministry Search
        </Link>
      </div>

      {/* Hero */}
      <div className="relative h-56 md:h-72 overflow-hidden mt-4 bg-secondary">
        {ministry.logo_url ? (
          <img src={ministry.logo_url} alt={ministry.ministry_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10">
            <span style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "4rem", color: "var(--primary)", opacity: 0.25 }}>
              {ministry.ministry_name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-6xl mx-auto px-6 pb-8">
          <h1
            className="text-white leading-tight"
            style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "clamp(1.5rem, 4vw, 2.5rem)", lineHeight: 1.15 }}
          >
            {ministry.ministry_name}
          </h1>
          {ministry.hq_location && (
            <div className="flex items-center gap-1.5 text-white/75 mt-1 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              {ministry.hq_location}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Left sidebar */}
          <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24 space-y-5">

            {/* Mission */}
            {ministry.mission && (
              <div className="border-l-4 border-accent pl-4 py-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>Mission</p>
                <p className="text-foreground text-sm leading-relaxed italic" style={{ fontFamily: "'Lora', serif" }}>
                  "{ministry.mission}"
                </p>
              </div>
            )}

            <div className="h-px bg-border" />

            {/* My Connection */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>My Connection</p>
              <div className="space-y-2">
                {CONNECTION_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={!!connections[opt]}
                      onChange={() => toggleCheck(connections, setConnections, opt)}
                      className="w-4 h-4 rounded accent-primary shrink-0"
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Testify Status */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>Testify Status</p>
              <div className="space-y-2">
                {TESTIFY_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={!!testifyStatus[opt]}
                      onChange={() => toggleCheck(testifyStatus, setTestifyStatus, opt)}
                      className="w-4 h-4 rounded accent-primary shrink-0"
                    />
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Section nav */}
            <nav className="space-y-1">
              {sections.map(({ key, label, icon: Icon, blurb }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full text-left rounded-xl px-4 py-3 transition-colors ${
                    activeSection === key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-0.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${activeSection === key ? "text-primary-foreground" : "text-primary"}`}
                      strokeWidth={1.5}
                    />
                    <span className="text-sm" style={{ fontFamily: "'Lora', serif", fontWeight: 600 }}>
                      {label}
                    </span>
                  </div>
                  <p className={`text-xs leading-snug pl-6 ${activeSection === key ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {blurb}
                  </p>
                </button>
              ))}
            </nav>
          </aside>

          {/* Right content */}
          <div className="flex-1 min-w-0">

            {/* Research Report */}
            {activeSection === "research" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.375rem" }}>Research Report</h2>
                  <p className="text-muted-foreground text-sm">AI-generated facts and analytics for {ministry.ministry_name}.</p>
                </div>

                {processedReport ? (
                  <>
                    <div className="bg-card border border-border rounded-xl p-6">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "1.4rem", marginBottom: "0.5rem", color: "var(--foreground)" }}>{children}</h1>,
                          h2: ({ children }) => <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.15rem", marginTop: "1.5rem", marginBottom: "0.4rem", color: "var(--foreground)" }}>{children}</h2>,
                          h3: ({ children }) => <h3 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1rem", marginTop: "1rem", marginBottom: "0.25rem", color: "var(--foreground)" }}>{children}</h3>,
                          p: ({ children }) => <p style={{ color: "var(--muted-foreground)", lineHeight: "1.75", marginBottom: "0.75rem" }}>{children}</p>,
                          ul: ({ children }) => <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.75rem", color: "var(--muted-foreground)" }}>{children}</ul>,
                          ol: ({ children }) => <ol style={{ paddingLeft: "1.25rem", marginBottom: "0.75rem", color: "var(--muted-foreground)" }}>{children}</ol>,
                          li: ({ children }) => <li style={{ marginBottom: "0.25rem" }}>{children}</li>,
                          strong: ({ children }) => <strong style={{ color: "var(--foreground)", fontWeight: 600 }}>{children}</strong>,
                          blockquote: ({ children }) => (
                            <blockquote style={{ borderLeft: "4px solid var(--accent)", paddingLeft: "1rem", marginLeft: 0, fontStyle: "italic", color: "var(--muted-foreground)" }}>{children}</blockquote>
                          ),
                          hr: () => <hr style={{ borderColor: "var(--border)", margin: "1.25rem 0" }} />,
                          table: ({ children }) => <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>{children}</table></div>,
                          th: ({ children }) => <th style={{ textAlign: "left", padding: "0.4rem 0.75rem", background: "var(--secondary)", borderBottom: "1px solid var(--border)", color: "var(--foreground)", fontWeight: 600 }}>{children}</th>,
                          td: ({ children }) => <td style={{ padding: "0.4rem 0.75rem", borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}>{children}</td>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontWeight: 500 }}>
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {processedReport}
                      </ReactMarkdown>
                    </div>

                    {sources.length > 0 && (
                      <div className="bg-card border border-border rounded-xl p-6">
                        <h3 style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1rem", marginBottom: "1rem", color: "var(--foreground)" }}>
                          Sources
                        </h3>
                        <ol style={{ listStyle: "none", padding: 0, margin: 0 }} className="space-y-1.5">
                          {sources.map(({ num, url }) => {
                            let domain = url;
                            try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep full url */ }
                            return (
                              <li key={num} className="flex items-baseline gap-2 text-xs">
                                <span className="shrink-0 text-muted-foreground font-medium w-6 text-right">[{num}]</span>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate" title={url}>
                                  {domain}
                                </a>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
                    <FlaskConical className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600 }}>No report yet</p>
                    <p className="text-muted-foreground text-sm">The research report for this ministry hasn't been generated yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Ministry Leader Interview */}
            {activeSection === "interview" && (
              <div className="space-y-6">
                <h2 className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.375rem" }}>Ministry Leader Interview</h2>
                <p className="text-muted-foreground text-sm mb-6">Conversations with the leadership of {ministry.ministry_name}.</p>
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <Mic2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600 }}>No interviews yet</p>
                  <p className="text-muted-foreground text-sm">Leadership interviews will appear here once submitted and reviewed.</p>
                </div>
              </div>
            )}

            {/* Testimonies */}
            {activeSection === "testimonies" && (
              <div className="space-y-6">
                <h2 className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.375rem" }}>Testimonies</h2>
                <p className="text-muted-foreground text-sm mb-6">Stories and experiences shared by the community.</p>
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600 }}>No testimonies yet</p>
                  <p className="text-muted-foreground text-sm">Community testimonies will appear here once submitted.</p>
                </div>
              </div>
            )}

            {/* Dialogue Channel */}
            {activeSection === "dialogue" && (
              <div>
                <h2 className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.375rem" }}>Dialogue Channel</h2>
                <p className="text-muted-foreground text-sm mb-6">Open discussion and questions about {ministry.ministry_name}.</p>
                <div className="bg-card border border-border rounded-xl flex flex-col" style={{ minHeight: "420px" }}>
                  <div className="flex-1 p-5 space-y-5 overflow-y-auto" style={{ maxHeight: "420px" }}>
                    {chatMessages.length === 0 && (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm pt-16">
                        Be the first to start the conversation.
                      </div>
                    )}
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary shrink-0 text-sm font-medium" style={{ fontFamily: "'Lora', serif" }}>
                          {msg.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">{msg.author}</span>
                            <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>
                  <div className="border-t border-border p-4 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0 text-sm" style={{ fontFamily: "'Lora', serif" }}>Y</div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Share your thoughts or ask a question…"
                        className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button onClick={handleSendMessage} disabled={!chatInput.trim()} className="bg-primary text-primary-foreground p-2 rounded-lg disabled:opacity-40 transition-opacity hover:opacity-90">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Conversations are moderated for respectful, faith-affirming dialogue.</p>
              </div>
            )}

            {/* Documents */}
            {activeSection === "documents" && (
              <div className="space-y-6">
                <h2 className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.375rem" }}>Annual Report, 990, Newsletters</h2>
                <p className="text-muted-foreground text-sm mb-6">Official filings and publications from {ministry.ministry_name}.</p>
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <ScrollText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600 }}>No documents yet</p>
                  <p className="text-muted-foreground text-sm">Official filings and publications will appear here once uploaded.</p>
                </div>
              </div>
            )}

            {/* Private Notes */}
            {activeSection === "notes" && (
              <div className="space-y-6">
                <h2 className="text-foreground mb-1" style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.375rem" }}>My Private Notes</h2>
                <p className="text-muted-foreground text-sm mb-6">Personal notes visible only to you. Not shared with anyone.</p>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <textarea
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    placeholder="Write your private thoughts, prayer requests, or reminders about this ministry…"
                    className="w-full p-5 text-sm text-foreground bg-transparent placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
                    rows={14}
                    style={{ fontFamily: "'Lora', serif" }}
                  />
                  <div className="border-t border-border px-5 py-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{privateNotes.length} characters</span>
                    <button className="text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded-lg transition-opacity hover:opacity-90">
                      Save Notes
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Your notes are stored locally and never shared with the ministry or other users.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
