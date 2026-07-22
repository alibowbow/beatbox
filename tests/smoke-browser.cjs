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
        defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
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
        await page.waitForFunction(() => typeof drumMachine !== 'undefined' && drumMachine.audioContext && document.querySelectorAll('#beatGrid .beat-cell').length > 0);
        await page.waitForFunction(() => drumMachine.crashSamplePromise && drumMachine.crashSample, { timeout: 10000 });

        const result = await page.evaluate(async () => {
            const machine = drumMachine;
            await machine.audioContext.resume();

            const studioPanel = document.getElementById('promoRecorderPanel');
            const studioActions = studioPanel.querySelector('.promo-recorder-actions');
            studioPanel.open = false;
            const studioClosed = {
                tagName: studioPanel.tagName,
                open: studioPanel.open,
                height: studioPanel.getBoundingClientRect().height,
                width: studioPanel.getBoundingClientRect().width,
                actionsVisible: studioActions.getClientRects().length > 0,
                guidePresent: Boolean(studioPanel.querySelector('.promo-recorder-copy')) ||
                    studioPanel.textContent.includes('브라우저를 세로 비율로'),
            };
            studioPanel.open = true;
            const studioOpened = {
                actionsVisible: studioActions.getClientRects().length > 0,
                previewVisible: document.getElementById('promoPreviewBtn').getClientRects().length > 0,
                recordVisible: document.getElementById('promoRecordBtn').getClientRects().length > 0,
            };
            studioPanel.open = false;

            const originalKit = machine.kit;
            const originalPlayNoise = machine.playNoise;
            const originalPlayMetal = machine.playMetal;
            const originalPlayCrashCymbal = machine.playCrashCymbal;
            const originalPlayCrashSample = machine.playCrashSample;
            const openHatRecipes = {};
            const makeSpyEnv = () => ({ gain: {} });
            for (const kit of ['acoustic', 'tr808', 'electro']) {
                const layers = [];
                machine.kit = kit;
                machine.openHatEnvs = null;
                machine.playNoise = options => {
                    layers.push({ type: 'noise', options: { ...options } });
                    return makeSpyEnv();
                };
                machine.playMetal = options => {
                    layers.push({ type: 'metal', options: { ...options } });
                    return makeSpyEnv();
                };
                machine.createOpenHatSound();
                openHatRecipes[kit] = {
                    layers,
                    envelopes: machine.openHatEnvs ? machine.openHatEnvs.length : 0,
                };
            }

            const crashSampleRecipes = {};
            const crashFallbackRecipes = {};
            const crashLegacyLayers = [];
            machine.playNoise = options => {
                crashLegacyLayers.push({ type: 'noise', options: { ...options } });
                return makeSpyEnv();
            };
            machine.playMetal = options => {
                crashLegacyLayers.push({ type: 'metal', options: { ...options } });
                return makeSpyEnv();
            };
            machine.playCrashSample = options => {
                crashSampleRecipes[machine.kit] = { ...options };
                return true;
            };
            machine.playCrashCymbal = options => {
                crashLegacyLayers.push({ type: 'unexpected-fallback', options: { ...options } });
                return makeSpyEnv();
            };
            for (const kit of ['acoustic', 'tr808', 'electro']) {
                machine.kit = kit;
                machine.createCrashSound();
            }
            machine.playCrashSample = originalPlayCrashSample;
            const decodedCrashSample = machine.crashSample;
            machine.crashSample = null;
            machine.playCrashCymbal = options => {
                crashFallbackRecipes[machine.kit] = { ...options };
                return makeSpyEnv();
            };
            for (const kit of ['acoustic', 'tr808', 'electro']) {
                machine.kit = kit;
                machine.createCrashSound();
            }
            machine.crashSample = decodedCrashSample;
            machine.playNoise = originalPlayNoise;
            machine.playMetal = originalPlayMetal;
            machine.playCrashCymbal = originalPlayCrashCymbal;
            machine.playCrashSample = originalPlayCrashSample;

            const sourcesBeforeCrash = new Set(machine.scheduledSources);
            machine.kit = 'acoustic';
            machine.voiceStartTime = machine.audioContext.currentTime + 0.04;
            machine.createCrashSound();
            const crashVoiceSources = [...machine.scheduledSources]
                .filter(entry => !sourcesBeforeCrash.has(entry))
                .map(entry => ({
                    kind: entry.node instanceof OscillatorNode ? 'mode' : 'sample',
                    oscillatorType: entry.node instanceof OscillatorNode ? entry.node.type : null,
                    loop: 'loop' in entry.node ? entry.node.loop : null,
                    startAt: entry.startAt,
                }));
            machine.cancelPendingSources();
            const crashSourcesRemaining = [...machine.scheduledSources]
                .filter(entry => !sourcesBeforeCrash.has(entry)).length;

            machine.crashSample = null;
            const sourcesBeforeFallback = new Set(machine.scheduledSources);
            machine.voiceStartTime = machine.audioContext.currentTime + 0.04;
            machine.createCrashSound();
            const crashFallbackSources = [...machine.scheduledSources]
                .filter(entry => !sourcesBeforeFallback.has(entry))
                .map(entry => ({
                    kind: entry.node instanceof OscillatorNode ? 'mode' : 'noise',
                    oscillatorType: entry.node instanceof OscillatorNode ? entry.node.type : null,
                    loop: 'loop' in entry.node ? entry.node.loop : null,
                }));
            machine.cancelPendingSources();
            const crashFallbackSourcesRemaining = [...machine.scheduledSources]
                .filter(entry => !sourcesBeforeFallback.has(entry)).length;
            machine.crashSample = decodedCrashSample;
            machine.voiceStartTime = null;
            machine.kit = originalKit;
            machine.openHatEnvs = null;

            const chokeEvents = [];
            machine.openHatEnvs = [{
                gain: {
                    value: 1,
                    cancelAndHoldAtTime: time => chokeEvents.push({ type: 'hold', time }),
                    cancelScheduledValues: time => chokeEvents.push({ type: 'cancel', time }),
                    setValueAtTime: (value, time) => chokeEvents.push({ type: 'set', value, time }),
                    exponentialRampToValueAtTime: (value, time) => chokeEvents.push({ type: 'ramp', value, time }),
                    setTargetAtTime: (value, time, constant) => chokeEvents.push({ type: 'target', value, time, constant }),
                },
            }];
            const chokeAt = machine.audioContext.currentTime + 0.05;
            machine.chokeOpenHat(chokeAt);

            let openHatPadTriggers = 0;
            const originalPlaySound = machine.playSound;
            machine.playSound = key => {
                if (key === 'R') openHatPadTriggers += 1;
            };
            const openHatPad = document.querySelector('.pad[data-key="R"]');
            openHatPad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 }));
            openHatPad.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', repeat: true, bubbles: true }));
            machine.playSound = originalPlaySound;

            const bassChecks = [];
            for (const scale of Object.keys(machine.constructor.SCALES)) {
                for (let root = 0; root < 12; root += 1) {
                    machine.bassScale = scale;
                    machine.bassRootNote = root;
                    machine.bassOctave = 2;
                    machine.buildSynthScale();
                    machine.generateBassline();
                    const midi = machine.bassPattern
                        .filter(row => row != null)
                        .map(row => machine.synthRows[row]);
                    bassChecks.push({ scale, root, midi });
                }
            }

            machine.stopPlayback();
            machine.setGridMode('16');
            machine.clearBeat();
            machine.pattern.Q[0] = true;
            machine.pattern.W[4] = true;
            machine.pattern.E = machine.pattern.E.map((_, index) => index % 2 === 0);
            machine.bassEnabled = false;
            machine.tempo = 120;
            machine.swing = 0;

            machine.startPlayback();
            await new Promise(resolve => setTimeout(resolve, 10));
            const playbackButtonsDuring = [...document.querySelectorAll('[data-playback-toggle]')].map(button => ({
                id: button.id,
                pressed: button.getAttribute('aria-pressed'),
                playingClass: button.classList.contains('is-playing'),
                label: button.textContent.trim(),
            }));
            const synthControlMetrics = {
                buttonHeights: [...document.querySelectorAll('.synth-action-row .synth-panel-btn')]
                    .map(element => element.getBoundingClientRect().height),
                buttonWidths: [...document.querySelectorAll('.synth-action-row .synth-panel-btn')]
                    .map(element => element.getBoundingClientRect().width),
                settingHeights: [...document.querySelectorAll('.synth-setting-grid .synth-ctl')]
                    .map(element => element.getBoundingClientRect().height),
            };
            const pendingBeforeStop = [...machine.scheduledSources]
                .filter(entry => entry.startAt > machine.audioContext.currentTime).length;
            machine.stopPlayback();
            const pendingAfterStop = [...machine.scheduledSources]
                .filter(entry => entry.startAt > machine.audioContext.currentTime).length;

            const steps = [];
            const listener = event => steps.push(event.detail);
            window.addEventListener('beatbox:step', listener);
            machine.startPlayback();
            await new Promise(resolve => setTimeout(resolve, 1250));
            machine.stopPlayback();
            window.removeEventListener('beatbox:step', listener);
            const playbackButtonsAfterStop = [...document.querySelectorAll('[data-playback-toggle]')].map(button => ({
                id: button.id,
                pressed: button.getAttribute('aria-pressed'),
                playingClass: button.classList.contains('is-playing'),
                label: button.textContent.trim(),
            }));

            return {
                pageErrors: [],
                captureTracks: machine.captureDestination.stream.getAudioTracks().length,
                bassChecks,
                steps,
                pendingBeforeStop,
                pendingAfterStop,
                playbackButtonsDuring,
                playbackButtonsAfterStop,
                synthControlMetrics,
                promoClass: typeof window.BeatboxPromoRecorder,
                studioClosed,
                studioOpened,
                openHatRecipes,
                crashSampleRecipes,
                crashFallbackRecipes,
                crashLegacyLayers,
                crashVoiceSources,
                crashSourcesRemaining,
                crashFallbackSources,
                crashFallbackSourcesRemaining,
                crashSampleInfo: {
                    duration: machine.crashSample.duration,
                    channels: machine.crashSample.numberOfChannels,
                    sampleRate: machine.crashSample.sampleRate,
                },
                noiseBufferDuration: machine.noiseBuffer.duration,
                chokeEvents,
                openHatPadTriggers,
            };
        });

        assert(result.captureTracks === 1, `capture audio tracks: ${result.captureTracks}`);
        assert(result.studioClosed.tagName === 'DETAILS', `promo studio is not a disclosure: ${result.studioClosed.tagName}`);
        assert(!result.studioClosed.open, 'promo studio is open by default');
        assert(result.studioClosed.height <= 30, `collapsed promo studio is too tall: ${result.studioClosed.height}px`);
        assert(result.studioClosed.width <= 90, `collapsed promo studio is too wide: ${result.studioClosed.width}px`);
        assert(!result.studioClosed.actionsVisible, 'promo actions are visible while studio is collapsed');
        assert(!result.studioClosed.guidePresent, 'promo guidance copy still exists');
        assert(result.studioOpened.actionsVisible && result.studioOpened.previewVisible && result.studioOpened.recordVisible,
            `promo actions did not appear when opened: ${JSON.stringify(result.studioOpened)}`);
        for (const [kit, recipe] of Object.entries(result.openHatRecipes)) {
            assert(recipe.envelopes === 1, `${kit} open hat created ${recipe.envelopes} envelopes`);
            assert(recipe.layers.length === 1 && recipe.layers[0].type === 'noise',
                `${kit} open hat is not a single noise voice: ${JSON.stringify(recipe.layers)}`);
            assert((recipe.layers[0].options.when || 0) === 0,
                `${kit} open hat contains a delayed retrigger: ${JSON.stringify(recipe.layers)}`);
        }
        assert(result.openHatPadTriggers === 1, `open-hat pad triggered ${result.openHatPadTriggers} times for one press`);
        assert(result.chokeEvents.map(event => event.type).join(',') === 'hold,target',
            `open-hat choke can re-attack: ${JSON.stringify(result.chokeEvents)}`);
        assert(result.noiseBufferDuration >= 4.4,
            `noise buffer is too short for a non-looping crash: ${result.noiseBufferDuration}s`);
        assert(result.crashSampleInfo.duration >= 3.7 && result.crashSampleInfo.channels === 2,
            `decoded crash sample is missing its stereo tail: ${JSON.stringify(result.crashSampleInfo)}`);
        assert(result.crashLegacyLayers.length === 0,
            `loaded crash unexpectedly used the procedural fallback: ${JSON.stringify(result.crashLegacyLayers)}`);
        assert(Object.keys(result.crashSampleRecipes).sort().join(',') === 'acoustic,electro,tr808',
            `sample crash kit recipes are incomplete: ${Object.keys(result.crashSampleRecipes).join(',')}`);
        assert(result.crashSampleRecipes.acoustic.duration >= 3.4,
            `acoustic sample tail is too short: ${JSON.stringify(result.crashSampleRecipes.acoustic)}`);
        assert(result.crashSampleRecipes.acoustic.highpass <= 200 && result.crashSampleRecipes.acoustic.lowpass >= 15000,
            `acoustic sample loses its bronze spectrum: ${JSON.stringify(result.crashSampleRecipes.acoustic)}`);
        assert(result.crashVoiceSources.length === 1 && result.crashVoiceSources[0].kind === 'sample' && result.crashVoiceSources[0].loop === false,
            `acoustic crash is not one non-looping sample voice: ${JSON.stringify(result.crashVoiceSources)}`);
        assert(result.crashSourcesRemaining === 0,
            `scheduled sample crash survived cancellation: ${result.crashSourcesRemaining}`);
        assert(result.crashFallbackSources.length === 17,
            `acoustic fallback did not create one wash and 16 modes: ${JSON.stringify(result.crashFallbackSources)}`);
        assert(result.crashFallbackSources.filter(source => source.kind === 'mode').every(source => source.oscillatorType === 'sine'),
            `acoustic fallback contains a harsh non-sine mode: ${JSON.stringify(result.crashFallbackSources)}`);
        assert(result.crashFallbackSources.filter(source => source.kind === 'noise').every(source => source.loop === false),
            `acoustic fallback wash loops: ${JSON.stringify(result.crashFallbackSources)}`);
        assert(result.crashFallbackSourcesRemaining === 0,
            `scheduled fallback crash survived cancellation: ${result.crashFallbackSourcesRemaining}`);
        assert(Object.keys(result.crashFallbackRecipes).sort().join(',') === 'acoustic,electro,tr808',
            `procedural fallback recipes are incomplete: ${Object.keys(result.crashFallbackRecipes).join(',')}`);
        for (const [kit, recipe] of Object.entries(result.crashFallbackRecipes)) {
            assert(recipe.impactGain >= 0.18 && recipe.impactDecay <= 0.055,
                `${kit} fallback has no clear transient: ${JSON.stringify(recipe)}`);
            assert(recipe.bodyGain >= 0.1 && recipe.bodyGain <= 0.15,
                `${kit} fallback noise body is out of range: ${JSON.stringify(recipe)}`);
            assert(recipe.bodyDecay >= 1 && recipe.bodyDecay <= 2.4,
                `${kit} fallback wash length is out of range: ${JSON.stringify(recipe)}`);
            assert(recipe.metallicGain >= 0.008 && recipe.metallicGain <= 0.02,
                `${kit} fallback metallic texture can disappear or clang: ${JSON.stringify(recipe)}`);
            assert(recipe.metallicDecay < recipe.bodyDecay,
                `${kit} fallback leaves a pitched modal tail: ${JSON.stringify(recipe)}`);
            assert(recipe.modeCount >= 13, `${kit} fallback modal field is too sparse: ${JSON.stringify(recipe)}`);
        }
        for (const check of result.bassChecks) {
            assert(check.midi.length > 0, `empty bassline: ${check.scale}/${check.root}`);
            assert(check.midi.every(midi => midi >= 43 && midi <= 54), `bass range escaped: ${JSON.stringify(check)}`);
        }
        assert(result.steps.length >= 8, `too few visual steps: ${result.steps.length}`);
        assert(result.pendingBeforeStop > 0, 'scheduler did not create a future source for cancellation test');
        assert(result.pendingAfterStop === 0, `future sources survived stop: ${result.pendingAfterStop}`);
        assert(result.playbackButtonsDuring.length === 2, `expected two playback buttons: ${JSON.stringify(result.playbackButtonsDuring)}`);
        assert(result.playbackButtonsDuring.every(button => button.pressed === 'true' && button.playingClass),
            `playback buttons were not synchronized while playing: ${JSON.stringify(result.playbackButtonsDuring)}`);
        assert(result.playbackButtonsAfterStop.every(button => button.pressed === 'false' && !button.playingClass),
            `playback buttons were not synchronized after stop: ${JSON.stringify(result.playbackButtonsAfterStop)}`);
        assert(result.synthControlMetrics.buttonHeights.every(height => Math.abs(height - 40) < 0.5),
            `bass action button heights differ: ${result.synthControlMetrics.buttonHeights.join(',')}`);
        assert(Math.max(...result.synthControlMetrics.buttonWidths) - Math.min(...result.synthControlMetrics.buttonWidths) < 0.5,
            `bass action button widths differ: ${result.synthControlMetrics.buttonWidths.join(',')}`);
        assert(result.synthControlMetrics.settingHeights.every(height => Math.abs(height - 40) < 0.5),
            `bass setting heights differ: ${result.synthControlMetrics.settingHeights.join(',')}`);
        const plannedIntervals = result.steps.slice(1).map((step, index) => step.audioTime - result.steps[index].audioTime);
        assert(plannedIntervals.every(value => Math.abs(value - 0.125) < 0.00001), `unstable audio plan: ${plannedIntervals.join(',')}`);
            const visualLateness = result.steps.map(step => step.renderedAtAudioTime - step.audioTime);
            assert(Math.max(...visualLateness) < 0.05, `visual callback over 50ms late: ${Math.max(...visualLateness)}`);
            assert(pageErrors.length === 0, `page errors:\n${pageErrors.join('\n')}`);
            if (fs.existsSync(path.join(root, 'promo-recorder.js'))) {
                assert(result.promoClass === 'function', `promo recorder not loaded: ${result.promoClass}`);
            }

            const library = await page.evaluate(() => {
                const machine = drumMachine;
                const loops = machine.loopLibrary;
                if (!loops) return { available: false };
                localStorage.removeItem(window.BeatboxLoopLibrary.STORAGE_KEY);
                loops.renderHistory();

                machine.setMode('normal');
                machine.setGridMode('24');
                machine.setDrumKit('tr808');
                machine.clearBeat();
                machine.pattern.Q[0] = true;
                machine.pattern.Q[12] = true;
                machine.pattern.W[6] = true;
                machine.pattern.E[0] = true;
                machine.pattern.E[3] = true;
                machine.probability.E = { 3: 75 };
                machine.mutedSounds = new Set(['Y']);
                machine.tempo = 137;
                machine.swing = 23;
                machine.bassScale = 'minorPent';
                machine.bassRootNote = 2;
                machine.bassOctave = 2;
                machine.bassWave = 'square';
                machine.bassVolume = 1.1;
                machine.bassEnabled = true;
                machine.bassMuted = false;
                machine.populateSynthSelectors();
                machine.buildSynthScale();
                machine.bassPattern = Array(24).fill(null);
                machine.bassPattern[0] = 2;
                machine.bassPattern[9] = 4;
                machine.bassPattern[18] = 1;
                machine.createBeatGrid();
                machine.createSynthGrid();
                machine.applyMuteState();

                const expected = loops.collectState();
                const encoded = loops.encodeState(expected);
                const decoded = loops.decodeState(encoded);
                const saved = loops.saveToHistory(true);
                const duplicate = loops.saveToHistory(true);
                const historyAfterDuplicate = loops.loadHistory();

                machine.setGridMode('16');
                machine.setDrumKit('electro');
                machine.clearBeat();
                machine.clearSynth();
                machine.tempo = 70;
                machine.swing = 0;
                const restored = loops.restoreHistory(duplicate.id);
                const actual = loops.collectState();
                const hashUpdated = loops.updateShareUrl();
                machine.setGridMode('16');
                machine.clearBeat();
                machine.clearSynth();
                const hashRestored = loops.restoreStateFromUrl({ silent: true });
                const hashActual = loops.collectState();
                const librarySection = document.getElementById('loopLibrarySection');
                librarySection.open = false;

                return {
                    available: true,
                    encoded,
                    decoded,
                    expected,
                    actual,
                    saved: Boolean(saved),
                    duplicate: Boolean(duplicate),
                    historyLength: historyAfterDuplicate.length,
                    restored,
                    hashUpdated,
                    hashRestored,
                    hash: location.hash,
                    hashActual,
                    libraryClosed: !librarySection.open,
                    collapsedHeight: librarySection.getBoundingClientRect().height,
                    historyRows: document.querySelectorAll('#loopHistoryList .loop-history-item').length,
                    invalidDecode: loops.decodeState('%%%'),
                };
            });

            assert(library.available, 'loop library was not initialized');
            assert(library.saved, 'loop state was not saved');
            assert(library.duplicate, 'duplicate save did not return the refreshed item');
            assert(library.historyLength === 1, `loop history was not deduplicated: ${library.historyLength}`);
            assert(library.historyRows === 1, `loop history UI row mismatch: ${library.historyRows}`);
            assert(library.encoded && !/[+/=]/.test(library.encoded), 'share state is not URL-safe base64');
            assert(library.decoded && library.decoded.gridMode === '24', 'encoded loop did not round-trip');
            assert(library.restored, 'saved loop did not restore');
            assert(JSON.stringify(library.actual) === JSON.stringify(library.expected), 'restored loop differs from saved loop');
            assert(library.hashUpdated && library.hash.startsWith('#s='), `share hash missing: ${library.hash.slice(0, 20)}`);
            assert(library.hashRestored, 'shared hash did not restore');
            assert(JSON.stringify(library.hashActual) === JSON.stringify(library.expected), 'hash-restored loop differs from shared loop');
            assert(library.libraryClosed, 'loop library did not remain collapsed after hash restore');
            assert(library.collapsedHeight <= 44, `collapsed loop library is too tall: ${library.collapsedHeight}px`);
            assert(library.invalidDecode === null, 'invalid share data was accepted');

            await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
            await new Promise(resolve => setTimeout(resolve, 260));
            const mobileControls = await page.evaluate(() => {
                const buttons = [...document.querySelectorAll('.synth-action-row .synth-panel-btn')];
                const settings = [...document.querySelectorAll('.synth-setting-grid .synth-ctl')];
                return {
                    buttonHeights: buttons.map(element => element.getBoundingClientRect().height),
                    buttonWidths: buttons.map(element => element.getBoundingClientRect().width),
                    settingHeights: settings.map(element => element.getBoundingClientRect().height),
                    collapsedLibraryHeight: document.getElementById('loopLibrarySection').getBoundingClientRect().height,
                    collapsedStudioHeight: document.getElementById('promoRecorderPanel').getBoundingClientRect().height,
                    studioOpen: document.getElementById('promoRecorderPanel').open,
                    synthPlayVisible: getComputedStyle(document.getElementById('synthPlayBtn')).display !== 'none',
                };
            });
            assert(mobileControls.synthPlayVisible, 'bass-panel playback button is hidden on mobile');
            assert(mobileControls.buttonHeights.every(height => Math.abs(height - 40) < 0.5),
                `mobile bass action heights differ: ${mobileControls.buttonHeights.join(',')}`);
            assert(Math.max(...mobileControls.buttonWidths) - Math.min(...mobileControls.buttonWidths) < 0.5,
                `mobile bass action widths differ: ${mobileControls.buttonWidths.join(',')}`);
            assert(mobileControls.settingHeights.every(height => Math.abs(height - 40) < 0.5),
                `mobile bass setting heights differ: ${mobileControls.settingHeights.join(',')}`);
            assert(mobileControls.collapsedLibraryHeight <= 44,
                `mobile collapsed loop library is too tall: ${mobileControls.collapsedLibraryHeight}px`);
            assert(!mobileControls.studioOpen && mobileControls.collapsedStudioHeight <= 30,
                `mobile promo studio is not compact: ${JSON.stringify(mobileControls)}`);
            await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
            await new Promise(resolve => setTimeout(resolve, 260));

        let promo = null;
        if (process.env.FULL_PROMO === '1') {
            const beforePromo = await page.evaluate(() => ({
                state: drumMachine.loopLibrary.collectState(),
                history: localStorage.getItem(window.BeatboxLoopLibrary.STORAGE_KEY),
                hash: location.hash,
                libraryOpen: document.getElementById('loopLibrarySection').open,
            }));
            await page.evaluate(() => {
                window.__smokePromoPromise = drumMachine.promoRecorder.preview();
            });
            await page.waitForFunction(() => window.__beatboxPromoReport?.status === 'running', { timeout: 10000 });
            const activeLayout = await page.evaluate(() => ({
                panelHidden: getComputedStyle(document.getElementById('promoRecorderPanel')).display === 'none',
                bodyClass: document.body.classList.contains('promo-previewing'),
            }));
            assert(activeLayout.panelHidden, 'promo panel remained visible during preview');
            assert(activeLayout.bodyClass, 'promo preview body class was not applied');
            await page.waitForFunction(() => window.__beatboxPromoReport?.status === 'completed', { timeout: 40000, polling: 50 });
            promo = await page.evaluate(() => window.__beatboxPromoReport);
            const firstStep = promo.events.find(event => event.type === 'transport-step');
            const skips = promo.events.filter(event => event.type === 'transport-skip');
            const actions = promo.events.filter(event => event.type === 'timeline-action');
            const actionNames = actions.map(event => event.name);
            const bassMidi = promo.events
                .filter(event => event.type === 'transport-step' && Number.isFinite(event.bassMidi))
                .map(event => event.bassMidi);
            assert(promo.demo.bassMidiRangeAsserted === true, 'promo bass range audit did not pass');
            assert(bassMidi.length > 0 && bassMidi.every(midi => midi >= 43 && midi <= 54), 'promo emitted bass outside MIDI 43..54');
            assert(firstStep && Math.abs(firstStep.plannedCtx - promo.timeline.epochCtx - 0.2) < 0.00001,
                `first promo step was not planned at 0.20s: ${firstStep && firstStep.plannedCtx - promo.timeline.epochCtx}`);
            assert(skips.length === 0, `promo transport skipped ${skips.length} time(s)`);
            const actionMaxLatenessMs = Math.max(...actions.map(event => event.latenessMs || 0));
            const lateActions = actions
                .filter(event => (event.latenessMs || 0) > 15)
                .map(event => ({ name: event.name, latenessMs: event.latenessMs }));
            assert(actionMaxLatenessMs <= 15,
                `promo action lateness exceeded 15ms: ${actionMaxLatenessMs}; ${JSON.stringify(lateActions)}`);
            assert(actionNames.includes('save-drum-and-bass') && actionNames.includes('prepare-share-link'),
                'promo did not demonstrate loop save and hash sharing');
            const savedLoopRows = await page.evaluate(() => document.querySelectorAll('#loopHistoryList .loop-history-item').length);
            assert(savedLoopRows > 0, 'promo loop save did not render in history');
            const afterPromo = await page.evaluate(() => ({
                state: drumMachine.loopLibrary.collectState(),
                history: localStorage.getItem(window.BeatboxLoopLibrary.STORAGE_KEY),
                hash: location.hash,
                libraryOpen: document.getElementById('loopLibrarySection').open,
                promoStudioOpen: document.getElementById('promoRecorderPanel').open,
                autoSaveSuspended: drumMachine.suspendLoopAutoSave,
            }));
            assert(JSON.stringify(afterPromo.state) === JSON.stringify(beforePromo.state), 'promo changed the user loop');
            assert(afterPromo.history === beforePromo.history, 'promo changed the saved loop history');
            assert(afterPromo.hash === beforePromo.hash, 'promo changed the share hash');
            assert(afterPromo.libraryOpen === beforePromo.libraryOpen, 'promo changed the library disclosure state');
            assert(afterPromo.promoStudioOpen === false, 'promo studio did not collapse after preview');
            assert(afterPromo.autoSaveSuspended === false, 'promo left loop auto-save suspended');
        }

        process.stdout.write(JSON.stringify({
            ok: true,
            bassCases: result.bassChecks.length,
            stepEvents: result.steps.length,
            cancelledFutureSources: result.pendingBeforeStop,
            plannedStepMs: plannedIntervals[0] * 1000,
            maxVisualLatenessMs: Math.max(...visualLateness) * 1000,
            loopLibrary: {
                historyEntries: library.historyLength,
                hashBytes: library.encoded.length,
                restoredGridMode: library.actual.gridMode,
                restoredKit: library.actual.kit,
            },
            promo: promo ? {
                status: promo.status,
                tempo: promo.demo.tempo,
                scheduledSteps: promo.timing.scheduledSteps,
                actionMaxLatenessMs: Math.max(...promo.events.filter(event => event.type === 'timeline-action').map(event => event.latenessMs || 0)),
                bassMidiRange: promo.demo.bassMidiRange,
                bassMidiRangeAsserted: promo.demo.bassMidiRangeAsserted,
            } : 'skipped (set FULL_PROMO=1)',
        }, null, 2) + '\n');
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
}

main().catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
});
