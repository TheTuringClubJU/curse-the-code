// Pure client-side forensic document formatting, visual SVG preview & AI export utilities (zero external dependencies)

const stripTestPrefix = (val) => String(val ?? '').replace(/^TEST:\s*/i, '').trim();

const escapeXml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const wrapPreviewLines = (text, maxChars = 42, maxLines = 6) => {
  const words = stripTestPrefix(text).split(/\s+/).filter(Boolean);
  const out = [];
  let line = '';
  for (const w of words) {
    if (out.length >= maxLines) break;
    if ((line ? `${line} ${w}` : w).length <= maxChars) {
      line = line ? `${line} ${w}` : w;
    } else {
      if (line) out.push(line);
      line = w.slice(0, maxChars);
      if (out.length >= maxLines) break;
    }
  }
  if (line && out.length < maxLines) out.push(line);
  return out;
};

export function sanitizeExportFilename(id, title) {
  const stem = [id, title]
    .filter(Boolean)
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return `${stem || 'delta_record'}.txt`;
}

export function formatDocumentText(item, richMeta = null) {
  if (!item) return '';
  const disp = item.display || {};
  const title = stripTestPrefix(item.title || disp.title || item.id || 'DOCUMENT');
  const cornerMark = stripTestPrefix(item.corner_mark || disp.corner_mark || '');
  const classification = stripTestPrefix(
    item.classification || richMeta?.classification || (item.kind === 'world_doc' ? 'FIELD DOCUMENT // WORLD ARCHIVE' : 'SUBSTATION DELTA RECORD')
  );
  const location = stripTestPrefix(item.location || richMeta?.location || '');
  const rawLines = Array.isArray(item.lines) ? item.lines : (Array.isArray(disp.lines) ? disp.lines : []);
  const lines = rawLines.map(stripTestPrefix).filter(Boolean);
  const rawReport = Array.isArray(item.reportLines)
    ? item.reportLines
    : (Array.isArray(richMeta?.reportLines) ? richMeta.reportLines : []);
  const reportLines = rawReport.map(stripTestPrefix).filter(Boolean);
  const events = Array.isArray(item.events) ? item.events.map(stripTestPrefix).filter(Boolean) : [];
  const body = item.body ? stripTestPrefix(item.body) : '';
  const highlight = stripTestPrefix(item.highlight || richMeta?.highlight || item.secret?.note || disp.highlight || '');

  return [
    `TITLE: ${title}`,
    cornerMark ? `REFERENCE: ${cornerMark}` : null,
    classification ? `CLASSIFICATION: ${classification}` : null,
    location ? `LOCATION: ${location}` : null,
    '',
    ...lines,
    ...(reportLines.length ? ['', 'FIELD DOSSIER REPORT:', ...reportLines] : []),
    ...(events.length ? ['', 'TELEMETRY LOG:', ...events] : []),
    ...(body && !lines.includes(body) ? [body] : []),
    '',
    highlight ? `LEAD/HIGHLIGHT: ${highlight}` : null,
  ]
    .filter((entry) => entry !== null && entry !== undefined)
    .join('\n')
    .trim();
}

export function createDocumentPreviewSvg(item, richMeta = null) {
  const disp = item?.display || {};
  const idLabel = escapeXml(stripTestPrefix(disp.corner_mark || item?.corner_mark || item?.id || 'DELTA-DOC'));
  const title = stripTestPrefix(item?.title || disp.title || item?.id || 'ARCHIVAL RECORD');
  const classification = escapeXml(
    stripTestPrefix(item?.classification || richMeta?.classification || (item?.kind === 'world_doc' ? 'FIELD RECORD' : 'SECTOR 5 FILE')).slice(0, 36)
  );
  const stamp = item?.kind === 'world_doc' ? 'FIELD LOG' : (item?.id?.startsWith('XC') ? 'DECOY?' : 'VERIFIED');
  const rawBody = [
    ...(Array.isArray(item?.lines) ? item.lines : Array.isArray(disp.lines) ? disp.lines : []),
    ...(item?.body ? [item.body] : []),
    ...(Array.isArray(richMeta?.reportLines) ? richMeta.reportLines : Array.isArray(item?.reportLines) ? item.reportLines : []),
  ]
    .map(stripTestPrefix)
    .filter(Boolean)
    .join(' ');
  const bodyLines = wrapPreviewLines(rawBody || 'Inspect document text & telemetry details.', 40, 5);
  const lead = stripTestPrefix(item?.highlight || richMeta?.highlight || item?.secret?.note || '');
  const titleLines = wrapPreviewLines(title, 30, 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300" width="420" height="300">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e9efe4"/>
        <stop offset="100%" stop-color="#c9d7c5"/>
      </linearGradient>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#46684f" stroke-width="0.45" opacity="0.22"/>
      </pattern>
    </defs>
    <rect width="420" height="300" rx="6" fill="url(#bg)"/>
    <rect width="420" height="300" rx="6" fill="url(#grid)"/>
    <rect x="10" y="10" width="400" height="280" rx="4" fill="none" stroke="#2d4c36" stroke-width="1.4" opacity="0.5"/>
    <text x="24" y="34" font-family="Courier, monospace" font-size="10" font-weight="bold" fill="#2c5338" letter-spacing="1.2">${classification}</text>
    <text x="24" y="49" font-family="Courier, monospace" font-size="9" fill="#526a56">REF // ${idLabel}</text>
    <g transform="translate(302, 20) rotate(5)">
      <rect width="92" height="24" rx="3" fill="none" stroke="#8c1f1f" stroke-width="1.6" stroke-dasharray="3 2"/>
      <text x="46" y="16" font-family="Courier, monospace" font-size="10" font-weight="bold" text-anchor="middle" fill="#8c1f1f">${stamp}</text>
    </g>
    <line x1="24" y1="60" x2="396" y2="60" stroke="#2d4c36" stroke-width="1.1" opacity="0.55"/>
    ${titleLines.map((tl, idx) => `<text x="24" y="${82 + idx * 18}" font-family="Courier, monospace" font-size="14" font-weight="bold" fill="#132217">${escapeXml(tl)}</text>`).join('')}
    <line x1="24" y1="${82 + titleLines.length * 18}" x2="180" y2="${82 + titleLines.length * 18}" stroke="#8c1f1f" stroke-width="1.5" opacity="0.7"/>
    ${bodyLines.map((bl, idx) => `<text x="24" y="${124 + idx * 19}" font-family="Courier, monospace" font-size="11" fill="#1a2c20">${escapeXml(bl)}</text>`).join('')}
    ${lead ? `<rect x="20" y="232" width="380" height="44" rx="3" fill="#f7f1dd" stroke="#c0a878" stroke-width="1"/>
    <text x="32" y="250" font-family="Courier, monospace" font-size="9.5" font-weight="bold" fill="#6f1d1d">LEAD // FIELD NOTE:</text>
    <text x="32" y="266" font-family="Courier, monospace" font-size="9.5" fill="#2a1f14">${escapeXml(lead.slice(0, 56))}${lead.length > 56 ? '...' : ''}</text>` : ''}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function formatEvidenceBundleText(items = [], richMetaMap = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'SUBSTATION DELTA // SECTOR 5 — NO RECOVERED RECORDS YET';
  }
  return [
    '============================================================',
    'SUBSTATION DELTA // SECTOR 5 — COLLECTED FIELD ARCHIVE DUMP',
    `RECORDS COUNT: ${items.length}`,
    '============================================================',
    ...items.map((item, idx) => {
      const rich = (item?.id && richMetaMap[item.id]) || null;
      return `\n--- RECORD ${idx + 1} (${item.id || 'DOC'}) ---\n${formatDocumentText(item, rich)}`;
    }),
  ].join('\n');
}

export async function copyDocumentText(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to execCommand below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand?.('copy');
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch {
    return false;
  }
}

export function downloadDocumentFile(filename, content) {
  if (!content) return null;
  const safeName = filename || 'delta_evidence.txt';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.rel = 'noopener';
  a.style.position = 'fixed';
  a.style.left = '-9999px';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore cleanup failures
    }
  }, 4000);
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ctc:file-downloaded', { detail: { filename: safeName, bytes: content.length } })
    );
  }
  return { url, download: safeName };
}

