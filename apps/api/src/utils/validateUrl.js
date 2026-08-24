// apps/api/src/utils/validateUrl.js
//
// SSRF guard. The API's whole job is "launch a real headless browser and
// fetch whatever URL a stranger gives us" — that's a textbook SSRF vector
// if we only check that the string parses as http(s). A request for
// http://169.254.169.254/latest/meta-data/ (the AWS/GCP/Azure/DO instance
// metadata endpoint) or http://localhost:6379 would sail through the old
// check and let the browser reach internal services from wherever this is
// deployed.
//
// This validates in two layers:
//   1. Reject obvious loopback/localhost hostnames outright.
//   2. Resolve DNS ourselves and reject if ANY resolved address falls in a
//      private/reserved/link-local range — because an attacker-controlled
//      domain can simply point its A record at an internal IP.
//
// Known limitation: this is a point-in-time check. Between this check and
// the browser's own navigation, DNS could in principle be "rebound" to a
// different (private) IP (TOCTOU). crawlPage() re-runs this check
// immediately before navigating to shrink that window, but a fully
// rebinding-proof setup would need to pin the resolved IP and connect to
// it directly (e.g. via page.route()) rather than letting the browser
// re-resolve DNS itself. Flagging as a follow-up rather than solving here.

import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '[::1]',
]);

// [network, prefixLength] pairs for IPv4 ranges that must never be reachable
// from a server-side fetch: RFC 1918 private space, loopback, link-local
// (includes the 169.254.169.254 cloud metadata endpoint), CGNAT, multicast,
// and reserved/"this network" blocks.
const PRIVATE_IPV4_RANGES = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function ipv4ToLong(ip) {
  return (
    ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
  );
}

function isPrivateIPv4(ip) {
  const target = ipv4ToLong(ip);
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (target & mask) === (ipv4ToLong(base) & mask);
  });
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' || // loopback
    lower === '::' || // unspecified
    lower.startsWith('fe80:') || // link-local
    lower.startsWith('fc') || // unique local fc00::/7
    lower.startsWith('fd') ||
    lower.startsWith('::ffff:') // IPv4-mapped — unwrap and recheck
  );
}

function isUnsafeIp(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) {
    if (ip.toLowerCase().startsWith('::ffff:')) {
      const mapped = ip.split(':').pop();
      if (net.isIPv4(mapped)) return isPrivateIPv4(mapped);
    }
    return isPrivateIPv6(ip);
  }
  return true; // unrecognized shape — fail closed
}

/**
 * @param {string} value
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function isSafeAnalyzeUrl(value) {
  if (!value || typeof value !== 'string') {
    return { ok: false, reason: 'Provide a URL string.' };
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: 'Not a valid URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only http/https URLs are allowed.' };
  }

  // Embedded credentials (http://user:pass@host) are their own confused-
  // deputy / credential-leak risk — no legitimate analyze target needs them.
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with embedded credentials are not allowed.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: 'Localhost/loopback targets are not allowed.' };
  }

  // Literal IP given directly in the URL.
  if (net.isIP(hostname)) {
    return isUnsafeIp(hostname)
      ? { ok: false, reason: 'Private/reserved IP targets are not allowed.' }
      : { ok: true };
  }

  // Resolve DNS ourselves so a hostname that *points at* a private IP
  // (rather than being one) is caught too.
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, reason: 'Could not resolve hostname.' };
  }

  if (addresses.length === 0) {
    return { ok: false, reason: 'Hostname did not resolve to any address.' };
  }

  if (addresses.some((a) => isUnsafeIp(a.address))) {
    return { ok: false, reason: 'Domain resolves to a private/reserved IP.' };
  }

  return { ok: true };
}
