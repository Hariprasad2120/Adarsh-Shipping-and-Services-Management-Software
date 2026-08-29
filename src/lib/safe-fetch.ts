import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * SSRF-hardened fetch.
 *
 * Every server-side fetch of a URL that is (even partly) influenced by user or
 * tenant data MUST go through this helper instead of the global `fetch`.
 *
 * Protections:
 *  - protocol allowlist (https only by default; http allowed only when opted in)
 *  - DNS resolution + rejection of loopback / private / link-local / CGNAT /
 *    multicast / reserved / cloud-metadata addresses (IPv4 and IPv6)
 *  - re-validation of every redirect hop (redirects are followed manually)
 *  - hard timeout and response-size cap
 *  - optional host allowlist for the strict case
 *
 * It does NOT fully defeat DNS-rebinding on its own (the address can change
 * between our lookup and the runtime's connect). For the highest-risk callers,
 * pass an explicit `allowHosts` allowlist and/or run behind an egress proxy.
 */

export interface SafeFetchOptions extends RequestInit {
  /** Allow plain http:// targets. Default false. */
  allowHttp?: boolean;
  /** Restrict to these exact hostnames (case-insensitive). */
  allowHosts?: string[];
  /** Milliseconds before the request is aborted. Default 10_000. */
  timeoutMs?: number;
  /** Max bytes to read from the response body. Default 10 MiB. */
  maxBytes?: number;
  /** Max redirect hops to follow. Default 3. */
  maxRedirects?: number;
  /** DNS resolver override (testing / custom egress). Returns IP strings. */
  resolveHost?: (hostname: string) => Promise<string[]>;
}

async function defaultResolve(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((r) => r.address);
}

export class SsrfBlockedError extends Error {
  constructor(reason: string) {
    super(`Blocked by SSRF guard: ${reason}`);
    this.name = "SsrfBlockedError";
  }
}

const PRIVATE_V4 = [
  { net: "0.0.0.0", bits: 8 },
  { net: "10.0.0.0", bits: 8 },
  { net: "100.64.0.0", bits: 10 }, // CGNAT
  { net: "127.0.0.0", bits: 8 },
  { net: "169.254.0.0", bits: 16 }, // link-local incl. 169.254.169.254 metadata
  { net: "172.16.0.0", bits: 12 },
  { net: "192.0.0.0", bits: 24 },
  { net: "192.168.0.0", bits: 16 },
  { net: "198.18.0.0", bits: 15 },
  { net: "224.0.0.0", bits: 4 }, // multicast
  { net: "240.0.0.0", bits: 4 }, // reserved
];

function v4ToInt(ip: string): number {
  const p = ip.split(".").map(Number);
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}

function isBlockedIpv4(ip: string): boolean {
  const addr = v4ToInt(ip);
  return PRIVATE_V4.some(({ net: n, bits }) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (addr & mask) === (v4ToInt(n) & mask);
  });
}

function isBlockedIpv6(ip: string): boolean {
  const a = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (a === "::1" || a === "::") return true; // loopback / unspecified
  if (a.startsWith("fe80") || a.startsWith("fec0")) return true; // link/site-local
  if (a.startsWith("fc") || a.startsWith("fd")) return true; // unique-local
  if (a.startsWith("ff")) return true; // multicast
  // IPv4-mapped / -compatible: ::ffff:a.b.c.d  or  ::a.b.c.d
  const m = a.match(/(?:::ffff:|::)(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return isBlockedIpv4(m[1]);
  return false;
}

function isBlockedAddress(ip: string): boolean {
  const fam = net.isIP(ip);
  if (fam === 4) return isBlockedIpv4(ip);
  if (fam === 6) return isBlockedIpv6(ip);
  return true; // not a literal IP we can reason about -> block
}

async function assertHostIsPublic(
  hostname: string,
  resolveHost: (h: string) => Promise<string[]>,
  allowHosts?: string[],
) {
  if (allowHosts && allowHosts.length > 0) {
    if (!allowHosts.some((h) => h.toLowerCase() === hostname.toLowerCase())) {
      throw new SsrfBlockedError(`host ${hostname} not in allowlist`);
    }
  }
  // Literal IP in the URL
  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new SsrfBlockedError(`literal address ${hostname} is not public`);
    }
    return;
  }
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new SsrfBlockedError("localhost is not allowed");
  }
  let addresses: string[];
  try {
    addresses = await resolveHost(hostname);
  } catch {
    throw new SsrfBlockedError(`DNS resolution failed for ${hostname}`);
  }
  if (addresses.length === 0) throw new SsrfBlockedError(`no DNS records for ${hostname}`);
  for (const address of addresses) {
    if (isBlockedAddress(address)) {
      throw new SsrfBlockedError(`${hostname} resolves to non-public address ${address}`);
    }
  }
}

function parseAndValidateUrl(raw: string, allowHttp: boolean): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfBlockedError("not a valid absolute URL");
  }
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    throw new SsrfBlockedError(`protocol ${url.protocol} not allowed`);
  }
  if (url.username || url.password) {
    throw new SsrfBlockedError("credentials in URL are not allowed");
  }
  return url;
}

export async function safeFetch(
  input: string,
  options: SafeFetchOptions = {},
): Promise<Response> {
  const {
    allowHttp = false,
    allowHosts,
    timeoutMs = 10_000,
    maxBytes = 10 * 1024 * 1024,
    maxRedirects = 3,
    resolveHost = defaultResolve,
    ...init
  } = options;

  let currentUrl = parseAndValidateUrl(input, allowHttp);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let hop = 0; hop <= maxRedirects; hop++) {
      await assertHostIsPublic(currentUrl.hostname, resolveHost, allowHosts);

      const res = await fetch(currentUrl, {
        ...init,
        redirect: "manual",
        signal: controller.signal,
      });

      if (res.status >= 300 && res.status < 400 && res.headers.has("location")) {
        if (hop === maxRedirects) throw new SsrfBlockedError("too many redirects");
        const next = new URL(res.headers.get("location")!, currentUrl);
        currentUrl = parseAndValidateUrl(next.toString(), allowHttp);
        continue;
      }

      const len = Number(res.headers.get("content-length") ?? "0");
      if (len && len > maxBytes) {
        throw new SsrfBlockedError(`response too large (${len} bytes)`);
      }
      return res;
    }
    throw new SsrfBlockedError("redirect loop");
  } finally {
    clearTimeout(timer);
  }
}
