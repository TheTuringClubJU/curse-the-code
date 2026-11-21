// Adaptive typography, concise contextual write-ups, and Polaroid caption helpers
// for Substation Delta's Open Field-Journal UI.

const TECH_OBJECT_IDS = new Set([
  'radio_console',
  'sound_console',
  'relay_rack',
  'fuse_box',
  'cable_trench',
  'wall_breaker',
  'security_camera',
  'aux_generator',
  'containment_key',
  'ringing_phone',
]);

const EDITORIAL_OBJECT_IDS = new Set([
  'chamber3_autopsy',
  'containment_protocol',
  'autopsy_gurney',
  'scalpel_prop',
]);

const HANDWRITTEN_OBJECT_IDS = new Set([
  'sofa_alcove',
  'crowbar_prop',
  'annex_locker',
  'wooden_crates',
  'caution_pit',
  'operator_chair',
  'tape_deck_cart',
]);

const CLEAN_LINE = (str) => String(str ?? '').replace(/^TEST:\s*/i, '').trim();

export function resolveJournalProfile({
  objectId = '',
  kind = '',
  id = '',
  title = '',
  classification = '',
  isWrapped = false,
  isLocked = false,
  sourceName = '',
  collectedCount = 0,
  totalCount = 10,
  highlight = '',
  lines = [],
}) {
  const normObj = String(objectId || '').toLowerCase();
  const normId = String(id || '').toUpperCase();
  const normTitle = String(title || '');
  const normClass = String(classification || '');

  // Unified readable archival Courier Prime sizing across all documents & clues
  let fontClass = 'font-journal-typewriter text-[13.5px] leading-[1.65]';
  let fontMode = 'typewriter';
  let sealLabel = 'LOGGED';

  if (TECH_OBJECT_IDS.has(normObj) || /^EC0[1-3]$/.test(normId) || /signal|freq|relay|fuse|breaker|power|trench|camera/i.test(`${normTitle} ${normClass}`)) {
    fontClass = 'font-journal-tech text-[13.5px] leading-[1.65]';
    fontMode = 'tech';
    sealLabel = isWrapped ? 'SEALED' : 'TELEMETRY';
  } else if (
    EDITORIAL_OBJECT_IDS.has(normObj) ||
    /autopsy|specimen|protocol|order|containment|medical/i.test(`${normTitle} ${normClass}`)
  ) {
    fontClass = 'font-journal-editorial text-[13.5px] leading-[1.65]';
    fontMode = 'editorial';
    sealLabel = isWrapped ? 'SEALED' : 'DIRECTIVE';
  } else if (
    HANDWRITTEN_OBJECT_IDS.has(normObj) ||
    /locker|sofa|crate|pit|chair|pry bar|crowbar|reel|deck/i.test(`${normTitle} ${normClass} ${sourceName}`)
  ) {
    fontClass = 'font-journal-hand text-[13.5px] leading-[1.65]';
    fontMode = 'handwritten';
    sealLabel = isWrapped ? 'SEALED' : 'FIELD NOTE';
  } else if (isWrapped) {
    fontClass = 'font-journal-editorial text-[13.5px] leading-[1.65]';
    fontMode = 'editorial';
    sealLabel = 'TAMPER SEAL';
  } else if (isLocked) {
    fontClass = 'font-journal-typewriter text-[13.5px] leading-[1.65]';
    fontMode = 'typewriter';
    sealLabel = 'LOCKED';
  } else if (kind === 'evidence' || /^EC\d+/.test(normId)) {
    sealLabel = 'EVIDENCE';
  } else if (normId.startsWith('XC')) {
    sealLabel = 'DISCARD';
  }

  // Distinct contextual note only when helpful (never duplicating verbatim lines[0])
  const cleanSource = CLEAN_LINE(sourceName || objectId.replace(/_/g, ' '));
  const hasDocumentLines = Array.isArray(lines) && lines.filter(Boolean).length > 0;
  let writeup = '';

  if ((isWrapped || isLocked) && hasDocumentLines) {
    writeup = '';
  } else if (isWrapped) {
    writeup = `Recovered from ${cleanSource || 'this bunker fixture'} (${collectedCount} of ${totalCount} logged).`;
  } else if (isLocked) {
    writeup = `Containment interlock active (${collectedCount} of ${totalCount} fragments filed).`;
  } else if (!hasDocumentLines && (kind === 'evidence' || /^EC|^XC/.test(normId))) {
    writeup = `Archived evidence from ${cleanSource || 'Substation Delta'}. Cross-check against the three Sector 5 terminals.`;
  } else if (!hasDocumentLines) {
    writeup = `Field observation recorded inside Sub-Level 2 of Substation Delta.`;
  }

  // Concise torn charcoal tape caption under Polaroid on the right page (without repeating title)
  const caption =
    CLEAN_LINE(highlight) ||
    (isWrapped
      ? `Field snapshot captured on-site. Tamper seal releases at ${totalCount}/${totalCount} fragments.`
      : isLocked
      ? `Security interlock active until all ${totalCount} sector fragments are logged in Basket [B].`
      : `Substation Delta // Sector 5 Archive`);

  return {
    fontClass,
    fontMode,
    sealLabel,
    writeup,
    caption,
    watermarkText: 'SUBSTATION DELTA',
  };
}
