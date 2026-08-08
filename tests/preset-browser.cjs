const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const chromiumPath = process.env.CHROMIUM_PATH || '/tmp/chromium';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function contentType(file) {
    const ext = path.extname(file);
    if (ext === '.html') return 'text/html; charset=utf-8';
    if (ext === '.js') return 'application/javascript; charset=utf-8';
    if (ext === '.mp3') return 'audio/mpeg';
    return 'application/octet-stream';
}

async function startServer() {
    const server = http.createServer((request, response) => {
        const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
        const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
        const file = path.resolve(root, relative);
        if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) {
            response.writeHead(404).end('Not found');
            return;
        }
        response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
        fs.createReadStream(file).pipe(response);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return server;
}

async function main() {
    const server = await startServer();
    const browser = await puppeteer.launch({
        executablePath: chromiumPath,
        headless: true,
        args: [
            '--no-sandbox',
            '--autoplay-policy=no-user-gesture-required',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
        ],
        defaultViewport: { width: 1080, height: 900, deviceScaleFactor: 1 },
    });

    try {
        const page = await browser.newPage();
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.stack || error.message));
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) request.abort();
            else request.continue();
        });
        await page.goto(`http://127.0.0.1:${server.address().port}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });
        await page.waitForFunction(() => window.drumMachine?.presetLibrary &&
            document.querySelectorAll('.music-preset-card').length > 0);

        const result = await page.evaluate(async () => {
            const machine = window.drumMachine;
            const library = machine.presetLibrary;
            const loops = machine.loopLibrary;
            await machine.audioContext.resume();
            localStorage.removeItem(window.BeatboxLoopLibrary.STORAGE_KEY);
            history.replaceState(null, '', location.pathname);

            const normalized = library.presets.map(preset => loops.normalizeState(library.presetToState(preset)));
            const fingerprints = normalized.map(state => JSON.stringify({
                gridMode: state.gridMode,
                kit: state.kit,
                tempo: state.tempo,
                swing: state.swing,
                pattern: state.pattern,
                synth: state.synth,
            }));
            const integrity = {
                count: library.presets.length,
                ids: library.presets.map(preset => preset.id),
                normalized: normalized.every(Boolean),
                uniqueFingerprints: new Set(fingerprints).size,
                has80sPopPreset: library.presets.some(preset => preset.category === '80s Pop'),
                hasContent: normalized.every(state =>
                    Object.values(state.pattern).some(row => row.some(Boolean)) &&
                    state.synth.pattern.some(row => row != null)
                ),
            };

            const historyBefore = localStorage.getItem(window.BeatboxLoopLibrary.STORAGE_KEY);
            const hashBefore = location.hash;
            const loaded = library.loadPreset(0);
            const firstState = loops.collectState();
            const firstCard = document.querySelector('[data-preset-index="0"]');
            const individualLoad = {
                loaded,
                playing: machine.isPlaying,
                listening: library.listening,
                tempo: machine.tempo,
                swing: machine.swing,
                kit: machine.kit,
                gridMode: machine.gridMode,
                stateMatches: JSON.stringify(firstState) === JSON.stringify(normalized[0]),
                current: firstCard.getAttribute('aria-current'),
                historyUnchanged: localStorage.getItem(window.BeatboxLoopLibrary.STORAGE_KEY) === historyBefore,
                hashUnchanged: location.hash === hashBefore,
            };

            machine.pattern.Q[0] = true;
            machine.bassPattern[0] = 0;
            machine.queueGeneratedLoopSave();
            const autoSaveWasPending = machine.loopLibrarySaveTimer != null;
            library.loadPreset(1);
            await new Promise(resolve => setTimeout(resolve, 420));
            const pendingAutoSave = {
                wasPending: autoSaveWasPending,
                cleared: machine.loopLibrarySaveTimer == null,
                historyUnchanged: localStorage.getItem(window.BeatboxLoopLibrary.STORAGE_KEY) === historyBefore,
                hashUnchanged: location.hash === hashBefore,
            };

            machine.setMode('custom');
            const customRows = document.querySelectorAll('#beatGrid > [role="row"]').length;
            library.loadPreset(0);
            const switchedFromCustom = {
                mode: machine.mode,
                customRows,
                normalRows: document.querySelectorAll('#beatGrid > [role="row"]').length,
                normalControlsVisible: getComputedStyle(document.getElementById('normalModeControls')).display !== 'none',
                customControlsHidden: [...document.querySelectorAll('.custom-mode-only')]
                    .every(element => getComputedStyle(element).display === 'none'),
            };

            const sixteenStepDuration = machine.getStepDurationSeconds(0);
            library.loadPreset(5);
            const tripletStepDuration = machine.getStepDurationSeconds(0);
            const durationChecks = {
                sixteenStepDuration,
                expectedSixteen: 60 / 117 / 4 * 1.02,
                tripletStepDuration,
                expectedTriplet: 60 / 112 / 3,
            };

            await library.startListening(5);
            clearInterval(machine.intervalId);
            machine.intervalId = null;
            library.completedLoops = 0;
            library.noteScheduledLoopEnd(machine.playbackRunToken);
            const tripletBarsPerLoop = library.completedLoops;
            library.stopListening({ restore: true, stopPlayback: true, silent: true });

            machine.stopPlayback();
            machine.setGridMode('16');
            machine.clearBeat();
            machine.pattern.Q[1] = true;
            machine.pattern.W[6] = true;
            machine.tempo = 133;
            machine.swing = 17;
            machine.bassScale = 'majorPent';
            machine.bassRootNote = 3;
            machine.bassOctave = 2;
            machine.bassWave = 'triangle';
            machine.buildSynthScale();
            machine.bassPattern = Array(16).fill(null);
            machine.bassPattern[2] = 1;
            const workspaceBeforeListening = loops.collectState();

            await library.startListening(0);
            clearInterval(machine.intervalId);
            machine.intervalId = null;
            const runToken = machine.playbackRunToken;
            const firstPresetBars = library.presets[0].listenBars;
            for (let count = 0; count < firstPresetBars; count += 1) {
                library.noteScheduledLoopEnd(runToken);
            }
            const beforeBoundary = {
                index: library.activeIndex,
                pending: library.pendingAdvance,
                playing: machine.isPlaying,
                listening: library.listening,
            };
            const transitioned = library.prepareScheduledStep(0, runToken, machine.audioContext.currentTime + 0.04);
            const afterBoundary = {
                transitioned,
                index: library.activeIndex,
                name: library.presets[library.activeIndex].name,
                playing: machine.isPlaying,
                listening: library.listening,
                summary: document.getElementById('presetMenuLabel').textContent,
            };
            library.stopListening({ restore: true, stopPlayback: true });
            const workspaceAfterRestore = loops.collectState();

            const workspaceBeforeCardJump = loops.collectState();
            const hashBeforeCardJump = location.hash;
            history.replaceState(null, '', `${location.pathname}${location.search}#workspace-anchor`);
            await library.startListening(0);
            const savedStateBeforeJump = library.savedState;
            history.replaceState(null, '', `${location.pathname}${location.search}#temporary-preset-link`);
            library.loadPreset(2);
            const cardJump = {
                index: library.activeIndex,
                listening: library.listening,
                playing: machine.isPlaying,
                snapshotPreserved: library.savedState === savedStateBeforeJump,
            };
            library.stopListening({ restore: true, stopPlayback: true, silent: true });
            cardJump.workspaceRestored = JSON.stringify(loops.collectState()) === JSON.stringify(workspaceBeforeCardJump);
            cardJump.hashRestored = location.hash === '#workspace-anchor';
            history.replaceState(null, '', `${location.pathname}${location.search}${hashBeforeCardJump}`);

            await library.startListening(0);
            await library.togglePause();
            const paused = { listening: library.listening, playing: machine.isPlaying, index: library.activeIndex };
            library.skip(1);
            const skippedWhilePaused = { listening: library.listening, playing: machine.isPlaying, index: library.activeIndex };
            await library.togglePause();
            library.skip(-1);
            const resumedAndPrevious = { listening: library.listening, playing: machine.isPlaying, index: library.activeIndex };
            library.stopListening({ restore: true, stopPlayback: true, silent: true });
            const listeningControls = { paused, skippedWhilePaused, resumedAndPrevious };

            await library.startListening(0);
            clearInterval(machine.intervalId);
            machine.intervalId = null;
            const editedStepBefore = Boolean(machine.pattern.Q[0]);
            machine.toggleBeat('Q', 0);
            const editProtection = {
                listening: library.listening,
                playing: machine.isPlaying,
                changedOnce: Boolean(machine.pattern.Q[0]) === !editedStepBefore,
                savedStateCleared: library.savedState === null,
                activeIndex: library.activeIndex,
            };

            const workspaceBeforeGlobalStop = loops.collectState();
            await library.startListening(0);
            const globalStopResult = await machine.togglePlayback();
            const globalStop = {
                result: globalStopResult,
                listening: library.listening,
                playing: machine.isPlaying,
                activeIndex: library.activeIndex,
                savedStateCleared: library.savedState === null,
                workspaceRestored: JSON.stringify(loops.collectState()) === JSON.stringify(workspaceBeforeGlobalStop),
            };

            await library.startListening(4);
            clearInterval(machine.intervalId);
            machine.intervalId = null;
            const transitionToken = machine.playbackRunToken;
            for (let count = 0; count < library.presets[4].listenBars; count += 1) {
                library.noteScheduledLoopEnd(transitionToken);
            }
            library.prepareScheduledStep(0, transitionToken, machine.audioContext.currentTime + 0.5);
            library.keepCurrentForEditing();
            const transitionStopSync = {
                machineGrid: machine.gridMode,
                beatColumns: document.querySelectorAll('#beatGrid .step-num').length,
                synthColumns: document.querySelectorAll('#synthGrid .step-num').length,
                machineTempo: machine.tempo,
                controlTempo: document.getElementById('tempo').value,
                machineKit: machine.kit,
                activeKit: document.querySelector('.kit-btn.active')?.dataset.kit,
                pendingVisualRender: library.visualTransitionTimer != null,
            };

            const lastPreset = library.presets.length - 1;
            const originalListenBars = library.presets[lastPreset].listenBars;
            library.presets[lastPreset].listenBars = 1;
            await library.startListening(lastPreset);
            const wrapDeadline = performance.now() + 5000;
            while (library.activeIndex === lastPreset && performance.now() < wrapDeadline) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            const realSchedulerWrap = {
                index: library.activeIndex,
                name: library.presets[library.activeIndex].name,
                listening: library.listening,
                playing: machine.isPlaying,
            };
            library.stopListening({ restore: true, stopPlayback: true, silent: true });
            library.presets[lastPreset].listenBars = originalListenBars;

            const context = machine.audioContext;
            const originalOwnState = Object.getOwnPropertyDescriptor(context, 'state');
            const originalOwnResume = Object.getOwnPropertyDescriptor(context, 'resume');
            let releaseResume;
            Object.defineProperty(context, 'state', { configurable: true, get: () => 'suspended' });
            Object.defineProperty(context, 'resume', {
                configurable: true,
                value: () => new Promise(resolve => { releaseResume = resolve; }),
            });
            const delayedStart = library.startListening(0);
            await Promise.resolve();
            library.stopListening({ restore: true, stopPlayback: true, silent: true });
            releaseResume();
            await delayedStart;
            const delayedResumeRace = {
                listening: library.listening,
                playing: machine.isPlaying,
                autoSaveSuspended: machine.suspendLoopAutoSave,
            };

            Object.defineProperty(context, 'resume', {
                configurable: true,
                value: () => Promise.reject(new Error('blocked for test')),
            });
            await library.startListening(0);
            const rejectedResume = {
                listening: library.listening,
                playing: machine.isPlaying,
                autoSaveSuspended: machine.suspendLoopAutoSave,
                status: document.getElementById('status').textContent,
            };
            if (originalOwnState) Object.defineProperty(context, 'state', originalOwnState);
            else delete context.state;
            if (originalOwnResume) Object.defineProperty(context, 'resume', originalOwnResume);
            else delete context.resume;

            machine.stopPlayback();
            return {
                integrity,
                individualLoad,
                pendingAutoSave,
                switchedFromCustom,
                durationChecks,
                tripletBarsPerLoop,
                beforeBoundary,
                afterBoundary,
                workspaceRestored: JSON.stringify(workspaceAfterRestore) === JSON.stringify(workspaceBeforeListening),
                cardJump,
                listeningControls,
                editProtection,
                globalStop,
                transitionStopSync,
                realSchedulerWrap,
                delayedResumeRace,
                rejectedResume,
                menu: {
                    tagName: document.getElementById('musicPresetMenu').tagName,
                    defaultClosed: !document.getElementById('musicPresetMenu').open,
                    cards: document.querySelectorAll('.music-preset-card').length,
                    listenPressed: document.getElementById('listenAllBtn').getAttribute('aria-pressed'),
                    liveRegion: document.getElementById('presetLiveStatus').getAttribute('aria-live'),
                },
            };
        });

        assert(result.integrity.count >= 8, `too few music presets: ${result.integrity.count}`);
        assert(new Set(result.integrity.ids).size === result.integrity.count, 'preset IDs are not unique');
        assert(result.integrity.normalized, 'a preset failed loop-library normalization');
        assert(result.integrity.uniqueFingerprints === result.integrity.count, 'preset states are duplicated');
        assert(result.integrity.has80sPopPreset, '80s pop preset is missing');
        assert(result.integrity.hasContent, 'a preset is missing drums or bass');
        assert(result.individualLoad.loaded && !result.individualLoad.playing && !result.individualLoad.listening,
            `individual preset load started playback: ${JSON.stringify(result.individualLoad)}`);
        assert(result.individualLoad.tempo === 117 && result.individualLoad.swing === 2 &&
            result.individualLoad.kit === 'electro' && result.individualLoad.gridMode === '16',
            `first preset controls are wrong: ${JSON.stringify(result.individualLoad)}`);
        assert(result.individualLoad.stateMatches && result.individualLoad.current === 'true',
            `first preset UI/state mismatch: ${JSON.stringify(result.individualLoad)}`);
        assert(result.individualLoad.historyUnchanged && result.individualLoad.hashUnchanged,
            'preset load changed saved history or the share URL');
        assert(result.pendingAutoSave.wasPending && result.pendingAutoSave.cleared &&
            result.pendingAutoSave.historyUnchanged && result.pendingAutoSave.hashUnchanged,
            `a pending generated-loop save captured the preset: ${JSON.stringify(result.pendingAutoSave)}`);
        assert(result.switchedFromCustom.mode === 'normal' && result.switchedFromCustom.normalRows === 16 &&
            result.switchedFromCustom.normalRows > result.switchedFromCustom.customRows &&
            result.switchedFromCustom.normalControlsVisible && result.switchedFromCustom.customControlsHidden,
            `preset did not rebuild the normal editor from custom mode: ${JSON.stringify(result.switchedFromCustom)}`);
        assert(Math.abs(result.durationChecks.sixteenStepDuration - result.durationChecks.expectedSixteen) < 0.000001,
            `16-step duration changed: ${JSON.stringify(result.durationChecks)}`);
        assert(Math.abs(result.durationChecks.tripletStepDuration - result.durationChecks.expectedTriplet) < 0.000001,
            `24-step triplet duration is wrong: ${JSON.stringify(result.durationChecks)}`);
        assert(result.tripletBarsPerLoop === 2,
            `24-step listening progress does not count two bars per loop: ${result.tripletBarsPerLoop}`);
        assert(result.beforeBoundary.index === 0 && result.beforeBoundary.pending &&
            result.beforeBoundary.playing && result.beforeBoundary.listening,
            `listening did not wait for the loop boundary: ${JSON.stringify(result.beforeBoundary)}`);
        assert(result.afterBoundary.transitioned && result.afterBoundary.index === 1 &&
            result.afterBoundary.playing && result.afterBoundary.listening && result.afterBoundary.summary === '2/9',
            `playlist did not advance at the boundary: ${JSON.stringify(result.afterBoundary)}`);
        assert(result.workspaceRestored, 'stopping listening mode did not restore the previous workspace');
        assert(result.cardJump.index === 2 && result.cardJump.listening && result.cardJump.playing &&
            result.cardJump.snapshotPreserved && result.cardJump.workspaceRestored && result.cardJump.hashRestored,
            `choosing a preset during listening discarded the workspace: ${JSON.stringify(result.cardJump)}`);
        assert(result.listeningControls.paused.listening && !result.listeningControls.paused.playing &&
            result.listeningControls.paused.index === 0 && result.listeningControls.skippedWhilePaused.listening &&
            !result.listeningControls.skippedWhilePaused.playing && result.listeningControls.skippedWhilePaused.index === 1 &&
            result.listeningControls.resumedAndPrevious.listening && result.listeningControls.resumedAndPrevious.playing &&
            result.listeningControls.resumedAndPrevious.index === 0,
            `listening controls lost pause or playlist state: ${JSON.stringify(result.listeningControls)}`);
        assert(!result.editProtection.listening && !result.editProtection.playing &&
            result.editProtection.changedOnce && result.editProtection.savedStateCleared &&
            result.editProtection.activeIndex === -1,
            `manual editing did not safely leave listening mode: ${JSON.stringify(result.editProtection)}`);
        assert(!result.globalStop.listening && !result.globalStop.playing && result.globalStop.savedStateCleared &&
            result.globalStop.activeIndex === -1 && result.globalStop.workspaceRestored,
            `global stop left listening mode active: ${JSON.stringify(result.globalStop)}`);
        assert(result.transitionStopSync.machineGrid === '24' && result.transitionStopSync.beatColumns === 24 &&
            result.transitionStopSync.synthColumns === 24 && result.transitionStopSync.machineTempo === 112 &&
            result.transitionStopSync.controlTempo === '112' && result.transitionStopSync.machineKit === 'acoustic' &&
            result.transitionStopSync.activeKit === 'acoustic' && !result.transitionStopSync.pendingVisualRender,
            `stopping during a delayed preset render desynchronized the editor: ${JSON.stringify(result.transitionStopSync)}`);
        assert(result.realSchedulerWrap.index === 0 && result.realSchedulerWrap.listening && result.realSchedulerWrap.playing,
            `real scheduler did not wrap the final preset to the first: ${JSON.stringify(result.realSchedulerWrap)}`);
        assert(!result.delayedResumeRace.listening && !result.delayedResumeRace.playing &&
            !result.delayedResumeRace.autoSaveSuspended,
            `a delayed audio resume restarted a cancelled session: ${JSON.stringify(result.delayedResumeRace)}`);
        assert(!result.rejectedResume.listening && !result.rejectedResume.playing &&
            !result.rejectedResume.autoSaveSuspended && /오디오 재생/.test(result.rejectedResume.status),
            `a rejected audio resume left listening state dirty: ${JSON.stringify(result.rejectedResume)}`);
        assert(result.menu.tagName === 'DETAILS' && result.menu.defaultClosed &&
            result.menu.cards === result.integrity.count && result.menu.listenPressed === 'false' &&
            result.menu.liveRegion === 'polite',
            `preset menu semantics are incomplete: ${JSON.stringify(result.menu)}`);
        assert(pageErrors.length === 0, `page errors:\n${pageErrors.join('\n')}`);

        process.stdout.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`);
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
});
