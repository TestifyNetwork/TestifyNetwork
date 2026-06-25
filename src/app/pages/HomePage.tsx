import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Search, Shield, MessageSquare, FileText, ArrowRight, MapPin, Loader } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { API_ROUTES, PATHS, BRAND_NAME, BRAND_TAGLINE } from "../constants";
import type { MinistryListItem } from "../../types/database";

const BASE = `https://${projectId}.supabase.co/functions/v1`;
const headers = { Authorization: `Bearer ${publicAnonKey}` };

export function HomePage() {
  const [featured, setFeatured] = useState<MinistryListItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    fetch(`${BASE}${API_ROUTES.MINISTRIES}`, { headers })
      .then((r) => r.json())
      .then((data) => setFeatured((data.ministries ?? []).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=1400&h=700&fit=crop&auto=format")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-36">
          <div className="max-w-2xl">
            <span
              className="inline-block text-accent text-sm tracking-widest uppercase mb-6"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
            >
              {BRAND_TAGLINE}
            </span>
            <h1
              className="mb-6 text-primary-foreground leading-tight"
              style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.15 }}
            >
              Discover ministries you can trust
            </h1>
            <p className="text-primary-foreground/75 mb-10 leading-relaxed" style={{ fontSize: "1.125rem" }}>
              Search vetted Christian ministries, read independent research reports, and connect with a community of faithful givers.
            </p>
            <Link
              to={PATHS.SEARCH}
              className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-6 py-3.5 rounded-lg font-medium transition-opacity hover:opacity-90"
            >
              <Search className="w-4 h-4" />
              Search Ministries
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2
            style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "2rem" }}
            className="text-foreground mb-3"
          >
            Everything you need to give wisely
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We bring financial accountability, community conversation, and mission clarity into one place.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Search,
              title: "Search & Filter",
              desc: "Browse ministries by location, keyword, or mission. Every listing is independently reviewed.",
            },
            {
              icon: FileText,
              title: "Read Reports",
              desc: "Access AI-generated research reports, annual filings, and independent accountability ratings.",
            },
            {
              icon: MessageSquare,
              title: "Join the Conversation",
              desc: "Ask questions, read donor experiences, and share insights with a community of engaged givers.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-card rounded-xl p-8 border border-border">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <h3
                className="mb-2 text-foreground"
                style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.125rem" }}
              >
                {title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured ministries */}
      <section className="bg-secondary/40">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2
                style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "2rem" }}
                className="text-foreground mb-2"
              >
                Featured Ministries
              </h2>
              <p className="text-muted-foreground text-sm">Organizations with published research reports</p>
            </div>
            <Link
              to={PATHS.SEARCH}
              className="hidden md:flex items-center gap-1.5 text-primary text-sm font-medium hover:underline"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading ministries…</span>
            </div>
          ) : featured.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No ministries available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featured.map((m) => (
                <Link
                  key={m.ministry_id}
                  to={PATHS.MINISTRY(m.ministry_id)}
                  className="bg-card rounded-xl overflow-hidden border border-border group hover:shadow-md transition-shadow"
                >
                  <div className="h-44 overflow-hidden bg-secondary flex items-center justify-center">
                    {m.logo_url ? (
                      <img
                        src={m.logo_url}
                        alt={m.ministry_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span
                        className="text-primary/20"
                        style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "3.5rem" }}
                      >
                        {m.ministry_name.charAt(0)}
                      </span>
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
                      <p className="text-muted-foreground text-xs mb-3 line-clamp-2 leading-relaxed">{m.mission}</p>
                    )}
                    {m.hq_location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {m.hq_location}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 md:hidden text-center">
            <Link to={PATHS.SEARCH} className="text-primary text-sm font-medium hover:underline flex items-center gap-1 justify-center">
              View all ministries <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2
              style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "2rem", lineHeight: 1.2 }}
              className="text-foreground mb-5"
            >
              Built on the principle of faithful stewardship
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Every organization on {BRAND_NAME} is reviewed for financial transparency. We publish research reports, audited statements, and accountability ratings so donors can give with confidence.
            </p>
            <div className="space-y-4">
              {[
                { icon: Shield, text: "Independent financial verification for every listing" },
                { icon: FileText, text: "Public access to audited reports and 990s" },
                { icon: Search, text: "Community-driven accountability ratings" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden h-72 md:h-80">
            <img
              src="https://images.unsplash.com/photo-1593113598332-cd288d649433?w=700&h=500&fit=crop&auto=format"
              alt="Community of givers"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
