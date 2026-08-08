(function (global) {
    'use strict';

    const PRESETS = Object.freeze([
        {
            id: 'midnight-stride',
            name: 'Midnight Stride',
            category: '80s Pop',
            description: '절제된 80년대 팝 질감을 새롭게 만든 타이트한 드럼·베이스 그루브',
            gridMode: '16', kit: 'electro', tempo: 117, swing: 2, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], W: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [15], F: [12], H: [11],
            },
            probability: { F: { 12: 50 }, H: { 11: 35 } },
            synth: {
                scale: 'minorPent', rootNote: 9, octave: 2, wave: 'sawtooth', volume: 0.82,
                pattern: [0, null, 3, null, 0, 2, null, 1, 0, null, 3, 2, 0, null, 1, 3],
            },
        },
        {
            id: 'pocket-circuit',
            name: 'Pocket Circuit',
            category: 'Funk',
            description: '킥과 베이스가 서로 비켜 가며 밀고 당기는 타이트한 신코페이션 펑크',
            gridMode: '16', kit: 'acoustic', tempo: 106, swing: 14, listenBars: 8,
            hits: {
                Q: [0, 3, 7, 10, 12, 15], W: [4, 12, 14], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [7, 15], F: [4, 12], G: [5, 11],
            },
            probability: { W: { 14: 35 }, G: { 5: 65, 11: 55 } },
            synth: {
                scale: 'dorian', rootNote: 0, octave: 2, wave: 'square', volume: 0.78,
                pattern: [7, null, 4, 5, null, 7, 6, null, 7, 4, null, 8, 5, null, 6, 4],
            },
        },
        {
            id: 'coastal-steps',
            name: 'Coastal Steps',
            category: 'Afro Latin',
            description: '콩가·쉐이커·카우벨을 촘촘하게 엮은 가벼운 해안가 퍼커션 루프',
            gridMode: '16', kit: 'acoustic', tempo: 110, swing: 8, listenBars: 8,
            hits: {
                Q: [0, 6, 8, 14], W: [4, 12], H: [6, 14], J: [1, 4, 7, 9, 12, 15],
                Z: [0, 2, 4, 6, 8, 10, 12, 14], G: [3, 7, 11, 15],
            },
            probability: { J: { 7: 75, 15: 70 }, G: { 3: 80, 11: 70 }, Z: { 6: 75, 14: 70 } },
            synth: {
                scale: 'majorPent', rootNote: 7, octave: 2, wave: 'triangle', volume: 0.76,
                pattern: [0, null, 3, null, 1, null, 2, 3, 0, null, 4, null, 3, 2, null, 1],
            },
        },
        {
            id: 'sunrise-floor',
            name: 'Sunrise Floor',
            category: 'Deep House',
            description: '정박 킥과 업비트 하이햇 위로 낮게 움직이는 새벽빛 딥하우스',
            gridMode: '16', kit: 'tr808', tempo: 124, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], W: [4, 12], F: [4, 12], R: [2, 6, 10, 14],
                E: [1, 3, 5, 7, 9, 11, 13, 15],
            },
            probability: { E: { 3: 72, 7: 78, 11: 72, 15: 82 } },
            synth: {
                scale: 'naturalMinor', rootNote: 7, octave: 2, wave: 'sawtooth', volume: 0.84,
                pattern: [0, null, 0, 4, null, 2, 0, null, 0, null, 6, 4, null, 2, 4, null],
            },
        },
        {
            id: 'neon-freeway',
            name: 'Neon Freeway',
            category: 'Synthwave',
            description: '넓은 신스 베이스와 단단한 백비트가 이어지는 야간 고속도로 신스웨이브',
            gridMode: '16', kit: 'electro', tempo: 100, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 3, 8, 11], W: [4, 12], F: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [7, 15], A: [14], S: [15],
            },
            probability: { A: { 14: 40 }, S: { 15: 40 } },
            synth: {
                scale: 'naturalMinor', rootNote: 8, octave: 2, wave: 'sawtooth', volume: 0.86,
                pattern: [0, null, null, 0, 4, null, 2, null, 0, null, null, 5, 4, null, 2, 1],
            },
        },
        {
            id: 'triplet-caravan',
            name: 'Triplet Caravan',
            category: 'Triplet Shuffle',
            description: '24스텝 3연음 위에서 라이드와 퍼커션이 구르는 유연한 셔플',
            gridMode: '24', kit: 'acoustic', tempo: 112, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 8, 12, 18, 20], W: [3, 9, 15, 21],
                E: [0, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23],
                Y: [0, 6, 12, 18], J: [5, 11, 17, 23],
            },
            probability: { J: { 5: 60, 11: 70, 17: 60, 23: 75 } },
            synth: {
                scale: 'minorPent', rootNote: 2, octave: 2, wave: 'triangle', volume: 0.78,
                pattern: [
                    5, null, 4, null, null, 3, 2, null, null, 3, null, 4,
                    5, null, 4, null, null, 3, 2, null, null, 6, null, 4,
                ],
            },
        },
        {
            id: 'velvet-room',
            name: 'Velvet Room',
            category: 'Neo Soul',
            description: '여백 많은 킥과 부드러운 사인 베이스가 뒤로 기대는 네오소울 포켓',
            gridMode: '16', kit: 'acoustic', tempo: 88, swing: 26, listenBars: 8,
            hits: {
                Q: [0, 6, 10, 15], W: [4, 12], F: [12], H: [3, 11],
                E: [0, 2, 5, 8, 10, 13], R: [7, 15],
            },
            probability: { H: { 3: 55, 11: 70 }, E: { 5: 72, 13: 68 } },
            synth: {
                scale: 'dorian', rootNote: 9, octave: 2, wave: 'sine', volume: 0.72,
                pattern: [0, null, null, 2, null, 4, null, null, 0, null, 3, null, null, 1, null, 4],
            },
        },
        {
            id: 'rainy-window',
            name: 'Rainy Window',
            category: 'Lo-fi Hip-hop',
            description: '느슨한 셰이커와 낮은 삼각파 베이스가 반복되는 빗밤 로파이',
            gridMode: '16', kit: 'acoustic', tempo: 78, swing: 32, listenBars: 8,
            hits: {
                Q: [0, 7, 10], W: [4, 12], H: [3, 11, 15],
                E: [0, 2, 4, 6, 8, 10, 12, 14], Z: [1, 3, 5, 7, 9, 11, 13, 15],
            },
            probability: {
                H: { 3: 40, 11: 65, 15: 35 }, E: { 6: 55, 14: 60 },
                Z: { 1: 62, 3: 70, 5: 58, 7: 72, 9: 64, 11: 55, 13: 68, 15: 60 },
            },
            synth: {
                scale: 'minorPent', rootNote: 2, octave: 2, wave: 'triangle', volume: 0.64,
                pattern: [5, null, null, null, 3, null, null, 4, 2, null, null, null, 3, null, 4, null],
            },
        },
        {
            id: 'broken-metro',
            name: 'Broken Metro',
            category: 'Drum & Bass',
            description: '174 BPM 브레이크와 짧은 사각파 베이스가 맞물리는 고속 드럼앤베이스',
            gridMode: '16', kit: 'electro', tempo: 174, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 10, 14], W: [4, 7, 12, 15], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [7, 15], Y: [3, 11],
            },
            probability: { W: { 7: 28, 15: 38 }, Y: { 3: 35, 11: 42 } },
            synth: {
                scale: 'minorPent', rootNote: 4, octave: 2, wave: 'square', volume: 0.76,
                pattern: [1, null, null, null, 4, null, 3, null, 1, null, null, null, 4, null, 2, null],
            },
        },
    ]);

    const clampIndex = (value) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed)) return 0;
        return ((parsed % PRESETS.length) + PRESETS.length) % PRESETS.length;
    };

    class BeatboxPresetLibrary {
        constructor(machine) {
            if (!machine) throw new TypeError('BeatboxPresetLibrary requires a drum machine.');
            this.machine = machine;
            this.machine.presetLibrary = this;
            this.activeIndex = -1;
            this.listening = false;
            this.completedLoops = 0;
            this.pendingAdvance = false;
            this.savedState = null;
            this.savedHash = null;
            this.previousAutoSaveState = false;
            this.isApplying = false;
            this.sessionToken = 0;
            this.visualTransitionTimer = null;
            this.renderList();
            this.bindControls();
            this.syncUI();
        }

        bindControls() {
            document.getElementById('listenAllBtn')?.addEventListener('click', () => this.toggleListening());
            document.getElementById('listenPrevBtn')?.addEventListener('click', () => this.skip(-1));
            document.getElementById('listenPauseBtn')?.addEventListener('click', () => this.togglePause());
            document.getElementById('listenNextBtn')?.addEventListener('click', () => this.skip(1));
            document.getElementById('listenEditBtn')?.addEventListener('click', () => this.keepCurrentForEditing());
        }

        renderList() {
            const list = document.getElementById('musicPresetList');
            if (!list) return;
            list.innerHTML = PRESETS.map((preset, index) => `
                <button type="button" class="music-preset-card" data-preset-index="${index}"
                    aria-label="${preset.name}, ${preset.category}, ${preset.tempo} BPM 불러오기">
                    <span class="preset-card-index">${String(index + 1).padStart(2, '0')}</span>
                    <span class="preset-card-copy">
                        <strong>${preset.name}</strong>
                        <small>${preset.category} · ${preset.tempo} BPM · ${preset.gridMode} STEP</small>
                        <span>${preset.description}</span>
                    </span>
                    <span class="preset-card-action" aria-hidden="true">불러오기</span>
                </button>
            `).join('');
            list.querySelectorAll('[data-preset-index]').forEach(button => {
                button.addEventListener('click', () => this.loadPreset(Number(button.dataset.presetIndex)));
            });
        }

        get presets() {
            return PRESETS;
        }

        presetToState(preset) {
            const steps = preset.gridMode === '24' ? 24 : 16;
            const pattern = {};
            this.machine.normalSounds.forEach((sound, key) => {
                pattern[key] = Array(steps).fill(false);
            });
            Object.entries(preset.hits).forEach(([key, hitSteps]) => {
                if (!pattern[key]) return;
                hitSteps.forEach(step => {
                    if (Number.isInteger(step) && step >= 0 && step < steps) pattern[key][step] = true;
                });
            });
            const probability = {};
            Object.entries(preset.probability || {}).forEach(([key, row]) => {
                if (!pattern[key]) return;
                probability[key] = { ...row };
            });
            const bassPattern = Array.from({ length: steps }, (_, index) => {
                const row = preset.synth.pattern[index];
                return Number.isInteger(row) && row >= 0 ? row : null;
            });
            return {
                v: 1,
                mode: 'normal',
                gridMode: preset.gridMode,
                kit: preset.kit,
                tempo: preset.tempo,
                swing: preset.swing,
                pattern,
                probability,
                mutedSounds: [],
                synth: {
                    enabled: true,
                    muted: false,
                    scale: preset.synth.scale,
                    rootNote: preset.synth.rootNote,
                    octave: preset.synth.octave,
                    wave: preset.synth.wave,
                    volume: preset.synth.volume,
                    pattern: bassPattern,
                },
            };
        }

        loadPreset(index) {
            this.clearPendingLoopSave();
            if (this.listening) {
                const wasPlaying = this.machine.isPlaying;
                if (wasPlaying) this.machine.stopPlayback();
                const selected = this.applyPreset(index);
                if (wasPlaying) this.machine.startPlayback();
                this.announce(`${selected.name}, ${this.activeIndex + 1}/${PRESETS.length}`);
                this.machine.updateStatus(`감상 모드 · ${selected.name} · ${this.activeIndex + 1}/${PRESETS.length}`);
                this.closeMenuAndFocus();
                return true;
            }
            this.machine.stopPlayback();
            const selected = this.applyPreset(index);
            if (!selected) return false;
            this.machine.updateStatus(`${selected.name} 프리셋을 불러왔습니다. 재생을 누르면 들을 수 있습니다.`);
            this.closeMenuAndFocus();
            return true;
        }

        clearPendingLoopSave() {
            clearTimeout(this.machine.loopLibrarySaveTimer);
            this.machine.loopLibrarySaveTimer = null;
        }

        closeMenuAndFocus() {
            const menu = document.getElementById('musicPresetMenu');
            if (!menu) return;
            menu.open = false;
            requestAnimationFrame(() => menu.querySelector('summary')?.focus({ preventScroll: true }));
        }

        applyPreset(index, options = {}) {
            const nextIndex = clampIndex(index);
            const preset = PRESETS[nextIndex];
            if (!preset) return null;
            const machine = this.machine;
            const state = this.presetToState(preset);
            const previousGridMode = machine.gridMode;
            const previousMode = machine.mode;
            this.isApplying = true;
            try {
                machine.mode = 'normal';
                machine.gridMode = state.gridMode;
                machine.kit = state.kit;
                machine.pattern = state.pattern;
                machine.setGenrePatternSelection?.();
                machine.probability = state.probability;
                machine.mutedSounds = new Set();
                machine.tempo = state.tempo;
                machine.swing = state.swing;
                machine.bassEnabled = true;
                machine.bassMuted = false;
                machine.bassScale = state.synth.scale;
                machine.bassRootNote = state.synth.rootNote;
                machine.bassOctave = state.synth.octave;
                machine.bassWave = state.synth.wave;
                machine.bassVolume = state.synth.volume;
                machine.buildSynthScale();
                machine.bassPattern = state.synth.pattern.map(row =>
                    Number.isInteger(row) && row < machine.synthRows.length ? row : null
                );
                this.activeIndex = nextIndex;
                this.completedLoops = 0;
                this.pendingAdvance = false;
                this.scheduleMachineRender(previousGridMode, previousMode, options.visualAt);
                this.syncUI();
                return preset;
            } finally {
                this.isApplying = false;
            }
        }

        scheduleMachineRender(previousGridMode, previousMode, visualAt) {
            clearTimeout(this.visualTransitionTimer);
            const render = () => {
                this.visualTransitionTimer = null;
                this.renderMachineState(previousGridMode, previousMode);
            };
            if (Number.isFinite(visualAt) && this.machine.audioContext) {
                const delay = Math.max(0, (visualAt - this.machine.audioContext.currentTime - this.machine.visualLeadSeconds) * 1000);
                this.visualTransitionTimer = setTimeout(render, delay);
            } else {
                render();
            }
        }

        renderMachineState(previousGridMode, previousMode, options = {}) {
            const machine = this.machine;
            document.querySelectorAll('.mode-btn').forEach(button => {
                const active = button.dataset.mode === 'normal';
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', String(active));
            });
            document.getElementById('normalModeControls').style.display = 'block';
            document.querySelectorAll('.custom-mode-only').forEach(element => { element.style.display = 'none'; });
            document.getElementById('normalModeHints').style.display = '';
            document.querySelectorAll('#grid16Btn, #grid24Btn').forEach(button => {
                const active = button.dataset.grid === machine.gridMode;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', String(active));
            });
            document.querySelectorAll('.kit-btn').forEach(button => {
                const active = button.dataset.kit === machine.kit;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', String(active));
            });
            this.setRangeControl('tempo', machine.tempo, 'tempoValue', `${machine.tempo} BPM`);
            this.setRangeControl('swing', machine.swing, 'swingValue', `${machine.swing} 퍼센트`);
            machine.populateSynthSelectors();
            if (options.forceRebuild || previousMode !== 'normal' || previousGridMode !== machine.gridMode) {
                machine.createBeatGrid();
            }
            machine.updateBeatGrid();
            machine.createSynthGrid();
            machine.updateSynthGrid();
            machine.updateDrumKitGrid();
            machine.syncSynthToggle();
            machine.syncBassMuteToggle();
            machine.applyMuteState();
            machine.syncMuteAllButton();
            machine.updatePatternDisplay();
        }

        setRangeControl(id, value, valueId, ariaText) {
            const control = document.getElementById(id);
            const output = document.getElementById(valueId);
            if (control) {
                control.value = value;
                control.setAttribute('aria-valuetext', ariaText);
                this.machine.updateSliderFill(id);
            }
            if (output) output.textContent = value;
        }

        async toggleListening() {
            if (this.listening) {
                this.stopListening({ restore: true, stopPlayback: true });
                this.closeMenuAndFocus();
                return;
            }
            await this.startListening(this.activeIndex >= 0 ? this.activeIndex : 0);
        }

        async startListening(index = 0) {
            if (this.listening) return;
            const machine = this.machine;
            this.clearPendingLoopSave();
            machine.stopPlayback();
            this.savedState = machine.loopLibrary ? machine.loopLibrary.collectState() : null;
            this.savedHash = global.location.hash;
            this.previousAutoSaveState = machine.suspendLoopAutoSave;
            machine.suspendLoopAutoSave = true;
            this.listening = true;
            this.sessionToken += 1;
            const sessionToken = this.sessionToken;
            this.completedLoops = 0;
            this.pendingAdvance = false;
            const selected = this.applyPreset(index);
            if (machine.audioContext?.state === 'suspended') {
                try {
                    await machine.audioContext.resume();
                } catch (error) {
                    if (this.listening && sessionToken === this.sessionToken) {
                        this.stopListening({ restore: true, stopPlayback: true, silent: true });
                        machine.updateStatus('오디오 재생을 시작할 수 없습니다. 브라우저의 소리 권한을 확인해주세요.');
                        this.announce('감상 모드를 시작하지 못했습니다.');
                    }
                    return;
                }
            }
            if (!this.listening || sessionToken !== this.sessionToken) return;
            machine.startPlayback();
            const activePreset = PRESETS[this.activeIndex] || selected;
            this.announce(`${activePreset.name}부터 프리셋 전체 감상을 시작합니다.`);
            machine.updateStatus(`감상 모드 · ${activePreset.name} · ${this.activeIndex + 1}/${PRESETS.length}`);
            this.closeMenuAndFocus();
        }

        stopListening(options = {}) {
            if (!this.listening) return false;
            const { restore = false, stopPlayback = true, silent = false } = options;
            const savedState = this.savedState;
            const savedHash = this.savedHash;
            this.listening = false;
            this.sessionToken += 1;
            this.pendingAdvance = false;
            this.completedLoops = 0;
            const hadPendingVisualRender = this.visualTransitionTimer != null;
            clearTimeout(this.visualTransitionTimer);
            this.visualTransitionTimer = null;
            if (stopPlayback) this.machine.stopPlayback();
            this.machine.suspendLoopAutoSave = this.previousAutoSaveState;
            this.savedState = null;
            this.savedHash = null;
            const willRestore = restore && savedState && this.machine.loopLibrary;
            if (willRestore) {
                this.activeIndex = -1;
                this.machine.loopLibrary.applyState(savedState, { silent: true });
                const restoredUrl = new URL(global.location.href);
                restoredUrl.hash = savedHash || '';
                global.history.replaceState(null, '', restoredUrl.href);
                if (!silent) this.machine.updateStatus('감상 전 작업으로 돌아왔습니다.');
            } else {
                if (hadPendingVisualRender) this.renderMachineState(null, null, { forceRebuild: true });
                if (!silent) {
                    const preset = PRESETS[this.activeIndex];
                    this.machine.updateStatus(preset ? `${preset.name}을 편집할 수 있습니다.` : '감상 모드를 종료했습니다.');
                }
            }
            this.syncUI();
            return true;
        }

        keepCurrentForEditing() {
            this.stopListening({ restore: false, stopPlayback: true });
            this.closeMenuAndFocus();
        }

        async togglePause() {
            if (!this.listening) return;
            const sessionToken = this.sessionToken;
            if (this.machine.isPlaying) {
                this.machine.stopPlayback();
                this.completedLoops = 0;
                this.pendingAdvance = false;
                this.machine.updateStatus(`감상 일시정지 · ${PRESETS[this.activeIndex].name}`);
            } else {
                if (this.machine.audioContext?.state === 'suspended') {
                    try {
                        await this.machine.audioContext.resume();
                    } catch (error) {
                        if (this.listening && sessionToken === this.sessionToken) {
                            this.machine.updateStatus('오디오 재생을 계속할 수 없습니다. 브라우저의 소리 권한을 확인해주세요.');
                            this.announce('감상 재개에 실패했습니다.');
                        }
                        return;
                    }
                }
                if (!this.listening || sessionToken !== this.sessionToken) return;
                this.completedLoops = 0;
                this.pendingAdvance = false;
                this.machine.startPlayback();
                this.machine.updateStatus(`감상 계속 · ${PRESETS[this.activeIndex].name}`);
            }
            this.syncUI();
        }

        skip(direction) {
            if (!this.listening) return;
            const wasPlaying = this.machine.isPlaying;
            if (wasPlaying) this.machine.stopPlayback();
            const selected = this.applyPreset(this.activeIndex + direction);
            if (wasPlaying) this.machine.startPlayback();
            this.announce(`${selected.name}, ${this.activeIndex + 1}/${PRESETS.length}`);
            this.machine.updateStatus(`감상 모드 · ${selected.name} · ${this.activeIndex + 1}/${PRESETS.length}`);
        }

        cancelForManualEdit() {
            if (this.isApplying) return false;
            const leftListening = this.listening
                ? this.stopListening({ restore: false, stopPlayback: true, silent: true })
                : false;
            if (this.activeIndex >= 0) {
                this.activeIndex = -1;
                this.syncUI();
            }
            return leftListening;
        }

        onTransportStoppedByUser() {
            if (!this.listening) return false;
            return this.stopListening({ restore: true, stopPlayback: true });
        }

        onPlaybackStateChange() {
            this.syncUI();
        }

        noteScheduledLoopEnd(runToken) {
            if (!this.listening || !this.machine.isPlaying || runToken !== this.machine.playbackRunToken) return;
            const preset = PRESETS[this.activeIndex];
            this.completedLoops += preset.gridMode === '24' ? 2 : 1;
            if (this.completedLoops >= preset.listenBars) this.pendingAdvance = true;
            this.syncUI();
        }

        prepareScheduledStep(step, runToken, audioTime) {
            if (step !== 0 || !this.pendingAdvance || !this.listening || !this.machine.isPlaying) return false;
            if (runToken !== this.machine.playbackRunToken) return false;
            const selected = this.applyPreset(this.activeIndex + 1, { visualAt: audioTime });
            this.announce(`${selected.name}, ${this.activeIndex + 1}/${PRESETS.length}`);
            this.machine.updateStatus(`감상 모드 · ${selected.name} · ${this.activeIndex + 1}/${PRESETS.length}`);
            return true;
        }

        syncUI() {
            const menu = document.getElementById('musicPresetMenu');
            const summaryLabel = document.getElementById('presetMenuLabel');
            const listenButton = document.getElementById('listenAllBtn');
            const deck = document.getElementById('listeningDeck');
            const title = document.getElementById('listeningTitle');
            const meta = document.getElementById('listeningMeta');
            const pause = document.getElementById('listenPauseBtn');
            const preset = this.activeIndex >= 0 ? PRESETS[this.activeIndex] : null;
            menu?.classList.toggle('is-listening', this.listening);
            if (summaryLabel) summaryLabel.textContent = this.listening ? `${this.activeIndex + 1}/${PRESETS.length}` : '프리셋';
            if (listenButton) {
                listenButton.classList.toggle('active', this.listening);
                listenButton.setAttribute('aria-pressed', String(this.listening));
                listenButton.innerHTML = this.listening
                    ? '<svg class="icon"><use href="#i-return"/></svg> 원래 작업으로'
                    : '<svg class="icon"><use href="#i-headphones"/></svg> 전체 감상';
            }
            if (deck) deck.hidden = !this.listening;
            if (title) title.textContent = preset ? preset.name : '프리셋 감상';
            if (meta && preset) meta.textContent = `${this.activeIndex + 1} / ${PRESETS.length} · ${Math.min(this.completedLoops, preset.listenBars)} / ${preset.listenBars}마디`;
            if (pause) {
                pause.setAttribute('aria-label', this.machine.isPlaying ? '감상 일시정지' : '감상 계속 재생');
                pause.innerHTML = this.machine.isPlaying
                    ? '<svg class="icon"><use href="#i-pause"/></svg>'
                    : '<svg class="icon"><use href="#i-play"/></svg>';
            }
            document.querySelectorAll('[data-preset-index]').forEach(button => {
                const active = Number(button.dataset.presetIndex) === this.activeIndex;
                button.classList.toggle('active', active);
                if (active) button.setAttribute('aria-current', 'true');
                else button.removeAttribute('aria-current');
            });
        }

        announce(message) {
            const live = document.getElementById('presetLiveStatus');
            if (live) live.textContent = message;
        }
    }

    global.BeatboxMusicPresets = PRESETS;
    global.BeatboxPresetLibrary = BeatboxPresetLibrary;
})(window);
