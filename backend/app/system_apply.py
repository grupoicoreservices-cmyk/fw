import os
import subprocess
import logging
from pathlib import Path
from datetime import datetime, timezone
from app.utils import now_iso

logger = logging.getLogger('firewall-console.apply')

NFT_BIN = os.environ.get('NFT_BIN', '/usr/sbin/nft')
WORK_DIR = Path(os.environ.get('FIREWALL_WORK_DIR', '/var/lib/firewall-console'))
BACKUP_DIR = WORK_DIR / 'backups'
APPLY_REAL = os.environ.get('FIREWALL_APPLY_REAL', 'false').lower() in ('1', 'true', 'yes', 'on')


def apply_enabled() -> bool:
    return APPLY_REAL


def _ensure_dirs() -> None:
    try:
        WORK_DIR.mkdir(parents=True, exist_ok=True)
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.warning('Could not ensure dirs %s: %s', WORK_DIR, e)


def get_current_ruleset() -> str:
    """Return current host nftables ruleset (empty if apply disabled or error)."""
    if not APPLY_REAL:
        return ''
    try:
        res = subprocess.run([NFT_BIN, 'list', 'ruleset'], capture_output=True, text=True, timeout=10)
        if res.returncode != 0:
            return f'# Error reading ruleset: {res.stderr.strip()}'
        return res.stdout
    except FileNotFoundError:
        return f'# nft binary not found at {NFT_BIN}'
    except Exception as e:
        return f'# Error: {e}'


def backup_current() -> str:
    """Save current ruleset to BACKUP_DIR. Returns path."""
    _ensure_dirs()
    current = get_current_ruleset()
    ts = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    path = BACKUP_DIR / f'ruleset-{ts}.nft'
    try:
        path.write_text(current or '# (empty)\n')
    except Exception as e:
        logger.error('Backup failed: %s', e)
        return ''
    return str(path)


def list_backups(limit: int = 30) -> list:
    _ensure_dirs()
    files = sorted(BACKUP_DIR.glob('ruleset-*.nft'), reverse=True)[:limit]
    return [{'name': f.name, 'path': str(f), 'size': f.stat().st_size, 'mtime': datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc).isoformat()} for f in files]


def apply_nftables(config_text: str) -> dict:
    """Backup the current ruleset, write the new config and run nft -f.
    Returns a dict with ok=True/False, applied_at, backup, error.
    """
    if not APPLY_REAL:
        return {'ok': False, 'reason': 'FIREWALL_APPLY_REAL is disabled (simulation mode)'}
    _ensure_dirs()
    backup_path = backup_current()
    cfg_path = WORK_DIR / 'current.nft'
    try:
        cfg_path.write_text(config_text)
    except Exception as e:
        return {'ok': False, 'error': f'Could not write config file: {e}', 'backup': backup_path}
    try:
        res = subprocess.run([NFT_BIN, '-f', str(cfg_path)], capture_output=True, text=True, timeout=30)
        if res.returncode == 0:
            logger.info('nftables applied successfully (backup at %s)', backup_path)
            return {
                'ok': True,
                'applied_at': now_iso(),
                'backup': backup_path,
                'config_path': str(cfg_path),
                'stderr': res.stderr,
            }
        logger.error('nft -f failed: %s', res.stderr)
        return {'ok': False, 'error': res.stderr or res.stdout, 'backup': backup_path}
    except FileNotFoundError:
        return {'ok': False, 'error': f'nft binary not found at {NFT_BIN}'}
    except Exception as e:
        return {'ok': False, 'error': str(e), 'backup': backup_path}


def rollback_last() -> dict:
    """Re-apply the most recent backup file."""
    if not APPLY_REAL:
        return {'ok': False, 'reason': 'FIREWALL_APPLY_REAL is disabled'}
    _ensure_dirs()
    backups = sorted(BACKUP_DIR.glob('ruleset-*.nft'))
    if not backups:
        return {'ok': False, 'error': 'Nenhum backup disponível para rollback'}
    latest = backups[-1]
    try:
        # First flush, then apply backup so we end up with exactly the saved state
        subprocess.run([NFT_BIN, 'flush', 'ruleset'], capture_output=True, text=True, timeout=10)
        res = subprocess.run([NFT_BIN, '-f', str(latest)], capture_output=True, text=True, timeout=30)
        if res.returncode == 0:
            logger.info('Rolled back to %s', latest)
            return {'ok': True, 'restored_from': str(latest), 'restored_at': now_iso()}
        return {'ok': False, 'error': res.stderr or res.stdout, 'attempted': str(latest)}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def flush_ruleset() -> dict:
    """Emergency: drop all rules (host accepts everything)."""
    if not APPLY_REAL:
        return {'ok': False, 'reason': 'FIREWALL_APPLY_REAL is disabled'}
    try:
        backup_current()
        res = subprocess.run([NFT_BIN, 'flush', 'ruleset'], capture_output=True, text=True, timeout=10)
        if res.returncode == 0:
            return {'ok': True, 'flushed_at': now_iso()}
        return {'ok': False, 'error': res.stderr or res.stdout}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
