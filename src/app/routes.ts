import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { MinistryPage } from "./pages/MinistryPage";
import { NotFound } from "./pages/NotFound";
import { PATHS } from "./constants";

export const router = createBrowserRouter([
  {
    path: PATHS.HOME,
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: PATHS.SEARCH.slice(1), Component: SearchPage },
      { path: PATHS.MINISTRY_PATTERN.slice(1), Component: MinistryPage },
      { path: "*", Component: NotFound },
    ],
  },
]);
