import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getPulseData, getPulseSession } from "@/lib/pulse/pulse.functions";
import { makeRange, type Range, type RangeId } from "@/lib/pulse/metrics";

type Session = Awaited<ReturnType<typeof getPulseSession>>;
export type PulseClient = Session["clients"][number];

type Ctx = {
  session: Session | undefined;
  loading: boolean;
  clientId: string; // uuid or "all"
  setClientId: (id: string) => void;
  client: PulseClient | null;
  connected: string[];
  channel: string;
  setChannel: (c: string) => void;
  range: Range;
  setRange: (id: RangeId, custom?: { from: string; to: string }) => void;
  sites: string[];
  site: string | null;
  setSite: (s: string | null) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
  refetchSession: () => void;
};

const PulseCtx = createContext<Ctx | null>(null);

export function PulseProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const fetchSession = useServerFn(getPulseSession);
  const q = useQuery({ queryKey: ["pulse", "session"], queryFn: () => fetchSession(), staleTime: 60_000 });
  const key = `pulse.client.${userId}`;
  const [clientId, setClientIdState] = useState("");
  const [channel, setChannel] = useState("all");
  const [range, setRangeState] = useState<Range>(() => makeRange("28d"));
  const [site, setSite] = useState<string | null>(null);
  const [dark, setDarkState] = useState(false);

  useEffect(() => {
    setDarkState(localStorage.getItem("pulse.dark") === "1");
  }, []);

  useEffect(() => {
    const clients = q.data?.clients.filter((c) => c.status !== "archived") ?? [];
    if (!clients.length || clientId) return;
    const saved = localStorage.getItem(key);
    const ok = saved && (saved === "all" ? q.data?.role === "admin" : clients.some((c) => c.id === saved));
    setClientIdState(ok ? saved! : clients[0]!.id);
  }, [q.data, clientId, key]);

  const client = q.data?.clients.find((c) => c.id === clientId) ?? null;
  const connected = useMemo(() => [...new Set(client?.connections.map((c) => c.provider) ?? [])], [client]);
  const sites = useMemo(
    () => client?.connections.filter((c) => c.provider === "search_console" && c.account_ref).map((c) => c.account_ref!) ?? [],
    [client],
  );
  useEffect(() => {
    if (site && !sites.includes(site)) setSite(null);
  }, [sites, site]);

  useEffect(() => {
    if (channel !== "all" && client && !connected.includes(channel)) setChannel("all");
  }, [client, connected, channel]);

  const value: Ctx = {
    session: q.data,
    loading: q.isLoading,
    clientId,
    setClientId: (id) => {
      localStorage.setItem(key, id);
      setClientIdState(id);
      setSite(null);
    },
    sites,
    site,
    setSite,
    client,
    connected,
    channel,
    setChannel,
    range,
    setRange: (id, custom) => setRangeState(makeRange(id, custom)),
    dark,
    setDark: (d) => {
      localStorage.setItem("pulse.dark", d ? "1" : "0");
      setDarkState(d);
    },
    refetchSession: () => void q.refetch(),
  };
  return <PulseCtx.Provider value={value}>{children}</PulseCtx.Provider>;
}

export function usePulse() {
  const c = useContext(PulseCtx);
  if (!c) throw new Error("usePulse outside PulseProvider");
  return c;
}

/** Cached per client + period, so switching back is instant. */
export function usePulseData(include: ("posts" | "reviews")[] = [], forClient?: string) {
  const { clientId, range, site } = usePulse();
  const id = forClient ?? clientId;
  const s = forClient ? null : site;
  const fetchData = useServerFn(getPulseData);
  return useQuery({
    queryKey: ["pulse", "data", id, range.from, range.to, include.join(","), s],
    queryFn: () =>
      fetchData({
        data: { clientId: id, from: range.from, to: range.to, priorFrom: range.priorFrom, bucket: range.bucket, include, site: s },
      }),
    enabled: !!id && id !== "all",
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}
