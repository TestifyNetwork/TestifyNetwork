import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Search, MapPin, X, Loader } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { API_ROUTES, PATHS } from "../constants";
import type { MinistryListItem } from "../../types/database";

const BASE = `https://${projectId}.supabase.co/functions/v1`;
const headers = { Authorization: `Bearer ${publicAnonKey}` };

export function SearchPage() {
  const [ministries, setMinistries] = useState<MinistryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${BASE}${API_ROUTES.MINISTRIES}`, { headers })
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Page header */}
      <div className="mb-10">
        <h1
          className="text-foreground mb-2"
          style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "2.25rem" }}
        >
          Browse Ministries
        </h1>
        <p className="text-muted-foreground">
          {loading ? "Loading…" : `${ministries.length} organization${ministries.length === 1 ? "" : "s"} in the network`}
        </p>
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
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* States */}
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
            {filtered.length === 0
              ? "No ministries found"
              : `Showing ${filtered.length} ministr${filtered.length === 1 ? "y" : "ies"}`}
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
                  {/* Logo / image area */}
                  <div className="relative h-44 overflow-hidden bg-secondary flex items-center justify-center">
                    {m.logo_url ? (
                      <img
                        src={m.logo_url}
                        alt={m.ministry_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <div
                          className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary"
                          style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "1.5rem" }}
                        >
                          {m.ministry_name.charAt(0)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3
                      className="text-foreground mb-1 group-hover:text-primary transition-colors"
                      style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1rem" }}
                    >
                      {m.ministry_name}
                    </h3>

                    {m.mission && (
                      <p className="text-muted-foreground text-xs mb-4 line-clamp-2 leading-relaxed">
                        {m.mission}
                      </p>
                    )}

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
    </div>
  );
}
