import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CSS_PATH = path.resolve('frontend/dist/assets/index-CrLqmHOp.css');
const cssContent = fs.readFileSync(CSS_PATH, 'utf8');

const CLUE_HINTS = [
  '',
  'Vault seal broken — proceed to the heavy bulkhead exit',
  'Terminal lockout triggered — reopen locked console to reboot & resume',
  'Terminals unlocked: Personnel DB (Control 5B), Radio Console (Wing 5C), Sound Analyser (Wing 5D)',
  'Sweep Control (5B), Radio Wing (5C), Cryo Brass Key (5E) & Relay Vault (5F) — 8 files left',
];

const NOTIFICATIONS = [
  'A burst of static hisses from the intercom speaker — then dead silence.',
  '⚠ GHOST TRACE — TERMINAL LOGGED: "Leon S. Kennedy"',
  'Chamber 3 is deadbolted — search the Cryo Autopsy Suite (North of Wing 5C) for the Containment Brass Key.',
  'The vault door disengages with a heavy magnetic thud. Advance into Room 6: The Anointing Vault.',
  'This terminal is locked. Collect all evidence fragments first.',
];

const VIEWPORTS = [
  { name: '4K Desktop', width: 3840, height: 2160 },
  { name: '1080p Desktop', width: 1920, height: 1080 },
  { name: '1440x900 Laptop', width: 1440, height: 900 },
  { name: '1280x720 Laptop', width: 1280, height: 720 },
  { name: '1024x768 iPad Landscape', width: 1024, height: 768 },
  { name: '768x1024 iPad Portrait', width: 768, height: 1024 },
  { name: '640x480 VGA / Small', width: 640, height: 480 },
  { name: '375x667 Mobile', width: 375, height: 667 },
];

function generateHtml(clueHint, notification) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${cssContent}
  </style>
</head>
<body class="relative w-full h-screen overflow-hidden select-none font-mono bg-black m-0 p-0">
  <!-- System notification toast -->
  ${notification ? `
  <div
    id="system-notification"
    class="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-md rounded-full px-5 py-2.5 backdrop-blur-md text-xs font-sans shadow-2xl flex items-center gap-2.5 animate-fade-in-fast"
    style="background: linear-gradient(90deg, rgba(20, 14, 14, 0.92) 0%, rgba(16, 13, 12, 0.72) 78%, rgba(16, 13, 12, 0.08) 100%); border-left: 2px solid rgba(184, 58, 58, 0.75); color: #f2eadc;"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-[#c94a4a] shrink-0"></span>
    <span id="notif-text">${notification}</span>
  </div>` : ''}

  <!-- HUD overlay container -->
  <div id="hud-container" class="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6 z-40">
    <div class="flex items-start justify-between w-full pointer-events-auto gap-4">
      <!-- Left: Borderless gothic smoke-fade objective strip + subtle clue hint -->
      <div
        id="hud-left-strip"
        class="pr-12 pl-3.5 py-2 rounded-r-full"
        style="background: linear-gradient(90deg, rgba(12, 10, 10, 0.8) 0%, rgba(12, 10, 10, 0.36) 76%, transparent 100%); border-left: 2px solid rgba(184, 58, 58, 0.72);"
      >
        <div id="room-title" class="font-re-display text-xs sm:text-sm font-bold tracking-[0.18em] text-[#f3ede0] uppercase">
          The Surveillance Morgue
        </div>
        <div
          id="objective-text"
          class="text-[11px] font-sans mt-0.5 tracking-wide text-[#d4c8ae]"
        >
          VAULT SEAL BROKEN — Exit through the Vault Door
        </div>
        ${clueHint ? `
        <div id="clue-hint" class="text-[10.5px] font-sans mt-1 text-[#b4a68e]/90 tracking-wide max-w-md">
          ${clueHint}
        </div>` : ''}
      </div>

      <!-- Right pills -->
      <div id="hud-right-pills" class="flex items-center gap-1.5 text-xs font-sans">
        <div class="re-btn !py-1 !px-2.5 !pr-4">B Files 8/8</div>
        <div class="re-btn !py-1 !px-2.5 !pr-4">C Dossier</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

let currentHtml = generateHtml('', '');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(currentHtml);
});

server.listen(9876, async () => {
  console.log('Test server listening on http://127.0.0.1:9876');

  const brave = spawn('/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://127.0.0.1:9876'
  ]);

  brave.stderr.on('data', () => {});

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error('No page target found');
    }

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const resolve = pending.get(data.id);
        pending.delete(data.id);
        resolve(data);
      }
    };

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    await new Promise(r => ws.onopen = r);

    console.log('\n======================================================');
    console.log('  RUNNING HUD ALERT CENTERING & OVERLAP EMPIRICAL MATRIX');
    console.log('======================================================\n');

    let totalTests = 0;
    let centeringPasses = 0;
    let overlapCount = 0;
    const overlapReports = [];

    for (const vp of VIEWPORTS) {
      console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);

      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });

      for (const hint of CLUE_HINTS) {
        for (const notif of NOTIFICATIONS) {
          totalTests++;
          currentHtml = generateHtml(hint, notif);
          await send('Page.reload');
          await new Promise(r => setTimeout(r, 80));

          const evalRes = await send('Runtime.evaluate', {
            expression: `(() => {
              const notifEl = document.getElementById('system-notification');
              const stripEl = document.getElementById('hud-left-strip');
              const titleEl = document.getElementById('room-title');
              const objEl = document.getElementById('objective-text');
              const clueEl = document.getElementById('clue-hint');
              const rightEl = document.getElementById('hud-right-pills');

              if (!notifEl || !stripEl) return null;

              const notifRect = notifEl.getBoundingClientRect();
              const stripRect = stripEl.getBoundingClientRect();
              const titleRect = titleEl ? titleEl.getBoundingClientRect() : null;
              const objRect = objEl ? objEl.getBoundingClientRect() : null;
              const clueRect = clueEl ? clueEl.getBoundingClientRect() : null;
              const rightRect = rightEl ? rightEl.getBoundingClientRect() : null;

              const notifComputed = window.getComputedStyle(notifEl);
              const transform = notifComputed.transform;

              const notifCenterX = notifRect.x + notifRect.width / 2;
              const expectedCenterX = window.innerWidth / 2;
              const centerDelta = Math.abs(notifCenterX - expectedCenterX);

              const overlap = (r1, r2) => {
                if (!r1 || !r2) return false;
                return !(r1.right <= r2.left || r1.left >= r2.right || r1.bottom <= r2.top || r1.top >= r2.bottom);
              };

              return {
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                notifRect: { x: notifRect.x, y: notifRect.y, w: notifRect.width, h: notifRect.height, right: notifRect.right, bottom: notifRect.bottom },
                stripRect: { x: stripRect.x, y: stripRect.y, w: stripRect.width, h: stripRect.height, right: stripRect.right, bottom: stripRect.bottom },
                centerDelta,
                transform,
                overlapWithStrip: overlap(notifRect, stripRect),
                overlapWithTitle: overlap(notifRect, titleRect),
                overlapWithObj: overlap(notifRect, objRect),
                overlapWithClue: overlap(notifRect, clueRect),
                overlapWithRightPills: overlap(notifRect, rightRect)
              };
            })()`,
            returnByValue: true
          });

          const data = evalRes.result?.result?.value;
          if (!data) {
            console.error('Failed to get layout data:', JSON.stringify(evalRes));
            continue;
          }

          const isCentered = data.centerDelta <= 1.5;
          if (isCentered) centeringPasses++;
          else {
            console.error(`  [FAIL] Centering error on ${vp.name}: center delta = ${data.centerDelta}px (transform: ${data.transform})`);
          }

          const hasOverlap = data.overlapWithStrip || data.overlapWithTitle || data.overlapWithObj || data.overlapWithClue;
          if (hasOverlap) {
            overlapCount++;
            overlapReports.push({
              vp: vp.name,
              width: vp.width,
              hintLen: hint.length,
              notifLen: notif.length,
              data
            });
          }
        }
      }
      console.log(`  Centering pass rate: ${centeringPasses}/${totalTests}`);
      console.log(`  Overlaps so far: ${overlapCount}`);
    }

    console.log('\n======================================================');
    console.log(`RESULTS: Total Tests: ${totalTests}`);
    console.log(`Centering Verified (translate(-50%)): ${centeringPasses} / ${totalTests} (100% = ${centeringPasses === totalTests})`);
    console.log(`Overlaps with Top-Left Strip: ${overlapCount}`);
    if (overlapReports.length > 0) {
      console.log('\nOVERLAP DETAILS:');
      for (const rep of overlapReports) {
        console.log(`  Viewport ${rep.vp} (${rep.width}px) [hintLen: ${rep.hintLen}, notifLen: ${rep.notifLen}]:`);
        console.log(`    Strip: left=${rep.data.stripRect.x.toFixed(1)}, right=${rep.data.stripRect.right.toFixed(1)}, top=${rep.data.stripRect.y.toFixed(1)}, bottom=${rep.data.stripRect.bottom.toFixed(1)}`);
        console.log(`    Notif: left=${rep.data.notifRect.x.toFixed(1)}, right=${rep.data.notifRect.right.toFixed(1)}, top=${rep.data.notifRect.y.toFixed(1)}, bottom=${rep.data.notifRect.bottom.toFixed(1)}`);
        console.log(`    Overlap: strip.right (${rep.data.stripRect.right.toFixed(1)}) > notif.left (${rep.data.notifRect.x.toFixed(1)})`);
        console.log(`    Overlap with Title: ${rep.data.overlapWithTitle}, Obj: ${rep.data.overlapWithObj}, Clue: ${rep.data.overlapWithClue}`);
      }
    }
    console.log('======================================================\n');

    ws.close();
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    brave.kill('SIGKILL');
    server.close();
  }
});
