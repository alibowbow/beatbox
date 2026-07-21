(function (global) {
    'use strict';

    const STORAGE_KEY = 'beatbox-history-v1';
    const SCHEMA_VERSION = 1;
    const MAX_HISTORY = 12;
    const MAX_HASH_LENGTH = 80000;
    const SAFE_WAVES = new Set(['sawtooth', 'square', 'triangle', 'sine']);
    const SAFE_KITS = new Set(['acoustic', 'tr808', 'electro']);
    const SAFE_MODES = new Set(['normal', 'custom']);

    function clampInteger(value, min, max, fallback) {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
    }

    function clampNumber(value, min, max, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
    }

    function safeKey(key) {
        return typeof key === 'string' && /^[A-Z]$/.test(key);
    }

    class BeatboxLoopLibrary {
        constructor(machine) {
            if (!machine) throw new TypeError('BeatboxLoopLibrary requires a drum machine.');
            this.machine = machine;
            this.storageKey = STORAGE_KEY;
            this.maxHistory = MAX_HISTORY;
            this._boundHashChange = () => this.restoreStateFromUrl({ source: 'hashchange' });
            global.addEventListener('hashchange', this._boundHashChange);
            this.renderHistory();
        }

        destroy() {
            global.removeEventListener('hashchange', this._boundHashChange);
        }

        collectState() {
            const machine = this.machine;
            const steps = machine.gridMode === '24' ? 24 : 16;
            const pattern = {};
            const probability = {};
            const sounds = machine.mode === 'custom' ? machine.customSounds : machine.normalSounds;

            sounds.forEach((sound, key) => {
                pattern[key] = Array.from({ length: steps }, (_, index) =>
                    Boolean(machine.pattern[key] && machine.pattern[key][index])
                );
                const source = machine.probability[key];
                if (!source) return;
                const saved = {};
                for (let index = 0; index < steps; index += 1) {
                    if (source[index] == null) continue;
                    const value = clampInteger(source[index], 0, 100, 100);
                    if (value < 100) saved[index] = value;
                }
                if (Object.keys(saved).length) probability[key] = saved;
            });

            return {
                v: SCHEMA_VERSION,
                mode: SAFE_MODES.has(machine.mode) ? machine.mode : 'normal',
                gridMode: steps === 24 ? '24' : '16',
                kit: SAFE_KITS.has(machine.kit) ? machine.kit : 'acoustic',
                tempo: clampInteger(machine.tempo, 60, 200, 120),
                swing: clampInteger(machine.swing, 0, 70, 0),
                pattern,
                probability,
                mutedSounds: [...machine.mutedSounds].filter(safeKey),
                synth: {
                    enabled: machine.bassEnabled !== false,
                    muted: machine.bassMuted === true,
                    scale: this._safeScale(machine.bassScale),
                    rootNote: clampInteger(machine.bassRootNote, 0, 11, 0),
                    octave: clampInteger(machine.bassOctave, 1, 4, 2),
                    wave: SAFE_WAVES.has(machine.bassWave) ? machine.bassWave : 'sawtooth',
                    volume: clampNumber(machine.bassVolume, 0, 1.5, 0.9),
                    pattern: Array.from({ length: steps }, (_, index) => {
                        const row = machine.bassPattern[index];
                        return Number.isInteger(row) && row >= 0 && row < 32 ? row : null;
                    }),
                },
            };
        }

        normalizeState(input) {
            if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
            if (input.v != null && Number(input.v) !== SCHEMA_VERSION) return null;
            if ((!input.pattern || typeof input.pattern !== 'object') &&
                (!input.synth || typeof input.synth !== 'object')) return null;

            const machine = this.machine;
            const mode = SAFE_MODES.has(input.mode) ? input.mode : 'normal';
            const inferredSteps = this._inferSteps(input);
            const gridMode = input.gridMode === '24' || inferredSteps === 24 ? '24' : '16';
            const steps = gridMode === '24' ? 24 : 16;
            const kit = SAFE_KITS.has(input.kit) ? input.kit : 'acoustic';
            const pattern = {};
            const rawPattern = input.pattern && typeof input.pattern === 'object' ? input.pattern : {};

            Object.keys(rawPattern).slice(0, 26).forEach(key => {
                if (!safeKey(key) || !Array.isArray(rawPattern[key])) return;
                pattern[key] = Array.from({ length: steps }, (_, index) =>
                    rawPattern[key][index] === true || rawPattern[key][index] === 1
                );
            });

            const probability = {};
            const rawProbability = input.probability && typeof input.probability === 'object'
                ? input.probability : {};
            Object.keys(rawProbability).slice(0, 26).forEach(key => {
                if (!safeKey(key) || !pattern[key]) return;
                const row = rawProbability[key];
                if (!row || typeof row !== 'object') return;
                const cleaned = {};
                for (let index = 0; index < steps; index += 1) {
                    if (row[index] == null) continue;
                    const value = clampInteger(row[index], 0, 100, 100);
                    if (value < 100) cleaned[index] = value;
                }
                if (Object.keys(cleaned).length) probability[key] = cleaned;
            });

            const rawSynth = input.synth && typeof input.synth === 'object' ? input.synth : {};
            const synthPattern = Array.isArray(rawSynth.pattern) ? rawSynth.pattern : [];
            const synthScale = this._safeScale(rawSynth.scale);
            const maxSynthRows = this._synthRowCount(synthScale);
            const mutedSounds = Array.isArray(input.mutedSounds)
                ? [...new Set(input.mutedSounds.filter(key => safeKey(key) && pattern[key]))]
                : [];

            return {
                v: SCHEMA_VERSION,
                mode,
                gridMode,
                kit,
                tempo: clampInteger(input.tempo, 60, 200, clampInteger(machine.tempo, 60, 200, 120)),
                swing: clampInteger(input.swing, 0, 70, 0),
                pattern,
                probability,
                mutedSounds,
                synth: {
                    enabled: rawSynth.enabled !== false,
                    muted: rawSynth.muted === true,
                    scale: synthScale,
                    rootNote: clampInteger(rawSynth.rootNote, 0, 11, 0),
                    octave: clampInteger(rawSynth.octave, 1, 4, 2),
                    wave: SAFE_WAVES.has(rawSynth.wave) ? rawSynth.wave : 'sawtooth',
                    volume: clampNumber(rawSynth.volume, 0, 1.5, 0.9),
                    pattern: Array.from({ length: steps }, (_, index) => {
                        const row = synthPattern[index];
                        return Number.isInteger(row) && row >= 0 && row < maxSynthRows ? row : null;
                    }),
                },
            };
        }

        applyState(input, options = {}) {
            const state = this.normalizeState(input);
            if (!state) {
                if (!options.silent) this._status('저장된 루프 형식이 올바르지 않습니다.');
                return false;
            }

            const machine = this.machine;
            clearTimeout(machine.loopLibrarySaveTimer);
            machine.loopLibrarySaveTimer = null;
            machine.stopPlayback();
            machine.setMode(state.mode);
            machine.setGridMode(state.gridMode);
            if (state.mode === 'normal') machine.setDrumKit(state.kit);

            const steps = state.gridMode === '24' ? 24 : 16;
            const sounds = state.mode === 'custom' ? machine.customSounds : machine.normalSounds;
            const restoredPattern = {};
            sounds.forEach((sound, key) => {
                restoredPattern[key] = Array.from({ length: steps }, (_, index) =>
                    Boolean(state.pattern[key] && state.pattern[key][index])
                );
            });
            machine.pattern = restoredPattern;
            machine.probability = {};
            Object.keys(state.probability).forEach(key => {
                if (!restoredPattern[key]) return;
                machine.probability[key] = { ...state.probability[key] };
            });
            machine.mutedSounds = new Set(state.mutedSounds.filter(key => restoredPattern[key]));

            machine.tempo = state.tempo;
            machine.swing = state.swing;
            this._setControl('tempo', state.tempo, 'tempoValue');
            this._setControl('swing', state.swing, 'swingValue');

            machine.bassEnabled = state.synth.enabled;
            machine.bassMuted = state.synth.muted;
            machine.bassScale = state.synth.scale;
            machine.bassRootNote = state.synth.rootNote;
            machine.bassOctave = state.synth.octave;
            machine.bassWave = state.synth.wave;
            machine.bassVolume = state.synth.volume;
            machine.populateSynthSelectors();
            machine.buildSynthScale();
            machine.bassPattern = state.synth.pattern.map(row =>
                Number.isInteger(row) && row >= 0 && row < machine.synthRows.length ? row : null
            );

            machine.createBeatGrid();
            machine.updateBeatGrid();
            machine.createSynthGrid();
            machine.updateSynthGrid();
            machine.syncSynthToggle();
            machine.syncBassMuteToggle();
            machine.applyMuteState();
            machine.syncMuteAllButton();
            machine.updatePatternDisplay();

            if (!options.silent) this._status('저장된 드럼 & 베이스 루프를 불러왔습니다.');
            return true;
        }

        encodeState(input = this.collectState()) {
            const state = this.normalizeState(input);
            if (!state) return '';
            try {
                const bytes = new TextEncoder().encode(JSON.stringify(state));
                let binary = '';
                for (let index = 0; index < bytes.length; index += 1) {
                    binary += String.fromCharCode(bytes[index]);
                }
                return global.btoa(binary)
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/g, '');
            } catch (error) {
                return '';
            }
        }

        decodeState(encoded) {
            if (typeof encoded !== 'string' || !encoded || encoded.length > MAX_HASH_LENGTH) return null;
            try {
                const decodedComponent = decodeURIComponent(encoded);
                if (!/^[A-Za-z0-9_\-+/=]+$/.test(decodedComponent)) return null;
                let base64 = decodedComponent.replace(/-/g, '+').replace(/_/g, '/');
                base64 += '='.repeat((4 - (base64.length % 4)) % 4);
                const binary = global.atob(base64);
                const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
                const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
                return this.normalizeState(parsed);
            } catch (error) {
                return null;
            }
        }

        updateShareUrl() {
            const encoded = this.encodeState();
            if (!encoded) return false;
            const url = new URL(global.location.href);
            url.hash = `s=${encoded}`;
            global.history.replaceState(null, '', url.href);
            return true;
        }

        restoreStateFromUrl(options = {}) {
            const match = (global.location.hash || '').match(/(?:^#|&)s=([^&]+)/);
            if (!match) return false;
            const state = this.decodeState(match[1]);
            if (!state) {
                if (!options.silent) this._status('공유 링크의 루프 데이터를 읽을 수 없습니다.');
                return false;
            }
            const applied = this.applyState(state, { silent: true });
            if (applied && !options.silent) this._status('공유된 드럼 & 베이스 루프를 불러왔습니다.');
            return applied;
        }

        async shareCurrentState() {
            const state = this.collectState();
            if (state.mode !== 'normal') {
                this._status('커스텀 녹음 음원은 링크로 공유할 수 없습니다. 일반 드럼 모드에서 사용해주세요.');
                return false;
            }
            if (!this._hasMusicalContent(state)) {
                this._status('공유할 드럼 또는 베이스 패턴을 먼저 만들어주세요.');
                return false;
            }
            if (!this.updateShareUrl()) {
                this._status('공유 링크를 만들지 못했습니다.');
                return false;
            }
            const localFile = global.location.protocol === 'file:';
            const copiedValue = localFile ? global.location.hash : global.location.href;
            try {
                await global.navigator.clipboard.writeText(copiedValue);
                this._status(localFile
                    ? '로컬 파일에서는 #s= 해시만 복사됩니다. 배포된 Beatbox 주소 뒤에 붙여 공유하세요.'
                    : '공유 링크를 클립보드에 복사했습니다.');
            } catch (error) {
                global.prompt(localFile
                    ? '이 해시를 배포된 Beatbox 주소 뒤에 붙여 공유하세요:'
                    : '아래 링크를 복사하세요:', copiedValue);
            }
            return true;
        }

        loadHistory() {
            try {
                const parsed = JSON.parse(global.localStorage.getItem(this.storageKey));
                if (!Array.isArray(parsed)) return [];
                return parsed.slice(0, this.maxHistory).flatMap(item => {
                    if (!item || typeof item !== 'object') return [];
                    const state = this.normalizeState(item.state);
                    if (!state) return [];
                    const ts = Number.isFinite(Number(item.ts)) ? Number(item.ts) : Date.now();
                    return [{
                        id: typeof item.id === 'string' ? item.id.slice(0, 80) : String(ts),
                        ts,
                        label: this._makeLabel(state),
                        preview: this._makePreview(state),
                        state,
                    }];
                });
            } catch (error) {
                return [];
            }
        }

        persistHistory(list) {
            try {
                global.localStorage.setItem(this.storageKey, JSON.stringify(list.slice(0, this.maxHistory)));
                return true;
            } catch (error) {
                this._status('브라우저 저장 공간을 사용할 수 없습니다.');
                return false;
            }
        }

        saveToHistory(silent = false) {
            const state = this.normalizeState(this.collectState());
            if (state && state.mode !== 'normal') {
                if (!silent) this._status('커스텀 녹음 음원은 저장소에 담을 수 없습니다. 일반 드럼 모드에서 사용해주세요.');
                return false;
            }
            if (!state || !this._hasMusicalContent(state)) {
                if (!silent) this._status('저장할 드럼 또는 베이스 패턴을 먼저 만들어주세요.');
                return false;
            }
            const fingerprint = this._fingerprint(state);
            const now = Date.now();
            const list = this.loadHistory().filter(item => this._fingerprint(item.state) !== fingerprint);
            const item = {
                id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                ts: now,
                label: this._makeLabel(state),
                preview: this._makePreview(state),
                state,
            };
            list.unshift(item);
            if (!this.persistHistory(list)) return false;
            this.renderHistory();
            if (!silent) this._status('현재 드럼 & 베이스 루프를 저장했습니다.');
            return item;
        }

        restoreHistory(id) {
            const item = this.loadHistory().find(entry => entry.id === String(id));
            if (!item || !this.applyState(item.state, { silent: true })) return false;
            this.updateShareUrl();
            this._status('저장된 드럼 & 베이스 루프를 불러왔습니다.');
            return true;
        }

        deleteHistory(id, event) {
            if (event) event.stopPropagation();
            const next = this.loadHistory().filter(item => item.id !== String(id));
            if (!this.persistHistory(next)) return false;
            this.renderHistory();
            this._status('저장된 루프를 삭제했습니다.');
            return true;
        }

        clearHistory() {
            clearTimeout(this.machine.loopLibrarySaveTimer);
            this.machine.loopLibrarySaveTimer = null;
            if (!this.persistHistory([])) return false;
            this.renderHistory();
            this._status('드럼 & 베이스 저장소를 비웠습니다.');
            return true;
        }

        renderHistory() {
            const host = global.document && global.document.getElementById('loopHistoryList');
            if (!host) return;
            host.replaceChildren();
            const list = this.loadHistory();
            if (!list.length) {
                const empty = global.document.createElement('div');
                empty.className = 'loop-history-empty';
                empty.textContent = '아직 저장된 루프가 없습니다. 비트와 베이스를 만든 뒤 저장해보세요.';
                host.appendChild(empty);
                return;
            }

            list.forEach(item => {
                const row = global.document.createElement('div');
                row.className = 'loop-history-item';

                const restore = global.document.createElement('button');
                restore.type = 'button';
                restore.className = 'loop-history-meta';
                restore.title = '이 루프 불러오기';
                restore.addEventListener('click', () => this.restoreHistory(item.id));

                const title = global.document.createElement('span');
                title.className = 'loop-history-title';
                title.textContent = item.label;
                const preview = global.document.createElement('span');
                preview.className = 'loop-history-preview';
                preview.textContent = item.preview;
                restore.append(title, preview);

                const remove = global.document.createElement('button');
                remove.type = 'button';
                remove.className = 'loop-history-delete';
                remove.title = '저장된 루프 삭제';
                remove.setAttribute('aria-label', `${item.label} 삭제`);
                remove.textContent = '✕';
                remove.addEventListener('click', event => this.deleteHistory(item.id, event));

                row.append(restore, remove);
                host.appendChild(row);
            });
        }

        _safeScale(value) {
            const scales = this.machine.constructor.SCALES || {};
            return typeof value === 'string' && scales[value] ? value : 'minorPent';
        }

        _synthRowCount(scaleName) {
            const scale = (this.machine.constructor.SCALES || {})[scaleName];
            const stepCount = scale && Array.isArray(scale.steps) ? scale.steps.length : 5;
            return stepCount * 2 + 1;
        }

        _inferSteps(input) {
            if (input.gridMode === '24') return 24;
            if (input.gridMode === '16') return 16;
            if (input.synth && Array.isArray(input.synth.pattern) && input.synth.pattern.length >= 24) return 24;
            const pattern = input.pattern && typeof input.pattern === 'object' ? input.pattern : {};
            return Object.values(pattern).some(row => Array.isArray(row) && row.length >= 24) ? 24 : 16;
        }

        _setControl(controlId, value, labelId) {
            const control = global.document.getElementById(controlId);
            const label = global.document.getElementById(labelId);
            if (control) control.value = String(value);
            if (label) label.textContent = String(value);
            if (control && typeof this.machine.updateSliderFill === 'function') {
                this.machine.updateSliderFill(controlId);
            }
        }

        _fingerprint(state) {
            return JSON.stringify(this.normalizeState(state));
        }

        _hasMusicalContent(state) {
            const drum = Object.values(state.pattern).some(row => row.some(Boolean));
            const bass = state.synth.pattern.some(row => row != null);
            return drum || bass;
        }

        _makeLabel(state) {
            const kitNames = { acoustic: '어쿠스틱', tr808: '808 클래식', electro: '일렉트로' };
            const root = (this.machine.constructor.NOTE_NAMES || [])[state.synth.rootNote] || 'C';
            const scale = (this.machine.constructor.SCALES[state.synth.scale] || {}).name || state.synth.scale;
            return `${kitNames[state.kit] || state.kit} · ${state.tempo} BPM · ${root} ${scale}`;
        }

        _makePreview(state) {
            const drumHits = Object.values(state.pattern)
                .reduce((count, row) => count + row.filter(Boolean).length, 0);
            const rootMidi = (state.synth.octave + 1) * 12 + state.synth.rootNote;
            const scaleSteps = (this.machine.constructor.SCALES[state.synth.scale] || { steps: [0] }).steps;
            const rows = [];
            for (let octave = 0; octave < 2; octave += 1) {
                scaleSteps.forEach(step => rows.push(rootMidi + octave * 12 + step));
            }
            rows.push(rootMidi + 24);
            const noteNames = [];
            state.synth.pattern.forEach(row => {
                if (row == null || rows[row] == null) return;
                const name = typeof this.machine.midiToName === 'function'
                    ? this.machine.midiToName(rows[row]) : String(rows[row]);
                if (!noteNames.includes(name)) noteNames.push(name);
            });
            const bass = noteNames.length ? noteNames.slice(0, 6).join(' · ') : 'OFF';
            return `${state.gridMode} STEP · DRUM ${drumHits} HITS · BASS ${bass}`;
        }

        _status(message) {
            if (typeof this.machine.updateStatus === 'function') this.machine.updateStatus(message);
        }
    }

    BeatboxLoopLibrary.STORAGE_KEY = STORAGE_KEY;
    BeatboxLoopLibrary.SCHEMA_VERSION = SCHEMA_VERSION;
    BeatboxLoopLibrary.MAX_HISTORY = MAX_HISTORY;
    global.BeatboxLoopLibrary = BeatboxLoopLibrary;
})(typeof window !== 'undefined' ? window : globalThis);
