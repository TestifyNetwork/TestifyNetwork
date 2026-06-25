import { Link } from "react-router";
import { Home, Search } from "lucide-react";

export function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-6 py-32 text-center">
      <p className="text-muted-foreground text-sm uppercase tracking-widest mb-4">404</p>
      <h1 className="text-foreground mb-4" style={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: "2rem" }}>
        Page not found
      </h1>
      <p className="text-muted-foreground mb-10">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link to="/" className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm">
          <Home className="w-4 h-4" /> Go Home
        </Link>
        <Link to="/search" className="flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-lg text-sm hover:bg-secondary transition-colors">
          <Search className="w-4 h-4" /> Search Ministries
        </Link>
      </div>
    </div>
  );
}
