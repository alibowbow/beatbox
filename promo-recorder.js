(function attachBeatboxPromoRecorder(global) {
    'use strict';

    const VERSION = '1.0.0';
    const WIDTH = 1080;
    const HEIGHT = 1920;
    const FPS = 30;
    const FRAME_SECONDS = 1 / FPS;
    const DURATION_SECONDS = 24.65;
    const INITIAL_SILENCE_SECONDS = 0.20;
    const PROMO_TEMPO = 128;
    const AUDIO_LOOKAHEAD_SECONDS = 0.08;
    const SCROLL_TWEEN_SECONDS = 0.30;
    const ROOT_ACTIVE_CLASS = 'beatbox-promo-capture-active';
    const PANEL_HIDDEN_CLASS = 'beatbox-promo-panel-hidden';
    const PANEL_SELECTOR = [
        '[data-beatbox-promo-panel]',
        '.beatbox-promo-inline',
        '.promo-recorder-panel',
        '#promoRecorderPanel',
    ].join(', ');
    const ACTIVE_PANEL_SELECTOR = PANEL_SELECTOR
        .split(',')
        .map((selector) => `html.${ROOT_ACTIVE_CLASS} ${selector.trim()}`)
        .join(',\n');
    const STYLE_ID = 'beatbox-promo-recorder-style';
    const DEFAULT_SEED = 0x20_26_07_21;

    const waitForAnimationFrames = (count = 1) => new Promise((resolve) => {
        const next = () => {
            if (count <= 0) {
                resolve();
                return;
            }
            count -= 1;
            global.requestAnimationFrame(next);
        };
        next();
    });

    const deepCopy = (value) => JSON.parse(JSON.stringify(value));

    function mulberry32(seed) {
        let state = seed >>> 0;
        return function random() {
            state += 0x6D2B79F5;
            let value = state;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
    }

    function hashSeed(seed, label) {
        let hash = (seed ^ 0x811C9DC5) >>> 0;
        const text = String(label);
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return hash >>> 0;
    }

    function errorToJSON(error) {
        if (!error) return null;
        return {
            name: error.name || 'Error',
            message: error.message || String(error),
            stack: error.stack || null,
        };
    }

    class BeatboxPromoRecorder {
        constructor(machine) {
            if (!machine || typeof machine !== 'object') {
                throw new TypeError('BeatboxPromoRecorder requires a DrumMachine instance.');
            }

            this.machine = machine;
            this.seed = DEFAULT_SEED;
            this.width = WIDTH;
            this.height = HEIGHT;
            this.fps = FPS;
            this.duration = DURATION_SECONDS;
            this.hiddenClass = PANEL_HIDDEN_CLASS;
            this.activeClass = ROOT_ACTIVE_CLASS;
            this._run = null;
            this._runCounter = 0;
            this._captureDestinationOwned = false;

            this._installInlineStyle();
        }

        /**
         * Runs the complete promo performance without creating a display stream
         * or downloads. Call from a user gesture if the AudioContext is suspended.
         */
        preview() {
            const run = this._createRun('preview');
            this._setupPreview(run).catch((error) => this._fail(run, error));
            return run.promise;
        }

        /**
         * Captures the current browser tab, crops it to 1080x1920 at 30 fps,
         * mixes in only the app's WebAudio destination, and downloads WebM+JSON.
         * This method must be invoked directly from a user click/tap because
         * getDisplayMedia requires transient user activation.
         */
        record() {
            const run = this._createRun('record');
            this._setupRecording(run).catch((error) => this._fail(run, error));
            return run.promise;
        }

        /** Cancels an active preview or recording. */
        cancel(reason = 'user-cancelled') {
            const run = this._run;
            if (!run || run.settled || run.finishing) return false;

            run.cancelled = true;
            run.cancelReason = reason;
            run.finishing = true;
            this._log(run, 'cancel-requested', { reason });
            this._stopTransport(run);

            if (run.recorder && run.recorder.state !== 'inactive') {
                try {
                    run.recorder.stop();
                } catch (error) {
                    run.error = error;
                    this._finalizeCancelled(run);
                }
            } else {
                this._finalizeCancelled(run);
            }
            return true;
        }

        _createRun(kind) {
            if (this._run && !this._run.settled) {
                throw new Error('A Beatbox promo run is already active.');
            }

            const context = this.machine.audioContext;
            if (!context) throw new Error('The DrumMachine AudioContext is not ready.');

            const now = new Date();
            const runId = `${now.toISOString().replace(/[:.]/g, '-')}-${++this._runCounter}`;
            const run = {
                id: runId,
                kind,
                context,
                createdAt: now.toISOString(),
                seed: this.seed >>> 0,
                duration: this.duration,
                started: false,
                finishing: false,
                settled: false,
                cancelled: false,
                cancelReason: null,
                error: null,
                chunks: [],
                events: [],
                visualFrames: [],
                hiddenPanels: [],
                actions: [],
                nextActionIndex: 0,
                transport: null,
                clockTimer: null,
                visualTimers: new Set(),
                drawRaf: null,
                scrollRaf: null,
                displayStream: null,
                canvasStream: null,
                combinedStream: null,
                outputVideoTrack: null,
                videoPath: null,
                appAudioTrack: null,
                recorder: null,
                recorderMimeType: null,
                videoElement: null,
                canvas: null,
                canvasContext: null,
                crop: null,
                epochCtx: null,
                mediaRecorderStartCtx: null,
                actualEndCtx: null,
                lastProgressSecond: -1,
                bassMidiAudits: [],
                bassMidiRangeAsserted: false,
                machineStateSnapshot: null,
                loopHistorySnapshot: null,
                loopHistoryHadValue: false,
                hashSnapshot: '',
                scrollYSnapshot: 0,
                loopSectionOpenSnapshot: false,
                statusSnapshot: '',
                appStateSnapshotted: false,
                resolve: null,
                reject: null,
                promise: null,
            };
            run.promise = new Promise((resolve, reject) => {
                run.resolve = resolve;
                run.reject = reject;
            });

            this._run = run;
            this._setWindowReport(this._buildReport(run, 'preparing'));
            this._emit('preparing', { runId, kind, seed: run.seed });
            return run;
        }

        async _setupPreview(run) {
            await run.context.resume();
            this._assertRunCurrent(run);
            this._activateCaptureLayout(run);
            await this._prepareDemo(run);
            await waitForAnimationFrames(2);
            this._beginTimeline(run);
        }

        async _setupRecording(run) {
            if (!global.navigator || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                throw new Error('getDisplayMedia is not available in this browser.');
            }
            if (typeof global.MediaRecorder !== 'function') {
                throw new Error('MediaRecorder is not available in this browser.');
            }

            // Both calls are started synchronously in record()'s user-activation turn.
            const displayPromise = navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: { ideal: FPS, max: FPS },
                    displaySurface: 'browser',
                    cursor: 'never',
                },
                audio: false,
                preferCurrentTab: true,
                selfBrowserSurface: 'include',
                systemAudio: 'exclude',
                surfaceSwitching: 'exclude',
                monitorTypeSurfaces: 'exclude',
            });
            const resumePromise = run.context.resume();
            const [displayStream] = await Promise.all([displayPromise, resumePromise]);
            run.displayStream = displayStream;
            this._assertRunCurrent(run);

            const displayTrack = displayStream.getVideoTracks()[0];
            if (!displayTrack) throw new Error('No video track was returned by getDisplayMedia.');
            displayStream.getAudioTracks().forEach((track) => track.stop());

            const settings = displayTrack.getSettings ? displayTrack.getSettings() : {};
            if (settings.displaySurface && settings.displaySurface !== 'browser') {
                throw new Error('Please choose the current Beatbox browser tab, not a window or screen.');
            }
            displayTrack.addEventListener('ended', () => {
                if (this._run === run && !run.finishing && !run.settled) {
                    this._emit('track-ended', { runId: run.id });
                    this._fail(run, new Error('The shared-tab video track ended before recording completed.'));
                }
            });

            this._activateCaptureLayout(run);
            await this._prepareDemo(run);

            if (this._canUseDirectPortraitTrack(settings)) {
                run.videoPath = 'direct';
                run.outputVideoTrack = displayTrack.clone();
                if ('contentHint' in run.outputVideoTrack) run.outputVideoTrack.contentHint = 'detail';
                run.crop = {
                    mode: 'direct',
                    sourceWidth: settings.width,
                    sourceHeight: settings.height,
                    width: settings.width,
                    height: settings.height,
                };
                this._log(run, 'display-video-ready', {
                    videoPath: run.videoPath,
                    trackSettings: settings,
                });
                await waitForAnimationFrames(2);
            } else {
                if (typeof HTMLCanvasElement === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
                    throw new Error('Canvas captureStream is required to crop a non-portrait display source.');
                }
                run.videoPath = 'canvas-crop';
                await this._createCanvasVideo(run, displayTrack);
                await waitForAnimationFrames(2);
                this._drawCanvasFrame(run);
                run.canvasStream = run.canvas.captureStream(FPS);
                run.outputVideoTrack = run.canvasStream.getVideoTracks()[0];
                if (!run.outputVideoTrack) {
                    throw new Error('Canvas captureStream did not provide a video track.');
                }
                if ('contentHint' in run.outputVideoTrack) run.outputVideoTrack.contentHint = 'detail';
            }

            const destination = this._ensureCaptureDestination(run);
            const destinationAudioTrack = destination.stream.getAudioTracks()[0];
            if (!destinationAudioTrack) throw new Error('The app capture destination has no audio track.');
            run.appAudioTrack = destinationAudioTrack.clone();
            if ('contentHint' in run.appAudioTrack) run.appAudioTrack.contentHint = 'music';

            run.combinedStream = new MediaStream([run.outputVideoTrack, run.appAudioTrack]);
            run.recorderMimeType = this._chooseWebMMimeType();
            run.recorder = new MediaRecorder(run.combinedStream, {
                mimeType: run.recorderMimeType,
                videoBitsPerSecond: 5_000_000,
                audioBitsPerSecond: 192_000,
            });

            run.recorder.addEventListener('dataavailable', (event) => {
                if (event.data && event.data.size > 0) run.chunks.push(event.data);
            });
            run.recorder.addEventListener('error', (event) => {
                const error = event.error || new Error('MediaRecorder failed.');
                if (!run.finishing && !run.settled) this._fail(run, error);
            });
            run.recorder.addEventListener('stop', () => this._onRecorderStop(run), { once: true });

            await new Promise((resolve, reject) => {
                const handleStart = () => {
                    run.recorder.removeEventListener('error', handleError);
                    resolve();
                };
                const handleError = (event) => {
                    run.recorder.removeEventListener('start', handleStart);
                    reject(event.error || new Error('MediaRecorder could not start.'));
                };
                run.recorder.addEventListener('start', handleStart, { once: true });
                run.recorder.addEventListener('error', handleError, { once: true });
                run.recorder.start(1000);
            });

            run.mediaRecorderStartCtx = run.context.currentTime;
            this._log(run, 'media-recorder-started', {
                ctxTime: run.mediaRecorderStartCtx,
                mimeType: run.recorderMimeType,
                displaySettings: settings,
                videoPath: run.videoPath,
                output: run.videoPath === 'direct'
                    ? { width: settings.width, height: settings.height, fps: settings.frameRate || FPS }
                    : { width: WIDTH, height: HEIGHT, fps: FPS },
            });
            this._beginTimeline(run);
        }

        async _prepareDemo(run) {
            const machine = this.machine;

            if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            this._assertRunCurrent(run);
            this._snapshotAppState(run);

            if (typeof machine.stopPlayback === 'function') {
                machine.stopPlayback();
            } else {
                if (machine.intervalId) {
                    clearInterval(machine.intervalId);
                    machine.intervalId = null;
                }
                machine.isPlaying = false;
                if (typeof machine.cancelPendingSources === 'function') machine.cancelPendingSources();
            }
            machine.currentBeat = 0;
            if (typeof machine.setPlayButton === 'function') machine.setPlayButton(false);

            if (machine.mode !== 'normal' && typeof machine.setMode === 'function') {
                machine.setMode('normal');
            }
            machine.tempo = PROMO_TEMPO;
            machine.swing = 0;
            this._setControlValue('tempo', String(PROMO_TEMPO));
            this._setText('tempoValue', String(PROMO_TEMPO));
            this._setControlValue('swing', '0');
            this._setText('swingValue', '0');

            if (typeof machine.setGridMode === 'function') machine.setGridMode('16');
            if (typeof machine.setDrumKit === 'function') machine.setDrumKit('acoustic');
            if (typeof machine.clearBeat === 'function') machine.clearBeat();
            if (typeof machine.clearSynth === 'function') machine.clearSynth();

            machine.bassEnabled = false;
            machine.bassMuted = false;
            if (typeof machine.syncSynthToggle === 'function') machine.syncSynthToggle();
            if (typeof machine.syncBassMuteToggle === 'function') machine.syncBassMuteToggle();

            this._scrollTo('top', run, 0);
            this._log(run, 'demo-prepared', {
                tempo: machine.tempo,
                gridMode: machine.gridMode,
                kit: machine.kit,
                beatEmpty: true,
                bassEnabled: machine.bassEnabled,
            });
        }

        _beginTimeline(run) {
            this._assertRunCurrent(run);
            run.actions = this._buildTimeline(run);
            run.nextActionIndex = 0;
            run.epochCtx = run.context.currentTime + 0.05;
            run.started = true;
            run.startOutputTimestamp = this._getOutputTimestamp(run.context);

            this._log(run, 'timeline-start', {
                epochCtx: run.epochCtx,
                duration: run.duration,
                initialSilence: INITIAL_SILENCE_SECONDS,
                sampleRate: run.context.sampleRate,
            });
            this._setWindowReport(this._buildReport(run, 'running'));
            this._emit('start', {
                runId: run.id,
                kind: run.kind,
                epochCtx: run.epochCtx,
                duration: run.duration,
            });
            this._clockPump(run);
        }

        _buildTimeline(run) {
            const actions = [];
            const add = (at, name, action, detail = {}, options = {}) => {
                actions.push({
                    at,
                    name,
                    action,
                    detail,
                    scheduleAhead: options.scheduleAhead === true,
                });
            };

            add(INITIAL_SILENCE_SECONDS, 'drum-play', (plannedCtx) => {
                this._withSeed(hashSeed(run.seed, 'initial-drum-pattern'), () => this.machine.generateBeat());
                this._startTransport(run, plannedCtx);
                this._scrollTo('top', run);
            }, { section: 'drum' }, { scheduleAhead: true });

            add(3.35, 'bass-c2-sawtooth', () => {
                this._setBassDemo(run, { root: 0, octave: 2, wave: 'sawtooth', seedLabel: 'bass-c2-saw' });
                this._scrollTo('synth', run);
            }, { section: 'bass', root: 'C', octave: 2, wave: 'sawtooth' });

            add(6.35, 'bass-d2-square', () => {
                this._setBassDemo(run, { root: 2, octave: 2, wave: 'square', seedLabel: 'bass-d2-square' });
                this._scrollTo('synth', run);
            }, { section: 'new-bass', root: 'D', octave: 2, wave: 'square' });

            add(9.35, 'new-beat-16', () => {
                this._withSeed(hashSeed(run.seed, 'new-beat-16'), () => this.machine.generateBeat());
                this._scrollTo('top', run);
            }, { section: 'new-beat', gridMode: '16' });

            add(11.35, 'new-beat-24', () => {
                this.machine.setGridMode('24');
                this._withSeed(hashSeed(run.seed, 'new-beat-24'), () => this.machine.generateBeat());
                if (run.transport) run.transport.step = 0;
                this._scrollTo('top', run);
            }, { section: '24-step', gridMode: '24' });

            add(14.35, 'hiphop', () => {
                this._withSeed(hashSeed(run.seed, 'hiphop'), () => this.machine.loadGenrePattern('hiphop'));
                if (run.transport) run.transport.step = 0;
                this._scrollTo('top', run);
            }, { section: 'hiphop', gridMode: '16' });

            add(15.65, 'save-drum-and-bass', () => {
                const section = typeof document !== 'undefined'
                    ? document.getElementById('loopLibrarySection') : null;
                if (section) section.open = true;
                if (this.machine.loopLibrary) {
                    this.machine.loopLibrary.saveToHistory(true);
                    this.machine.loopLibrary.updateShareUrl();
                    this.machine.loopLibrary.renderHistory();
                }
                this._pulseControl('saveLoopBtn', run);
                this._scrollTo('library', run);
            }, { section: 'loop-library', action: 'save' });

            add(16.35, 'prepare-share-link', () => {
                if (this.machine.loopLibrary) this.machine.loopLibrary.updateShareUrl();
                this._pulseControl('shareLoopBtn', run);
                if (typeof this.machine.updateStatus === 'function') {
                    this.machine.updateStatus('공유 링크 준비 완료 · #s= 루프 데이터');
                }
            }, { section: 'loop-library', action: 'hash-share' });

            add(17.35, 'kit-808', () => {
                this.machine.setDrumKit('tr808');
                this._scrollTo('pads', run);
            }, { section: '808-pads', kit: 'tr808' });

            const pad808 = [
                ['Q', 17.50], ['E', 17.85], ['W', 18.20], ['E', 18.55],
                ['Q', 18.90], ['E', 19.25], ['W', 19.60], ['R', 19.95], ['F', 20.30],
            ];
            pad808.forEach(([key, at], index) => add(at, `808-${key}-${index}`, (plannedCtx) => {
                this._playPad(run, key, `808-${index}-${key}`, plannedCtx);
            }, { section: '808-pads', kit: 'tr808', key }, { scheduleAhead: true }));

            add(20.65, 'kit-electro', () => {
                this.machine.setDrumKit('electro');
                this._scrollTo('pads', run);
            }, { section: 'electro-pads', kit: 'electro' });

            const padElectro = [
                ['Q', 20.80], ['E', 21.15], ['W', 21.50], ['E', 21.85],
                ['Q', 22.20], ['H', 22.55], ['W', 22.90], ['T', 23.25], ['F', 23.60],
            ];
            padElectro.forEach(([key, at], index) => add(at, `electro-${key}-${index}`, (plannedCtx) => {
                this._playPad(run, key, `electro-${index}-${key}`, plannedCtx);
            }, { section: 'electro-pads', kit: 'electro', key }, { scheduleAhead: true }));

            add(24.10, 'final-hold', () => {
                this._scrollTo('pads', run);
            }, { section: 'final-hold' });

            return actions.sort((left, right) => left.at - right.at);
        }

        _clockPump(run) {
            if (this._run !== run || run.settled || run.finishing) return;

            const now = run.context.currentTime;
            const elapsed = now - run.epochCtx;

            while (run.nextActionIndex < run.actions.length) {
                const item = run.actions[run.nextActionIndex];
                const actionLookahead = item.scheduleAhead ? AUDIO_LOOKAHEAD_SECONDS : 0;
                if (item.at > elapsed + actionLookahead + 0.0005) break;
                run.nextActionIndex += 1;
                const plannedCtx = run.epochCtx + item.at;
                const actualCtx = run.context.currentTime;
                try {
                    item.action(plannedCtx);
                    this._log(run, 'timeline-action', {
                        name: item.name,
                        plannedElapsed: item.at,
                        plannedCtx,
                        actualCtx,
                        scheduleAhead: item.scheduleAhead,
                        schedulingLeadMs: (plannedCtx - actualCtx) * 1000,
                        latenessMs: Math.max(0, (actualCtx - plannedCtx) * 1000),
                        ...item.detail,
                    });
                    this._emit('scene', {
                        runId: run.id,
                        name: item.name,
                        elapsed: item.at,
                        ...item.detail,
                    });
                } catch (error) {
                    this._fail(run, error);
                    return;
                }
            }

            this._pumpTransport(run, now);

            const wholeSecond = Math.max(0, Math.floor(elapsed));
            if (wholeSecond !== run.lastProgressSecond) {
                run.lastProgressSecond = wholeSecond;
                this._emit('progress', {
                    runId: run.id,
                    kind: run.kind,
                    elapsed: Math.max(0, elapsed),
                    duration: run.duration,
                });
            }

            if (elapsed >= run.duration) {
                this._finishNaturally(run);
                return;
            }

            run.clockTimer = global.setTimeout(() => this._clockPump(run), 8);
        }

        _startTransport(run, startCtx) {
            const machine = this.machine;
            if (machine.intervalId) {
                clearInterval(machine.intervalId);
                machine.intervalId = null;
            }
            machine.isPlaying = true;
            machine.currentBeat = 0;
            if (typeof machine.setPlayButton === 'function') machine.setPlayButton(true);
            run.transport = {
                active: true,
                nextStepCtx: startCtx,
                step: 0,
                sequence: 0,
            };
        }

        _pumpTransport(run, now) {
            const transport = run.transport;
            if (!transport || !transport.active) return;

            const machine = this.machine;
            let safety = 0;

            // Avoid a burst if the main thread was blocked for a long time.
            if (now - transport.nextStepCtx > 0.25) {
                let skipped = 0;
                while (now - transport.nextStepCtx > 0.10 && skipped < 32) {
                    const maxSteps = machine.gridMode === '24' ? 24 : 16;
                    const skippedStep = transport.step % maxSteps;
                    transport.nextStepCtx += this._stepDurationSeconds(skippedStep);
                    transport.step = (skippedStep + 1) % maxSteps;
                    transport.sequence += 1;
                    skipped += 1;
                }
                this._log(run, 'transport-skip', { skipped, ctxTime: now });
            }

            const nextStateAction = run.actions
                .slice(run.nextActionIndex)
                .find((item) => !item.scheduleAhead);
            const nextStateActionCtx = nextStateAction
                ? run.epochCtx + nextStateAction.at
                : Number.POSITIVE_INFINITY;
            const horizon = Math.min(
                now + AUDIO_LOOKAHEAD_SECONDS,
                nextStateActionCtx,
                run.epochCtx + run.duration
            );

            // Do not cross a visual/state scene boundary with audio created from
            // the previous pattern or kit. The action is applied first, then the
            // next pump fills the new 80 ms Web Audio horizon without a gap.
            while (transport.nextStepCtx < horizon - 0.000001 && safety < 8) {
                const maxSteps = machine.gridMode === '24' ? 24 : 16;
                const step = transport.step % maxSteps;
                const plannedCtx = transport.nextStepCtx;
                this._performStep(run, step, transport.sequence, plannedCtx);
                transport.nextStepCtx += this._stepDurationSeconds(step);
                transport.step = (step + 1) % maxSteps;
                transport.sequence += 1;
                safety += 1;
            }
        }

        _performStep(run, step, sequence, plannedCtx) {
            const machine = this.machine;
            const sounds = machine.mode === 'normal' ? machine.normalSounds : machine.customSounds;
            const seed = hashSeed(run.seed, `transport:${sequence}:step:${step}`);
            const visualHits = [];
            let bassMidi = null;

            this._withSeed(seed, () => {
                sounds.forEach((sound, key) => {
                    if (!machine.pattern[key] || !machine.pattern[key][step]) return;
                    if (machine.mutedSounds && machine.mutedSounds.has(key)) return;
                    const probability = typeof machine.getProb === 'function' ? machine.getProb(key, step) : 100;
                    if (probability >= 100 || Math.random() * 100 < probability) {
                        machine.playSound(key, plannedCtx, false);
                        visualHits.push(key);
                    }
                });

                if (machine.bassEnabled && !machine.bassMuted && machine.bassPattern[step] != null) {
                    const midi = machine.synthRows[machine.bassPattern[step]];
                    if (midi != null && typeof machine.playSynthNote === 'function') {
                        bassMidi = midi;
                        machine.playSynthNote(midi, plannedCtx);
                    }
                }
            });

            this._scheduleVisual(run, plannedCtx, () => {
                machine.currentBeat = step;
                if (typeof machine.updateBeatGrid === 'function') machine.updateBeatGrid();
                if (typeof machine.updateSynthGrid === 'function') machine.updateSynthGrid();
                if (typeof machine.flashPad === 'function') {
                    visualHits.forEach((key) => machine.flashPad(key));
                }
            }, {
                visualKind: 'transport-step',
                transportSequence: sequence,
                step,
                hits: visualHits.slice(),
            });

            const actualCtx = run.context.currentTime;
            this._log(run, 'transport-step', {
                transportSequence: sequence,
                step,
                gridMode: machine.gridMode,
                plannedCtx,
                actualCtx,
                schedulingLeadMs: (plannedCtx - actualCtx) * 1000,
                latenessMs: Math.max(0, (actualCtx - plannedCtx) * 1000),
                hits: visualHits,
                bassMidi,
            });
        }

        _scheduleVisual(run, plannedCtx, callback, detail = {}) {
            const visualLead = Math.max(0, Number(this.machine.visualLeadSeconds) || 0);
            const targetCtx = plannedCtx - visualLead;
            const delayMs = Math.max(0, (targetCtx - run.context.currentTime) * 1000);
            const timer = global.setTimeout(() => {
                run.visualTimers.delete(timer);
                if (this._run !== run || run.settled || run.finishing) return;
                const renderedAtCtx = run.context.currentTime;
                callback();
                this._log(run, 'visual-render', {
                    plannedAudioCtx: plannedCtx,
                    targetCtx,
                    renderedAtCtx,
                    visualLeadSeconds: visualLead,
                    latenessMs: Math.max(0, (renderedAtCtx - targetCtx) * 1000),
                    ...detail,
                });
            }, delayMs);
            run.visualTimers.add(timer);
        }

        _stepDurationSeconds(step) {
            const machine = this.machine;
            const base = 60 / Number(machine.tempo || PROMO_TEMPO) / 4;
            const swing = Math.max(0, Math.min(0.70, Number(machine.swing || 0) / 100));
            return base * (step % 2 === 0 ? 1 + swing : 1 - swing);
        }

        _setBassDemo(run, { root, octave, wave, seedLabel }) {
            const machine = this.machine;
            machine.bassRootNote = root;
            machine.bassOctave = octave;
            machine.bassWave = wave;
            machine.bassEnabled = true;
            machine.bassMuted = false;

            this._setControlValue('synthRoot', String(root));
            this._setControlValue('synthOctave', String(octave));
            this._setControlValue('synthWave', wave);
            if (typeof machine.updateSynthConfig === 'function') machine.updateSynthConfig();
            if (typeof machine.syncSynthToggle === 'function') machine.syncSynthToggle();
            if (typeof machine.syncBassMuteToggle === 'function') machine.syncBassMuteToggle();
            this._withSeed(hashSeed(run.seed, seedLabel), () => machine.generateBassline());

            const midis = machine.bassPattern
                .filter((row) => row != null)
                .map((row) => machine.synthRows[row])
                .filter((midi) => Number.isFinite(midi));
            const inRange = midis.length > 0 && midis.every((midi) => midi >= 43 && midi <= 54);
            const audit = {
                seedLabel,
                root,
                octave,
                wave,
                midis,
                minMidi: midis.length ? Math.min(...midis) : null,
                maxMidi: midis.length ? Math.max(...midis) : null,
                requiredRange: [43, 54],
                inRange,
            };
            run.bassMidiAudits.push(audit);
            this._log(run, 'bass-midi-audit', audit);
            if (!inRange) {
                throw new RangeError(`Generated bass MIDI must stay within 43..54 (${seedLabel}).`);
            }
        }

        _playPad(run, key, label, plannedCtx) {
            this._withSeed(hashSeed(run.seed, `pad:${label}`), () => {
                this.machine.playSound(key, plannedCtx, false);
            });
            this._scheduleVisual(run, plannedCtx, () => {
                if (typeof this.machine.flashPad === 'function') this.machine.flashPad(key);
            }, { visualKind: 'manual-pad', key, label });
            this._log(run, 'pad-audio-scheduled', {
                key,
                label,
                plannedCtx,
                scheduledAtCtx: run.context.currentTime,
                schedulingLeadMs: (plannedCtx - run.context.currentTime) * 1000,
            });
        }

        _assertBassMidiRange(run) {
            const audits = run.bassMidiAudits || [];
            const allMidis = audits.flatMap((audit) => audit.midis || []);
            const valid = audits.length >= 2 && allMidis.length > 0 &&
                audits.every((audit) => audit.inRange === true) &&
                allMidis.every((midi) => midi >= 43 && midi <= 54);
            if (!valid) {
                throw new RangeError('Promo bass MIDI audit failed; every generated note must be within 43..54.');
            }
            run.bassMidiRangeAsserted = true;
            this._log(run, 'bass-midi-range-asserted', {
                auditCount: audits.length,
                noteCount: allMidis.length,
                minMidi: Math.min(...allMidis),
                maxMidi: Math.max(...allMidis),
            });
        }

        _canUseDirectPortraitTrack(settings = {}) {
            const width = Number(settings.width);
            const height = Number(settings.height);
            if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
                return false;
            }

            const targetAspect = WIDTH / HEIGHT;
            const aspectDelta = Math.abs((width / height) - targetAspect) / targetAspect;
            const widthDelta = Math.abs(width - WIDTH) / WIDTH;
            const heightDelta = Math.abs(height - HEIGHT) / HEIGHT;
            return aspectDelta <= 0.015 && widthDelta <= 0.08 && heightDelta <= 0.08;
        }

        async _createCanvasVideo(run, displayTrack) {
            const video = document.createElement('video');
            video.muted = true;
            video.autoplay = true;
            video.playsInline = true;
            video.setAttribute('aria-hidden', 'true');
            video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px;';
            video.srcObject = run.displayStream;
            document.body.appendChild(video);
            run.videoElement = video;

            if (video.readyState < 1) {
                await new Promise((resolve, reject) => {
                    video.addEventListener('loadedmetadata', resolve, { once: true });
                    video.addEventListener('error', () => reject(new Error('The shared-tab video could not be decoded.')), { once: true });
                });
            }
            await video.play();

            const canvas = document.createElement('canvas');
            canvas.width = WIDTH;
            canvas.height = HEIGHT;
            const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
            if (!context) throw new Error('Could not create a 2D canvas context.');
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            run.canvas = canvas;
            run.canvasContext = context;
            run.nextDrawCtx = run.context.currentTime;

            const drawLoop = () => {
                if (this._run !== run || run.settled || run.finishing) return;
                const now = run.context.currentTime;
                if (now + 0.0005 >= run.nextDrawCtx) {
                    this._drawCanvasFrame(run);
                    const elapsedFrames = Math.max(1, Math.floor((now - run.nextDrawCtx) / FRAME_SECONDS) + 1);
                    run.nextDrawCtx += elapsedFrames * FRAME_SECONDS;
                }
                run.drawRaf = global.requestAnimationFrame(drawLoop);
            };
            run.drawRaf = global.requestAnimationFrame(drawLoop);

            this._log(run, 'display-video-ready', {
                trackSettings: displayTrack.getSettings ? displayTrack.getSettings() : {},
                sourceWidth: video.videoWidth,
                sourceHeight: video.videoHeight,
            });
        }

        _drawCanvasFrame(run) {
            const video = run.videoElement;
            const context = run.canvasContext;
            if (!video || !context || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

            const sourceWidth = video.videoWidth;
            const sourceHeight = video.videoHeight;
            const targetAspect = WIDTH / HEIGHT;
            const sourceAspect = sourceWidth / sourceHeight;
            let sx = 0;
            let sy = 0;
            let sw = sourceWidth;
            let sh = sourceHeight;

            if (sourceAspect > targetAspect) {
                sw = sourceHeight * targetAspect;
                sx = (sourceWidth - sw) / 2;
            } else if (sourceAspect < targetAspect) {
                sh = sourceWidth / targetAspect;
                sy = (sourceHeight - sh) / 2;
            }

            context.fillStyle = '#080d1f';
            context.fillRect(0, 0, WIDTH, HEIGHT);
            context.drawImage(video, sx, sy, sw, sh, 0, 0, WIDTH, HEIGHT);
            run.crop = { sx, sy, sw, sh, sourceWidth, sourceHeight, width: WIDTH, height: HEIGHT };

            if (run.started && run.epochCtx != null) {
                run.visualFrames.push({
                    frame: run.visualFrames.length,
                    ctxTime: run.context.currentTime,
                    elapsed: run.context.currentTime - run.epochCtx,
                    performanceNow: global.performance ? performance.now() : null,
                    step: this.machine.currentBeat,
                    gridMode: this.machine.gridMode,
                    kit: this.machine.kit,
                });
            }
        }

        _ensureCaptureDestination(run) {
            const machine = this.machine;
            const context = run.context;
            if (machine.captureDestination && machine.captureDestination.stream &&
                machine.captureDestination.stream.getAudioTracks().length) {
                return machine.captureDestination;
            }

            const source = machine.compressor || machine.masterGain;
            if (!source || typeof source.connect !== 'function') {
                throw new Error('The DrumMachine master/compressor audio graph is not ready.');
            }

            const destination = context.createMediaStreamDestination();
            source.connect(destination);
            machine.captureDestination = destination;
            this._captureDestinationOwned = true;
            this._log(run, 'capture-destination-created', {
                source: machine.compressor ? 'compressor' : 'masterGain',
                channels: destination.channelCount,
            });
            return destination;
        }

        _chooseWebMMimeType() {
            const candidates = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
            ];
            const supported = candidates.find((type) => MediaRecorder.isTypeSupported(type));
            if (!supported) throw new Error('This browser cannot record a WebM video with MediaRecorder.');
            return supported;
        }

        _finishNaturally(run) {
            if (run.finishing || run.settled) return;
            run.finishing = true;
            run.actualEndCtx = run.context.currentTime;
            this._log(run, 'timeline-end', {
                plannedCtx: run.epochCtx + run.duration,
                actualCtx: run.actualEndCtx,
                latenessMs: (run.actualEndCtx - (run.epochCtx + run.duration)) * 1000,
            });
            this._stopTransport(run);

            if (run.kind === 'record' && run.recorder && run.recorder.state !== 'inactive') {
                try {
                    run.recorder.stop();
                } catch (error) {
                    this._fail(run, error);
                }
                return;
            }
            this._finalizeSuccess(run, null);
        }

        _onRecorderStop(run) {
            if (run.settled) return;
            if (run.cancelled) {
                this._finalizeCancelled(run);
                return;
            }
            if (run.error) {
                this._finalizeError(run);
                return;
            }

            try {
                const mimeType = run.recorderMimeType || 'video/webm';
                const videoBlob = new Blob(run.chunks, { type: mimeType });
                this._finalizeSuccess(run, videoBlob);
            } catch (error) {
                run.error = error;
                this._finalizeError(run);
            }
        }

        _finalizeSuccess(run, videoBlob) {
            if (run.settled) return;
            run.finishing = true;
            try {
                this._assertBassMidiRange(run);
            } catch (error) {
                run.error = error;
                this._log(run, 'error', { error: errorToJSON(error) });
                this._finalizeError(run);
                return;
            }
            const report = this._buildReport(run, 'completed');
            report.video = videoBlob ? {
                type: videoBlob.type,
                bytes: videoBlob.size,
            } : null;
            const reportBlob = new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: 'application/json' });

            if (run.kind === 'record' && videoBlob) {
                const stem = `beatbox-promo-${run.id}`;
                this._downloadBlob(videoBlob, `${stem}.webm`);
                this._downloadBlob(reportBlob, `${stem}.json`);
            }

            this._setWindowReport(report);
            this._emit('complete', {
                runId: run.id,
                kind: run.kind,
                report,
                videoBlob,
                reportBlob,
            });
            this._cleanup(run);
            run.settled = true;
            run.resolve({ report, videoBlob, reportBlob });
        }

        _finalizeCancelled(run) {
            if (run.settled) return;
            const report = this._buildReport(run, 'cancelled');
            report.cancelReason = run.cancelReason;
            this._setWindowReport(report);
            this._emit('cancelled', { runId: run.id, reason: run.cancelReason, report });
            this._cleanup(run);
            run.settled = true;
            const error = new DOMException(run.cancelReason || 'Promo recording cancelled.', 'AbortError');
            run.reject(error);
        }

        _fail(run, error) {
            if (!run || run.settled) return;
            run.error = error instanceof Error ? error : new Error(String(error));
            run.finishing = true;
            this._log(run, 'error', { error: errorToJSON(run.error) });
            this._stopTransport(run);

            if (run.recorder && run.recorder.state !== 'inactive') {
                try {
                    run.recorder.stop();
                    return;
                } catch (stopError) {
                    this._log(run, 'recorder-stop-error', { error: errorToJSON(stopError) });
                }
            }
            this._finalizeError(run);
        }

        _finalizeError(run) {
            if (run.settled) return;
            const report = this._buildReport(run, 'error');
            report.error = errorToJSON(run.error);
            this._setWindowReport(report);
            this._emit('error', { runId: run.id, error: run.error, report });
            this._cleanup(run);
            run.settled = true;
            run.reject(run.error || new Error('Promo recording failed.'));
        }

        _stopTransport(run) {
            if (run.clockTimer) {
                clearTimeout(run.clockTimer);
                run.clockTimer = null;
            }
            if (run.transport) run.transport.active = false;
            run.visualTimers.forEach((timer) => global.clearTimeout(timer));
            run.visualTimers.clear();

            const machine = this.machine;
            if (machine.intervalId) {
                clearInterval(machine.intervalId);
                machine.intervalId = null;
            }
            if (typeof machine.cancelPendingSources === 'function') machine.cancelPendingSources();
            machine.isPlaying = false;
            machine.currentBeat = 0;
            if (typeof machine.updateBeatGrid === 'function') machine.updateBeatGrid();
            if (typeof machine.updateSynthGrid === 'function') machine.updateSynthGrid();
            if (typeof machine.setPlayButton === 'function') machine.setPlayButton(false);
        }

        _cleanup(run) {
            run.finishing = true;
            if (run.clockTimer) clearTimeout(run.clockTimer);
            if (run.drawRaf) global.cancelAnimationFrame(run.drawRaf);
            if (run.scrollRaf) global.cancelAnimationFrame(run.scrollRaf);
            run.visualTimers.forEach((timer) => global.clearTimeout(timer));
            run.visualTimers.clear();
            if (typeof this.machine.cancelPendingSources === 'function') {
                this.machine.cancelPendingSources();
            }

            const stopped = new Set();
            const stopTracks = (stream) => {
                if (!stream || typeof stream.getTracks !== 'function') return;
                stream.getTracks().forEach((track) => {
                    if (stopped.has(track)) return;
                    stopped.add(track);
                    try { track.stop(); } catch (_) { /* no-op */ }
                });
            };
            stopTracks(run.combinedStream);
            stopTracks(run.canvasStream);
            stopTracks(run.displayStream);
            if (run.appAudioTrack && !stopped.has(run.appAudioTrack)) {
                try { run.appAudioTrack.stop(); } catch (_) { /* no-op */ }
            }

            if (run.videoElement) {
                try { run.videoElement.pause(); } catch (_) { /* no-op */ }
                run.videoElement.srcObject = null;
                run.videoElement.remove();
            }

            this._deactivateCaptureLayout(run);
            this._restoreAppState(run);
            run.chunks = [];
            run.actions = [];
            run.canvas = null;
            run.canvasContext = null;
            run.videoElement = null;
            run.displayStream = null;
            run.canvasStream = null;
            run.combinedStream = null;
            run.outputVideoTrack = null;
            run.appAudioTrack = null;
            if (this._run === run) this._run = null;
        }

        _snapshotAppState(run) {
            if (run.appStateSnapshotted) return;
            const machine = this.machine;
            const library = machine.loopLibrary;
            try {
                if (library) {
                    run.machineStateSnapshot = library.collectState();
                    run.loopHistorySnapshot = global.localStorage.getItem(library.storageKey);
                    run.loopHistoryHadValue = run.loopHistorySnapshot !== null;
                }
            } catch (error) {
                this._log(run, 'app-state-snapshot-warning', { error: errorToJSON(error) });
            }
            run.hashSnapshot = global.location ? global.location.hash : '';
            run.scrollYSnapshot = Number(global.scrollY || global.pageYOffset || 0);
            const section = typeof document !== 'undefined'
                ? document.getElementById('loopLibrarySection') : null;
            run.loopSectionOpenSnapshot = Boolean(section && section.open);
            const status = typeof document !== 'undefined' ? document.getElementById('status') : null;
            run.statusSnapshot = status ? status.textContent : '';
            machine.suspendLoopAutoSave = true;
            clearTimeout(machine.loopLibrarySaveTimer);
            machine.loopLibrarySaveTimer = null;
            run.appStateSnapshotted = true;
        }

        _restoreAppState(run) {
            if (!run.appStateSnapshotted) return;
            const machine = this.machine;
            const library = machine.loopLibrary;
            clearTimeout(machine.loopLibrarySaveTimer);
            machine.loopLibrarySaveTimer = null;
            try {
                if (library && run.machineStateSnapshot) {
                    library.applyState(run.machineStateSnapshot, { silent: true });
                }
                if (library) {
                    if (run.loopHistoryHadValue) {
                        global.localStorage.setItem(library.storageKey, run.loopHistorySnapshot);
                    } else {
                        global.localStorage.removeItem(library.storageKey);
                    }
                    library.renderHistory();
                }
                if (global.location && global.history) {
                    const url = new URL(global.location.href);
                    url.hash = run.hashSnapshot ? run.hashSnapshot.slice(1) : '';
                    global.history.replaceState(null, '', url.href);
                }
            } catch (error) {
                this._log(run, 'app-state-restore-warning', { error: errorToJSON(error) });
            } finally {
                machine.suspendLoopAutoSave = false;
            }

            if (typeof document !== 'undefined') {
                const section = document.getElementById('loopLibrarySection');
                if (section) section.open = run.loopSectionOpenSnapshot;
                const status = document.getElementById('status');
                if (status && run.statusSnapshot) status.textContent = run.statusSnapshot;
            }
            if (typeof global.scrollTo === 'function') {
                global.scrollTo({ top: run.scrollYSnapshot, left: 0, behavior: 'auto' });
            }
            run.appStateSnapshotted = false;
        }

        _activateCaptureLayout(run) {
            if (typeof document === 'undefined') return;
            document.documentElement.classList.add(ROOT_ACTIVE_CLASS);
            if (document.body) {
                document.body.classList.add(run.kind === 'record' ? 'promo-capturing' : 'promo-previewing');
            }
            run.hiddenPanels = [...document.querySelectorAll(PANEL_SELECTOR)];
            run.hiddenPanels.forEach((panel) => panel.classList.add(PANEL_HIDDEN_CLASS));
        }

        _deactivateCaptureLayout(run) {
            if (typeof document === 'undefined') return;
            document.documentElement.classList.remove(ROOT_ACTIVE_CLASS);
            if (document.body) document.body.classList.remove('promo-capturing', 'promo-previewing');
            (run.hiddenPanels || []).forEach((panel) => panel.classList.remove(PANEL_HIDDEN_CLASS));
        }

        _installInlineStyle() {
            if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = `
                .${PANEL_HIDDEN_CLASS} { display: none !important; }
                html.${ROOT_ACTIVE_CLASS} { scroll-behavior: auto !important; }
                html.${ROOT_ACTIVE_CLASS} body { scroll-behavior: auto !important; }
                ${ACTIVE_PANEL_SELECTOR} { display: none !important; }
            `;
            document.head.appendChild(style);
        }

        _scrollTo(target, run = this._run, durationSeconds = SCROLL_TWEEN_SECONDS) {
            if (typeof document === 'undefined' || typeof global.scrollTo !== 'function') return;
            const element = target === 'synth'
                ? document.getElementById('synthLane')
                : target === 'library'
                    ? document.getElementById('loopLibrarySection')
                : document.getElementById('normalModeControls');
            if (target !== 'top' && !element) return;

            const startY = Number(global.scrollY || global.pageYOffset || 0);
            const targetY = target === 'top'
                ? 0
                : Math.max(0, startY + element.getBoundingClientRect().top);
            if (run && run.scrollRaf) {
                global.cancelAnimationFrame(run.scrollRaf);
                run.scrollRaf = null;
            }
            if (!run || durationSeconds <= 0 || Math.abs(targetY - startY) < 1) {
                global.scrollTo({ top: targetY, left: 0, behavior: 'auto' });
                return;
            }

            const startCtx = run.context.currentTime;
            const draw = () => {
                if (this._run !== run || run.settled || run.finishing) return;
                const progress = Math.min(1, Math.max(0, (run.context.currentTime - startCtx) / durationSeconds));
                const eased = 1 - Math.pow(1 - progress, 3);
                global.scrollTo({ top: startY + (targetY - startY) * eased, left: 0, behavior: 'auto' });
                if (progress < 1) {
                    run.scrollRaf = global.requestAnimationFrame(draw);
                } else {
                    run.scrollRaf = null;
                }
            };
            run.scrollRaf = global.requestAnimationFrame(draw);
        }

        _pulseControl(id, run = this._run) {
            if (typeof document === 'undefined') return;
            const element = document.getElementById(id);
            if (!element) return;
            element.classList.remove('promo-pulse');
            void element.offsetWidth;
            element.classList.add('promo-pulse');
            const timer = global.setTimeout(() => {
                element.classList.remove('promo-pulse');
                if (run) run.visualTimers.delete(timer);
            }, 560);
            if (run) run.visualTimers.add(timer);
        }

        _setControlValue(id, value) {
            if (typeof document === 'undefined') return;
            const element = document.getElementById(id);
            if (element) element.value = value;
        }

        _setText(id, value) {
            if (typeof document === 'undefined') return;
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        }

        _withSeed(seed, callback) {
            const originalRandom = Math.random;
            Math.random = mulberry32(seed >>> 0);
            try {
                return callback();
            } finally {
                Math.random = originalRandom;
            }
        }

        _downloadBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            anchor.style.display = 'none';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            global.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }

        _getOutputTimestamp(context) {
            if (typeof context.getOutputTimestamp === 'function') {
                try { return context.getOutputTimestamp(); } catch (_) { /* no-op */ }
            }
            return {
                contextTime: context.currentTime,
                performanceTime: global.performance ? performance.now() : null,
            };
        }

        _log(run, type, detail = {}) {
            run.events.push({
                ...detail,
                sequence: run.events.length,
                type,
                ctxTime: run.context ? run.context.currentTime : null,
                elapsed: run.epochCtx == null || !run.context ? null : run.context.currentTime - run.epochCtx,
                performanceNow: global.performance ? performance.now() : null,
            });
        }

        _buildReport(run, status) {
            const stepEvents = run.events.filter((event) => event.type === 'transport-step');
            const visualEvents = run.events.filter((event) => event.type === 'visual-render');
            const lateness = stepEvents
                .map((event) => event.latenessMs)
                .filter((value) => Number.isFinite(value))
                .sort((left, right) => left - right);
            const visualLateness = visualEvents
                .map((event) => event.latenessMs)
                .filter((value) => Number.isFinite(value))
                .sort((left, right) => left - right);
            const percentile = (fraction) => {
                if (!lateness.length) return null;
                return lateness[Math.min(lateness.length - 1, Math.floor((lateness.length - 1) * fraction))];
            };
            const visualPercentile = (fraction) => {
                if (!visualLateness.length) return null;
                return visualLateness[
                    Math.min(visualLateness.length - 1, Math.floor((visualLateness.length - 1) * fraction))
                ];
            };
            const displayTrack = run.displayStream && run.displayStream.getVideoTracks()[0];
            const canvasTrack = run.canvasStream && run.canvasStream.getVideoTracks()[0];
            const outputVideoTrack = run.outputVideoTrack;

            return {
                schema: 'beatbox-promo-report/v1',
                recorderVersion: VERSION,
                status,
                runId: run.id,
                kind: run.kind,
                createdAt: run.createdAt,
                seed: run.seed,
                timeline: {
                    durationSeconds: run.duration,
                    initialSilenceSeconds: INITIAL_SILENCE_SECONDS,
                    epochCtx: run.epochCtx,
                    plannedEndCtx: run.epochCtx == null ? null : run.epochCtx + run.duration,
                    actualEndCtx: run.actualEndCtx,
                },
                clock: {
                    sampleRate: run.context ? run.context.sampleRate : null,
                    state: run.context ? run.context.state : null,
                    baseLatency: run.context && Number.isFinite(run.context.baseLatency) ? run.context.baseLatency : null,
                    outputLatency: run.context && Number.isFinite(run.context.outputLatency) ? run.context.outputLatency : null,
                    recorderStartCtx: run.mediaRecorderStartCtx,
                    startOutputTimestamp: run.startOutputTimestamp || null,
                    performanceTimeOrigin: global.performance ? performance.timeOrigin : null,
                },
                capture: {
                    width: WIDTH,
                    height: HEIGHT,
                    fps: FPS,
                    videoPath: run.videoPath,
                    mimeType: run.recorderMimeType,
                    displaySettings: displayTrack && displayTrack.getSettings ? displayTrack.getSettings() : null,
                    canvasSettings: canvasTrack && canvasTrack.getSettings ? canvasTrack.getSettings() : null,
                    outputVideoSettings: outputVideoTrack && outputVideoTrack.getSettings
                        ? outputVideoTrack.getSettings()
                        : null,
                    crop: run.crop,
                    captureDestinationOwned: this._captureDestinationOwned,
                    videoBitsPerSecond: 5_000_000,
                    audioBitsPerSecond: 192_000,
                },
                demo: {
                    tempo: PROMO_TEMPO,
                    bassVoices: [
                        { root: 'C', octave: 2, wave: 'sawtooth' },
                        { root: 'D', octave: 2, wave: 'square' },
                    ],
                    playbackContinuous: true,
                    bassMidiRange: [43, 54],
                    bassMidiRangeAsserted: run.bassMidiRangeAsserted,
                    bassMidiAudits: deepCopy(run.bassMidiAudits || []),
                },
                timing: {
                    audioLookaheadSeconds: AUDIO_LOOKAHEAD_SECONDS,
                    scheduledSteps: stepEvents.length,
                    p50LatenessMs: percentile(0.50),
                    p95LatenessMs: percentile(0.95),
                    maxLatenessMs: lateness.length ? lateness[lateness.length - 1] : null,
                    visualP50LatenessMs: visualPercentile(0.50),
                    visualP95LatenessMs: visualPercentile(0.95),
                    visualMaxLatenessMs: visualLateness.length
                        ? visualLateness[visualLateness.length - 1]
                        : null,
                    capturedVisualFrames: run.visualFrames.length,
                },
                events: deepCopy(run.events),
                visualFrames: deepCopy(run.visualFrames),
                error: errorToJSON(run.error),
            };
        }

        _setWindowReport(report) {
            global.__beatboxPromoReport = report;
        }

        _emit(name, detail) {
            if (typeof global.dispatchEvent !== 'function' || typeof global.CustomEvent !== 'function') return;
            global.dispatchEvent(new CustomEvent(`beatbox-promo-${name}`, { detail }));
        }

        _assertRunCurrent(run) {
            if (this._run !== run || run.settled || run.cancelled) {
                throw new DOMException('The promo run is no longer active.', 'AbortError');
            }
        }
    }

    BeatboxPromoRecorder.VERSION = VERSION;
    BeatboxPromoRecorder.WIDTH = WIDTH;
    BeatboxPromoRecorder.HEIGHT = HEIGHT;
    BeatboxPromoRecorder.FPS = FPS;
    BeatboxPromoRecorder.DURATION_SECONDS = DURATION_SECONDS;
    BeatboxPromoRecorder.INITIAL_SILENCE_SECONDS = INITIAL_SILENCE_SECONDS;
    BeatboxPromoRecorder.ROOT_ACTIVE_CLASS = ROOT_ACTIVE_CLASS;
    BeatboxPromoRecorder.PANEL_HIDDEN_CLASS = PANEL_HIDDEN_CLASS;

    global.BeatboxPromoRecorder = BeatboxPromoRecorder;
})(typeof window !== 'undefined' ? window : globalThis);
