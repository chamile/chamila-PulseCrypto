export function formatPrice(n: number, dp = 2): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    });
  }
  return n.toFixed(n >= 1 ? dp : 5);
}

export function formatQty(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(dp);
}

export function formatPct(n: number, dp = 2): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(dp)}%`;
}

export function formatTime(ms: number | null): string {
  if (!ms) return '—';
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
}

export function pairDisplay(pair: string): string {
  if (pair.endsWith('USDT')) {
    return `${pair.slice(0, -4)} / USDT`;
  }
  return pair;
}
