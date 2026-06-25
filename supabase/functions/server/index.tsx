import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
import { DB, SERVER_PREFIX } from "./constants.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const { TABLE, COL } = DB;

app.get(`/${SERVER_PREFIX}/health`, (c) => {
  return c.json({ status: "ok" });
});

app.get(`/${SERVER_PREFIX}/ministries`, async (c) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`${COL.ID}, ${COL.NAME}, ${COL.LOGO}, ${COL.LOCATION}, ${COL.MISSION}`)
    .order(COL.NAME, { ascending: true });

  if (error) {
    console.log(`Error listing ministries: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
  return c.json({ ministries: data ?? [] }, 200);
});

app.get(`/${SERVER_PREFIX}/ministry/:id`, async (c) => {
  const id = c.req.param("id");
  const { data, error } = await supabase
    .from(TABLE)
    .select(`${COL.ID}, ${COL.NAME}, ${COL.LOGO}, ${COL.LOCATION}, ${COL.MISSION}, ${COL.REPORT}`)
    .eq(COL.ID, id)
    .maybeSingle();

  if (error) {
    console.log(`Error fetching ministry "${id}": ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
  if (!data) {
    return c.json({ ministry: null }, 200);
  }
  return c.json({ ministry: data }, 200);
});

Deno.serve(app.fetch);