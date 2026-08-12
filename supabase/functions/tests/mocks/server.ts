// Shared MSW server instance. Tests register handlers with `mswServer.use(...)`
// and reset between cases with `mswServer.resetHandlers()`.
import { setupServer } from "msw/node";

export const mswServer = setupServer();
