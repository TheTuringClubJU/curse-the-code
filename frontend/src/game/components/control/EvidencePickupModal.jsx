import React, { useEffect } from 'react';
import {
  formatDocumentText,
  sanitizeExportFilename,
} from '../../engine/evidenceExport';
import OpenJournalSpread from './OpenJournalSpread';
import { resolveJournalProfile } from './journalProfile';
import {
  cleanTerminalDisplayName,
  LOCKED_TERMINAL_NOTES,
  resolveSealedSpecimenLead,
  resolveUnsealedEvidenceGuide,
} from './deltaClueGuides';

// Unified Open Field-Journal Inspection Modal for:
// 1. Evidence Fragment recoveries (sealed & unsealed) with live 3D object Polaroids
// 2. Locked Clue Terminal & Sequence Gate prompts
// 3. Environmental field notes, logs, clipboards, and hardware inspections
export default function EvidencePickupModal({ modalData, onClose }) {
  useEffect(() => {
    if (!modalData) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalData, onClose]);

  if (!modalData) return null;

  // ── Mode 1: Recovered Evidence Fragment ───────────────────────────────────
  if (modalData.type === 'evidence' && modalData.evidence) {
    const ev = modalData.evidence;
    const disp = ev.display || {};
    const isWrapped = Boolean(ev.is_wrapped);
    const totalCount = modalData.totalCount ?? 10;
    const collectedCount = modalData.collectedCount ?? 1;
    const sourceName = modalData.sourceName || 'Field Container';
    const remainingHere = modalData.remainingHere ?? 0;
    const sealedLead = isWrapped ? resolveSealedSpecimenLead(Math.max(0, collectedCount - 1)) : null;
    const unsealedGuide = !isWrapped ? resolveUnsealedEvidenceGuide(ev) : null;

    const bundledList =
      Array.isArray(modalData.bundledEvidence) && modalData.bundledEvidence.length > 0
        ? modalData.bundledEvidence
        : [ev];
    const hasBundledMulti = !isWrapped && bundledList.length > 1;

    const title = isWrapped
      ? `Tamper-Sealed Evidence #${collectedCount}`
      : hasBundledMulti
      ? `${sourceName} — ${bundledList.length} Records Recovered`
      : (disp.title || ev.title || ev.id);

    const classification = isWrapped
      ? 'EVIDENCE RECOVERED // PLACED IN BASKET [B]'
      : hasBundledMulti
      ? `EVIDENCE BUNDLE FILED (${bundledList.map((b) => b.id).join(' · ')})`
      : `EVIDENCE FRAGMENT FILED // ${ev.clue_id || 'SECTOR 5'}`;

    const lines = isWrapped
      ? [
          `Recovery Note (${sourceName}): Filed inside Evidence Basket [B].`,
          `${sealedLead.code} (${sealedLead.badgeLabel})`,
          ...sealedLead.lines,
        ]
      : hasBundledMulti
      ? bundledList.flatMap((item, idx) => {
          const itemDisp = item.display || {};
          const itemLines = Array.isArray(itemDisp.lines) ? itemDisp.lines : (Array.isArray(item.lines) ? item.lines : []);
          return [
            `[Record ${idx + 1}/${bundledList.length}: ${itemDisp.title || item.id}]`,
            ...itemLines,
          ];
        })
      : (Array.isArray(disp.lines) ? disp.lines : (Array.isArray(ev.lines) ? ev.lines : []));

    const baseReportLines = !isWrapped && Array.isArray(ev.reportLines) ? ev.reportLines : [];
    const bundledGuides = !isWrapped
      ? bundledList.flatMap((item) => resolveUnsealedEvidenceGuide(item)?.reportLines || [])
      : [];
    const reportLines = isWrapped
      ? sealedLead.reportLines
      : bundledGuides.length > 0
      ? [...baseReportLines, ...bundledGuides]
      : unsealedGuide
      ? [...baseReportLines, ...unsealedGuide.reportLines]
      : baseReportLines;

    const profile = resolveJournalProfile({
      objectId: modalData.objectId || '',
      kind: 'evidence',
      id: ev.id,
      title,
      classification,
      isWrapped,
      sourceName,
      collectedCount,
      totalCount,
      highlight: isWrapped ? sealedLead.highlight : (ev.highlight || disp.highlight),
      lines,
    });

    const receiptPayload = isWrapped
      ? {
          id: `SEALED-${collectedCount}`,
          title,
          classification,
          location: sourceName,
          lines: [...lines, ...reportLines],
          highlight: sealedLead.highlight,
        }
      : {
          ...ev,
          title,
          classification,
          location: ev.location || sourceName,
          lines,
          reportLines,
          highlight: ev.highlight || disp.highlight,
        };

    const exportText = formatDocumentText(receiptPayload);
    const filename = sanitizeExportFilename(isWrapped ? `sealed_${collectedCount}` : ev.id, title);

    return (
      <OpenJournalSpread
        classification={classification}
        cornerMark={isWrapped ? `SPECIMEN #${collectedCount}` : (disp.corner_mark || `REF // ${ev.id}`)}
        location={isWrapped ? sourceName : (ev.location || sourceName)}
        statusTag={`${collectedCount}/${totalCount} Logged`}
        sealLabel={isWrapped ? 'TAMPER SEAL' : 'EVIDENCE'}
        title={title}
        writeup={profile.writeup}
        lines={lines}
        reportLines={reportLines}
        fontClass={profile.fontClass}
        polaroidSrc={modalData.snapshotUrl || ''}
        polaroidAlt={sourceName}
        polaroidFallbackData={receiptPayload}
        polaroidCaption={profile.caption}
        isLockedOverlay={isWrapped}
        exportText={exportText}
        exportFilename={filename}
        copyLabel="Copy Content"
        downloadLabel="Download File"
        closeLabel="Continue"
        onClose={onClose}
      />
    );
  }

  // ── Mode 2: Locked Terminal / Sequential Containment Interlock ──────────────
  if (modalData.type === 'locked_terminal' || modalData.type === 'sequence_locked') {
    const isTerminal = modalData.type === 'locked_terminal';
    const collectedCount = modalData.collectedCount ?? 0;
    const totalCount = modalData.totalCount ?? 10;
    const remainingCount = Math.max(0, totalCount - collectedCount);
    const subjectName = cleanTerminalDisplayName(
      modalData.terminalName || modalData.propName || 'Sector Access Lock',
      modalData.objectId || ''
    );
    const terminalNote = LOCKED_TERMINAL_NOTES[modalData.objectId || ''];

    const title = isTerminal
      ? `Terminal Restricted — ${subjectName}`
      : 'Compartment Sealed';

    const requirementLine = isTerminal
      ? `This terminal requires all ${totalCount} fragments recovered (${collectedCount}/${totalCount} recovered; ${remainingCount} remaining).`
      : `Access to ${subjectName} is sealed pending earlier sector records (${collectedCount}/${totalCount} recovered; ${remainingCount} remaining).`;

    const locationsLine =
      'Active Search Locations: Explore all dark wings, equipment stations, and recessed fixtures across Substation Delta — compartments are unmarked on schematics.';

    const highlightCaption =
      terminalNote?.highlight ||
      'Control Bay 5B steel doors stop pursuit whenever lights flicker across outer corridors.';

    const leadsPayload = {
      id: isTerminal ? 'SYS-INTERLOCK' : 'SEQ-INTERLOCK',
      title: `Substation Delta — ${subjectName}`,
      classification: 'INVESTIGATION STATUS & UNCLEARED LOCATIONS',
      location: 'Control Room 5B // Sector 5 Substation Delta',
      lines: [requirementLine, locationsLine],
      highlight: highlightCaption,
    };

    const profile = resolveJournalProfile({
      objectId: modalData.objectId || '',
      kind: 'locked',
      title,
      classification: leadsPayload.classification,
      isLocked: true,
      sourceName: subjectName,
      collectedCount,
      totalCount,
      highlight: highlightCaption,
      lines: leadsPayload.lines,
    });

    const lockedReportLines = [
      terminalNote?.excerpt ||
        'Technician Slip: "Sweep Sub-Level 2 in sequence — each recovered parcel in Basket [B] holds marginalia tying the Staff Registry, Channel 7 wires, and the Voice Machine together."',
    ];

    return (
      <OpenJournalSpread
        classification={isTerminal ? 'SECURITY INTERLOCK // POWER HOLD' : 'SEQUENTIAL ACCESS INTERLOCK'}
        cornerMark={`LOCK-${collectedCount}/${totalCount}`}
        location={subjectName}
        statusTag={`${collectedCount}/${totalCount} Collected`}
        sealLabel="LOCKED"
        title={title}
        writeup=""
        lines={leadsPayload.lines}
        reportLines={lockedReportLines}
        fontClass={profile.fontClass}
        polaroidSrc={modalData.snapshotUrl || ''}
        polaroidAlt={subjectName}
        polaroidFallbackData={leadsPayload}
        polaroidCaption={profile.caption}
        isLockedOverlay={true}
        exportText={formatDocumentText({ ...leadsPayload, reportLines: lockedReportLines })}
        exportFilename={sanitizeExportFilename('substation_leads', subjectName)}
        copyLabel="Copy Content"
        downloadLabel="Download File"
        closeLabel="Continue Search"
        onClose={onClose}
      />
    );
  }

  // ── Mode 3: Field Documents, Logs, Clipboards & Prop Inspections ──────────
  const doc = modalData;
  const rawLines = Array.isArray(doc.lines) ? doc.lines : (Array.isArray(doc.display?.lines) ? doc.display.lines : []);
  const lines = rawLines.map((l) => String(l).replace(/^TEST:\s*/i, ''));
  const baseDocReportLines = Array.isArray(doc.reportLines) ? doc.reportLines : [];
  const docCrossRef = resolveUnsealedEvidenceGuide(doc);
  const reportLines = docCrossRef ? [...baseDocReportLines, ...docCrossRef.reportLines] : baseDocReportLines;
  const docTitle = (doc.title || doc.display?.title || doc.id || 'Field Record').replace(/^TEST:\s*/i, '');
  const classification = doc.classification || (doc.kind === 'ambient_note' ? 'ENVIRONMENTAL RECORD' : 'CLASSIFIED RECORD');
  const highlightText = doc.highlight || (doc.kind === 'ambient_note'
    ? 'Environmental substation record — explore Wings 5B–5F and inspect Evidence Basket [B].'
    : 'Filed in Evidence Basket [B] for terminal cross-reference.');

  const profile = resolveJournalProfile({
    objectId: doc.objectId || '',
    kind: doc.kind || 'world_doc',
    id: doc.id || '',
    title: docTitle,
    classification,
    sourceName: doc.location || docTitle,
    highlight: highlightText,
    lines,
  });

  const formattedDocText = formatDocumentText({ ...doc, title: docTitle, lines, highlight: highlightText });
  const exportFilename = sanitizeExportFilename(doc.id, docTitle);

  return (
    <OpenJournalSpread
      classification={classification}
      cornerMark={doc.display?.corner_mark || doc.id || 'FIELD-LOG'}
      location={doc.location || 'Substation Delta // Sector 5'}
      statusTag={doc.kind === 'ambient_note' ? 'AMBIENT PROP' : 'FILED IN [B]'}
      sealLabel={profile.sealLabel}
      title={docTitle}
      writeup={profile.writeup}
      lines={lines}
      reportLines={reportLines}
      fontClass={profile.fontClass}
      polaroidSrc={doc.snapshotUrl || ''}
      polaroidAlt={docTitle}
      polaroidFallbackData={doc}
      polaroidCaption={profile.caption}
      exportText={formattedDocText}
      exportFilename={exportFilename}
      copyLabel="Copy Content"
      downloadLabel="Download File"
      closeLabel="Close"
      onClose={onClose}
    />
  );
}
