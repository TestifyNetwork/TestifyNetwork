import { Outlet, Link, useLocation } from "react-router";
import { Heart, Menu, X } from "lucide-react";
import { useState } from "react";
import { BRAND_NAME, BRAND_DESCRIPTION, BRAND_FOOTER, BRAND_YEAR, PATHS } from "./constants";

export function Root() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: PATHS.HOME, label: "Home" },
    { to: PATHS.SEARCH, label: "Ministries" },
  ];

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <span
              className="text-foreground tracking-tight"
              style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "1.125rem" }}
            >
              {BRAND_NAME}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm transition-colors ${
                  isActive(link.to)
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`text-sm ${isActive(link.to) ? "text-primary font-medium" : "text-muted-foreground"}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Heart className="w-3 h-3 text-primary-foreground" strokeWidth={1.5} />
              </div>
              <span style={{ fontFamily: "'Lora', serif", fontWeight: 600, fontSize: "0.95rem" }}>
                {BRAND_NAME}
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {BRAND_DESCRIPTION}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium mb-3">Explore</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to={PATHS.HOME} className="hover:text-foreground transition-colors">Home</Link></li>
              <li><Link to={PATHS.SEARCH} className="hover:text-foreground transition-colors">Browse Ministries</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium mb-3">About</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Transparency First</li>
              <li>Community Driven</li>
              <li>Faith Centered</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-6">
          <p className="text-xs text-muted-foreground border-t border-border pt-6">
            © {BRAND_YEAR} {BRAND_NAME}. {BRAND_FOOTER}
          </p>
        </div>
      </footer>
    </div>
  );
}
