"""Domain name resolver for URL filtering.
Uses stdlib socket; falls back gracefully on errors.
Supports IPv4 only for now (most blocking is IPv4-based).
"""
import socket
import logging
from typing import List, Set

logger = logging.getLogger('firewall-console.url-resolver')


def resolve_domain(domain: str) -> List[str]:
    """Return list of unique IPv4 addresses for a domain. Empty list on error."""
    domain = domain.strip().lower()
    if not domain:
        return []
    if _is_ip(domain):
        return [domain]
    try:
        infos = socket.getaddrinfo(domain, None, socket.AF_INET, socket.SOCK_STREAM)
        ips = sorted({info[4][0] for info in infos})
        return ips
    except socket.gaierror:
        return []
    except Exception as e:
        logger.warning('Resolve failed for %s: %s', domain, e)
        return []


def resolve_domains(domains: List[str]) -> dict:
    """Return {domain: [ips]} for a list of domains."""
    out = {}
    for d in domains:
        out[d] = resolve_domain(d)
    return out


def flatten_ips(domains_map: dict) -> List[str]:
    """Flatten a {domain: [ips]} into a deduplicated list of IPs."""
    seen: Set[str] = set()
    out: List[str] = []
    for ips in domains_map.values():
        for ip in ips:
            if ip not in seen:
                seen.add(ip)
                out.append(ip)
    return out


def _is_ip(s: str) -> bool:
    try:
        socket.inet_aton(s)
        return True
    except OSError:
        return False
