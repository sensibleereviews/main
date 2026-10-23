// URL-synced client router. One physical page route ("/"); the URL is the single
// source of truth. Middleware rewrites production subdomains (app./admin.) and any
// deep path onto "/" with x-ss-* headers, so www/app/admin all deep-link correctly.
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { parseLocation, hrefFor, type Route, type Surface } from "./route-shared";

export type { Route, Surface };
export { parseLocation, hrefFor };

type RouterCtx = {
  route: Route;
  navigate: (r: Route) => void;
};

const Ctx = createContext<RouterCtx>({ route: { surface: "home" }, navigate: () => {} });

export function SensibleeRouterProvider({ initialRoute, children }: { initialRoute: Route; children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>(initialRoute);

  useEffect(() => {
    const onPop = () => setRoute(parseLocation(window.location));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useMemo(
    () => (r: Route) => {
      const href = hrefFor(r, window.location.hostname);
      if (window.location.pathname !== href) window.history.pushState({}, "", href);
      setRoute(r);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    },
    []
  );

  return <Ctx.Provider value={{ route, navigate }}>{children}</Ctx.Provider>;
}

export const useRouter = () => useContext(Ctx);
