(function (global) {
    'use strict';

    const PRESETS = Object.freeze([
        {
            id: 'midnight-stride',
            name: 'Midnight Stride',
            category: '80s Pop', collection: 'pop',
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
            category: 'Funk', collection: 'groove',
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
            category: 'Afro Latin', collection: 'groove',
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
            category: 'Deep House', collection: 'club',
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
            category: 'Synthwave', collection: 'pop',
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
            category: 'Triplet Shuffle', collection: 'breaks',
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
            category: 'Neo Soul', collection: 'chill',
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
            category: 'Lo-fi Hip-hop', collection: 'chill',
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
            category: 'Drum & Bass', collection: 'breaks',
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
        {
            id: 'chrome-horizon',
            name: 'Chrome Horizon',
            category: 'Techno', collection: 'club',
            description: '규칙적인 킥과 미세하게 흔들리는 하이햇 위로 차갑게 반복되는 미니멀 테크노',
            gridMode: '16', kit: 'tr808', tempo: 128, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], W: [4, 12], E: [2, 6, 10, 14], R: [3, 7, 11, 15],
                T: [0, 8], G: [6, 14],
            },
            probability: { E: { 6: 72, 14: 66 }, R: { 7: 48, 15: 58 }, G: { 6: 42, 14: 55 } },
            synth: {
                scale: 'naturalMinor', rootNote: 1, octave: 2, wave: 'sawtooth', volume: 0.84,
                pattern: [0, null, 0, null, 3, null, 0, 5, 0, null, 0, null, 3, null, 5, null],
            },
        },
        {
            id: 'dust-tape',
            name: 'Dust Tape',
            category: 'Boom Bap', collection: 'breaks',
            description: '뒤로 살짝 밀린 스네어와 둔탁한 킥이 오래된 샘플러처럼 흔들리는 붐뱁',
            gridMode: '16', kit: 'acoustic', tempo: 86, swing: 30, listenBars: 8,
            hits: {
                Q: [0, 3, 8, 10], W: [4, 12], H: [3, 11, 15], E: [0, 2, 4, 7, 8, 10, 12, 14],
                Z: [1, 5, 9, 13], F: [12],
            },
            probability: { Q: { 3: 62, 10: 54 }, H: { 3: 48, 15: 36 }, Z: { 1: 58, 5: 46, 9: 64, 13: 52 } },
            synth: {
                scale: 'minorPent', rootNote: 6, octave: 2, wave: 'sine', volume: 0.7,
                pattern: [0, null, null, 3, null, 4, null, null, 0, null, 2, null, null, 4, 3, null],
            },
        },
        {
            id: 'moonlit-garage',
            name: 'Moonlit Garage',
            category: 'UK Garage', collection: 'club',
            description: '엇박 킥과 잘게 잘린 셰이커 사이를 미끄러지는 밤거리 UK 개러지',
            gridMode: '16', kit: 'electro', tempo: 132, swing: 12, listenBars: 8,
            hits: {
                Q: [0, 3, 7, 10, 12, 15], W: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [3, 7, 11, 15], Z: [1, 5, 9, 13], F: [7, 15],
            },
            probability: { Q: { 3: 54, 7: 72, 15: 48 }, R: { 3: 64, 11: 52 }, Z: { 5: 68, 13: 62 } },
            synth: {
                scale: 'dorian', rootNote: 5, octave: 2, wave: 'square', volume: 0.78,
                pattern: [0, null, 3, null, null, 5, 3, null, 0, null, 3, 6, null, 5, 3, null],
            },
        },
        {
            id: 'island-relay',
            name: 'Island Relay',
            category: 'Reggae', collection: 'groove',
            description: '원드롭 킥과 림샷, 가벼운 기타처럼 튀는 베이스가 이어지는 섬의 리듬',
            gridMode: '16', kit: 'acoustic', tempo: 92, swing: 8, listenBars: 8,
            hits: {
                Q: [0, 10], W: [6, 14], H: [2, 6, 10, 14], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [3, 7, 11, 15], G: [4, 12],
            },
            probability: { Q: { 10: 64 }, H: { 2: 62, 10: 54 }, R: { 7: 52, 15: 60 }, G: { 4: 68, 12: 58 } },
            synth: {
                scale: 'majorPent', rootNote: 4, octave: 2, wave: 'triangle', volume: 0.74,
                pattern: [0, null, 2, null, 4, null, 2, 1, 0, null, 2, null, 4, 2, null, 1],
            },
        },
        {
            id: 'rosy-afterglow',
            name: 'Rosy Afterglow',
            category: 'Chillwave', collection: 'chill',
            description: '느린 킥과 넓은 사인 베이스가 저녁빛처럼 번지는 부드러운 칠웨이브',
            gridMode: '16', kit: 'electro', tempo: 96, swing: 10, listenBars: 8,
            hits: {
                Q: [0, 6, 8, 14], W: [4, 12], E: [0, 4, 8, 12], R: [7, 15],
                T: [0], F: [12],
            },
            probability: { Q: { 6: 52, 14: 58 }, E: { 4: 68, 12: 62 }, R: { 7: 46, 15: 55 } },
            synth: {
                scale: 'majorPent', rootNote: 9, octave: 2, wave: 'sine', volume: 0.68,
                pattern: [0, null, null, 2, null, 4, null, null, 0, null, null, 3, null, 2, null, 4],
            },
        },
        {
            id: 'brass-parade',
            name: 'Brass Parade',
            category: 'Jazz Funk', collection: 'groove',
            description: '오픈햇과 카우벨이 악센트를 만들고 베이스가 앞뒤로 튀는 밝은 재즈펑크',
            gridMode: '16', kit: 'acoustic', tempo: 114, swing: 18, listenBars: 8,
            hits: {
                Q: [0, 3, 7, 10, 12], W: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [3, 7, 11, 15], G: [1, 5, 9, 13], J: [6, 14], F: [4, 12],
            },
            probability: { Q: { 3: 58, 7: 66, 10: 46 }, R: { 3: 70, 11: 62 }, G: { 1: 56, 9: 68 }, J: { 6: 54, 14: 62 } },
            synth: {
                scale: 'dorian', rootNote: 2, octave: 2, wave: 'square', volume: 0.76,
                pattern: [0, null, 3, 4, null, 6, 4, null, 0, 2, null, 4, 3, null, 6, 4],
            },
        },
        {
            id: 'paper-satellites',
            name: 'Paper Satellites',
            category: 'Indie Pop', collection: 'pop',
            description: '단순한 백비트와 반짝이는 심벌 사이를 오가는 가벼운 인디팝 루프',
            gridMode: '16', kit: 'acoustic', tempo: 122, swing: 4, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], W: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [6, 14], T: [0, 8], A: [11],
            },
            probability: { E: { 2: 64, 6: 72, 10: 62, 14: 70 }, R: { 6: 52, 14: 64 }, A: { 11: 42 } },
            synth: {
                scale: 'major', rootNote: 7, octave: 2, wave: 'triangle', volume: 0.72,
                pattern: [0, null, 4, null, 2, null, 5, 4, 0, null, 4, null, 2, 5, null, 4],
            },
        },
        {
            id: 'low-gravity',
            name: 'Low Gravity',
            category: 'Future Bass', collection: 'club',
            description: '반 박자 뒤에 떨어지는 킥과 넓게 벌어진 베이스가 떠오르는 퓨처베이스',
            gridMode: '16', kit: 'electro', tempo: 150, swing: 5, listenBars: 8,
            hits: {
                Q: [0, 7, 10, 14], W: [4, 12], F: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [3, 11, 15], T: [0],
            },
            probability: { Q: { 7: 62, 14: 54 }, E: { 6: 68, 14: 74 }, R: { 3: 48, 15: 62 } },
            synth: {
                scale: 'naturalMinor', rootNote: 3, octave: 2, wave: 'sawtooth', volume: 0.86,
                pattern: [0, null, 5, null, 3, null, 7, 5, 0, null, 5, null, 3, 7, null, 5],
            },
        },
        {
            id: 'desert-signal',
            name: 'Desert Signal',
            category: 'Downtempo', collection: 'chill',
            description: '넓은 빈 공간과 낮은 톤의 반복이 모래바람처럼 이어지는 다운템포',
            gridMode: '16', kit: 'acoustic', tempo: 78, swing: 22, listenBars: 8,
            hits: {
                Q: [0, 8, 11], W: [6, 14], H: [3, 11], E: [0, 4, 8, 12], Z: [2, 6, 10, 14],
            },
            probability: { Q: { 11: 46 }, W: { 6: 64, 14: 58 }, H: { 3: 38, 11: 52 }, Z: { 2: 48, 10: 54 } },
            synth: {
                scale: 'minorPent', rootNote: 8, octave: 2, wave: 'triangle', volume: 0.66,
                pattern: [0, null, null, 3, null, null, 4, null, 0, null, null, 2, null, 4, null, null],
            },
        },
        {
            id: 'electric-bloom',
            name: 'Electric Bloom',
            category: 'Trance', collection: 'club',
            description: '네 박 킥 위에서 짧은 베이스가 계속 밀어주는 선명한 트랜스 드라이브',
            gridMode: '16', kit: 'tr808', tempo: 138, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], W: [4, 12], F: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [2, 6, 10, 14], T: [0, 8],
            },
            probability: { E: { 2: 74, 6: 68, 10: 76, 14: 72 }, R: { 2: 55, 10: 62 } },
            synth: {
                scale: 'naturalMinor', rootNote: 6, octave: 2, wave: 'sawtooth', volume: 0.88,
                pattern: [0, 0, 3, 0, 5, 0, 3, 0, 0, 0, 7, 0, 5, 0, 3, 0],
            },
        },
        {
            id: 'pocket-samba',
            name: 'Pocket Samba',
            category: 'Brazilian', collection: 'groove',
            description: '콩가와 쉐이커가 촘촘한 대화를 나누고 베이스가 둥글게 받치는 포켓 삼바',
            gridMode: '16', kit: 'acoustic', tempo: 108, swing: 10, listenBars: 8,
            hits: {
                Q: [0, 6, 8, 14], W: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                J: [1, 3, 5, 7, 9, 11, 13, 15], Z: [0, 2, 4, 6, 8, 10, 12, 14], G: [3, 11],
            },
            probability: { J: { 1: 58, 5: 68, 9: 54, 13: 64 }, Z: { 2: 72, 6: 62, 10: 74, 14: 66 }, G: { 3: 48, 11: 56 } },
            synth: {
                scale: 'majorPent', rootNote: 0, octave: 2, wave: 'triangle', volume: 0.76,
                pattern: [0, null, 2, 4, null, 2, 1, null, 0, null, 4, 2, null, 1, 2, null],
            },
        },
        {
            id: 'blacktop-ritual',
            name: 'Blacktop Ritual',
            category: 'Alt Rock', collection: 'breaks',
            description: '거친 킥과 톰 필, 낮게 붙는 베이스가 한 번에 밀어붙이는 얼터너티브 록',
            gridMode: '16', kit: 'acoustic', tempo: 118, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 3, 4, 8, 10, 12], W: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                T: [0, 8], A: [6, 14], S: [7, 15], D: [14],
            },
            probability: { Q: { 3: 42, 10: 58 }, E: { 2: 70, 6: 64, 10: 72, 14: 62 }, A: { 6: 48, 14: 56 } },
            synth: {
                scale: 'minorPent', rootNote: 4, octave: 2, wave: 'square', volume: 0.84,
                pattern: [0, null, 0, 3, null, 0, 4, null, 0, null, 3, 0, null, 4, 3, null],
            },
        },
        {
            id: 'soft-focus',
            name: 'Soft Focus',
            category: 'Contemporary R&B', collection: 'chill',
            description: '뒤로 기댄 스네어와 짧은 림샷 사이를 부드럽게 흐르는 R&B 그루브',
            gridMode: '16', kit: 'electro', tempo: 74, swing: 28, listenBars: 8,
            hits: {
                Q: [0, 6, 10], W: [4, 12], H: [3, 11], E: [0, 2, 5, 8, 10, 13],
                R: [7, 15], F: [12],
            },
            probability: { Q: { 6: 48, 10: 54 }, H: { 3: 46, 11: 64 }, E: { 5: 58, 13: 66 }, R: { 7: 44, 15: 58 } },
            synth: {
                scale: 'dorian', rootNote: 10, octave: 2, wave: 'sine', volume: 0.7,
                pattern: [0, null, null, 3, null, 5, null, null, 0, null, 2, null, null, 4, null, 5],
            },
        },
        {
            id: 'pixel-runner',
            name: 'Pixel Runner',
            category: 'Chiptune', collection: 'pop',
            description: '짧은 사각파 베이스와 빠른 8비트 하이햇이 달리는 아케이드 스테이지',
            gridMode: '16', kit: 'tr808', tempo: 156, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], W: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [3, 7, 11, 15], G: [5, 13], T: [0, 8],
            },
            probability: { E: { 2: 78, 6: 74, 10: 80, 14: 76 }, R: { 3: 50, 11: 58 }, G: { 5: 48, 13: 52 } },
            synth: {
                scale: 'majorPent', rootNote: 0, octave: 2, wave: 'square', volume: 0.8,
                pattern: [0, 2, 4, 2, 0, 4, 5, 4, 0, 2, 4, 7, 5, 4, 2, 0],
            },
        },
        {
            id: 'halfstep-echo',
            name: 'Halfstep Echo',
            category: 'Dubstep', collection: 'breaks',
            description: '반 박자 브레이크와 무게감 있는 저역이 서로 빈틈을 남기는 하프스텝 덥스텝',
            gridMode: '16', kit: 'electro', tempo: 140, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 6, 10, 14], W: [4, 12], F: [12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [7, 15], Y: [3, 11], T: [0],
            },
            probability: { Q: { 6: 64, 14: 58 }, W: { 4: 68, 12: 72 }, E: { 2: 56, 6: 68, 10: 54, 14: 64 }, Y: { 3: 38, 11: 46 } },
            synth: {
                scale: 'naturalMinor', rootNote: 1, octave: 2, wave: 'square', volume: 0.88,
                pattern: [0, null, null, 0, 5, null, 3, null, 0, null, null, 7, 5, null, 3, null],
            },
        },
        {
            id: 'seoul-afterglow',
            name: 'Seoul Afterglow',
            category: 'City Pop', collection: 'pop',
            description: '밝은 베이스 진행과 정돈된 백비트가 흐르는 야간 도심 시티팝',
            gridMode: '16', kit: 'electro', tempo: 116, swing: 6, listenBars: 8,
            hits: {
                Q: [0, 4, 7, 10, 12, 15], W: [4, 12], F: [4, 12],
                E: [0, 2, 4, 6, 8, 10, 12, 14], R: [6, 14], G: [3, 11],
            },
            probability: { G: { 3: 58, 11: 72 }, R: { 14: 78 } },
            synth: {
                scale: 'majorPent', rootNote: 11, octave: 2, wave: 'triangle', volume: 0.78,
                pattern: [0, null, 4, null, 3, null, 1, 2, 0, null, 4, null, 3, 2, null, 1],
            },
        },
        {
            id: 'silver-line',
            name: 'Silver Line',
            category: 'Disco', collection: 'groove',
            description: '포온더플로어 킥과 옥타브풍 베이스가 곧게 달리는 모던 디스코',
            gridMode: '16', kit: 'acoustic', tempo: 120, swing: 6, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], W: [4, 12], F: [4, 12],
                E: [0, 2, 4, 6, 8, 10, 12, 14], R: [2, 6, 10, 14], X: [3, 7, 11, 15],
            },
            probability: { X: { 3: 70, 7: 76, 11: 68, 15: 82 }, R: { 10: 74 } },
            synth: {
                scale: 'dorian', rootNote: 2, octave: 2, wave: 'square', volume: 0.78,
                pattern: [0, null, 4, 5, 7, null, 4, 3, 0, null, 6, 7, 5, null, 3, 4],
            },
        },
        {
            id: 'submarine-dub',
            name: 'Submarine Dub',
            category: 'Dub Reggae', collection: 'groove',
            description: '원드롭 드럼 사이로 둥근 저음이 길게 숨 쉬는 느긋한 더브 레게',
            gridMode: '16', kit: 'acoustic', tempo: 76, swing: 10, listenBars: 8,
            hits: {
                Q: [8], W: [8], H: [4, 12], E: [2, 6, 10, 14], R: [6, 14], J: [3, 11],
            },
            probability: { H: { 4: 76, 12: 82 }, J: { 3: 55, 11: 64 }, R: { 14: 70 } },
            synth: {
                scale: 'minorPent', rootNote: 7, octave: 2, wave: 'triangle', volume: 0.92,
                pattern: [0, null, 3, null, 4, null, null, 3, 0, null, 1, null, 4, null, 3, null],
            },
        },
        {
            id: 'blue-hour-bossa',
            name: 'Blue Hour',
            category: 'Bossa Nova', collection: 'chill',
            description: '브러시처럼 가벼운 퍼커션과 부드러운 순차 베이스의 보사노바 스케치',
            gridMode: '16', kit: 'acoustic', tempo: 126, swing: 10, listenBars: 8,
            hits: {
                Q: [0, 6, 8, 14], H: [4, 12], Z: [0, 2, 4, 6, 8, 10, 12, 14],
                J: [3, 7, 11, 15], Y: [0, 8],
            },
            probability: {
                Z: { 2: 72, 6: 66, 10: 74, 14: 68 }, J: { 3: 64, 7: 78, 11: 62, 15: 80 },
            },
            synth: {
                scale: 'major', rootNote: 4, octave: 2, wave: 'sine', volume: 0.68,
                pattern: [0, null, 4, null, 2, null, 5, null, 0, null, 6, null, 4, 3, null, 1],
            },
        },
        {
            id: 'motorik-dawn',
            name: 'Motorik Dawn',
            category: 'Krautrock', collection: 'pop',
            description: '곧은 모토릭 드럼과 반복 베이스가 서서히 추진력을 만드는 록 루프',
            gridMode: '16', kit: 'acoustic', tempo: 128, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], W: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                Y: [0, 4, 8, 12], D: [15],
            },
            probability: { Y: { 4: 48, 12: 56 }, D: { 15: 52 } },
            synth: {
                scale: 'naturalMinor', rootNote: 9, octave: 2, wave: 'sawtooth', volume: 0.76,
                pattern: [0, null, 4, null, 0, null, 4, null, 2, null, 5, null, 2, null, 4, null],
            },
        },
        {
            id: 'slow-motion',
            name: 'Slow Motion',
            category: 'Alt R&B', collection: 'chill',
            description: '넓은 여백과 낮은 사인 베이스가 잔향처럼 남는 슬로우 알앤비',
            gridMode: '16', kit: 'electro', tempo: 72, swing: 30, listenBars: 8,
            hits: {
                Q: [0, 7, 11], W: [4, 12], F: [12], H: [3, 15],
                E: [0, 3, 6, 8, 11, 14], Z: [1, 5, 9, 13],
            },
            probability: { H: { 3: 45, 15: 62 }, Z: { 1: 48, 5: 58, 9: 46, 13: 64 } },
            synth: {
                scale: 'dorian', rootNote: 6, octave: 2, wave: 'sine', volume: 0.70,
                pattern: [0, null, null, 4, null, 3, null, null, 0, null, 5, null, null, 2, null, 4],
            },
        },
        {
            id: 'desert-pulse',
            name: 'Desert Pulse',
            category: 'Breakbeat', collection: 'breaks',
            description: '쪼개진 스네어와 탐 필이 거칠게 전진하는 건조한 브레이크비트',
            gridMode: '16', kit: 'electro', tempo: 136, swing: 6, listenBars: 8,
            hits: {
                Q: [0, 3, 8, 10, 14], W: [4, 7, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [6, 15], Y: [2, 10], A: [13], S: [14], D: [15],
            },
            probability: { Y: { 2: 38, 10: 52 }, A: { 13: 56 }, S: { 14: 68 }, D: { 15: 80 } },
            synth: {
                scale: 'minorPent', rootNote: 1, octave: 2, wave: 'sawtooth', volume: 0.82,
                pattern: [0, null, 3, null, null, 4, 2, null, 0, null, 5, null, 3, null, 2, 1],
            },
        },
        {
            id: 'sunday-transit',
            name: 'Sunday Transit',
            category: 'Jazz Shuffle', collection: 'groove',
            description: '24스텝 라이드와 움직이는 베이스가 가볍게 대화하는 재즈 셔플',
            gridMode: '24', kit: 'acoustic', tempo: 108, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 7, 12, 19], W: [6, 18],
                Y: [0, 3, 5, 6, 9, 11, 12, 15, 17, 18, 21, 23],
                H: [5, 11, 17, 23], J: [4, 10, 16, 22],
            },
            probability: {
                H: { 5: 54, 11: 68, 17: 58, 23: 74 }, J: { 4: 46, 10: 58, 16: 48, 22: 64 },
            },
            synth: {
                scale: 'dorian', rootNote: 5, octave: 2, wave: 'triangle', volume: 0.70,
                pattern: [
                    0, null, null, 3, null, 4, 5, null, null, 7, null, 6,
                    0, null, 2, 3, null, 4, 5, null, 7, null, 6, 4,
                ],
            },
        },
        {
            id: 'island-current',
            name: 'Island Current',
            category: 'Amapiano', collection: 'club',
            description: '성긴 킥 아래 통통 튀는 로그드럼풍 베이스가 움직이는 아마피아노',
            gridMode: '16', kit: 'tr808', tempo: 112, swing: 12, listenBars: 8,
            hits: {
                Q: [0, 7, 10, 14], F: [4, 12], Z: [1, 3, 5, 7, 9, 11, 13, 15],
                R: [6, 14], J: [3, 11, 15],
            },
            probability: {
                Z: { 1: 64, 3: 72, 5: 58, 7: 78, 9: 66, 11: 56, 13: 70, 15: 82 },
                J: { 3: 52, 11: 66, 15: 74 },
            },
            synth: {
                scale: 'majorPent', rootNote: 8, octave: 2, wave: 'square', volume: 0.90,
                pattern: [0, null, null, 4, null, 6, 7, null, 0, null, 3, null, 5, null, 7, 4],
            },
        },
        {
            id: 'northern-lights',
            name: 'Northern Lights',
            category: 'Ambient Pop', collection: 'chill',
            description: '최소한의 드럼과 맑은 저음이 긴 호흡으로 번지는 앰비언트 팝',
            gridMode: '16', kit: 'electro', tempo: 84, swing: 4, listenBars: 8,
            hits: {
                Q: [0, 8], W: [4, 12], F: [12], Z: [2, 6, 10, 14], Y: [0, 8], T: [0],
            },
            probability: {
                Z: { 2: 42, 6: 58, 10: 46, 14: 64 }, Y: { 0: 38, 8: 48 }, T: { 0: 28 },
            },
            synth: {
                scale: 'majorPent', rootNote: 6, octave: 2, wave: 'sine', volume: 0.58,
                pattern: [0, null, null, null, 3, null, null, null, 4, null, null, null, 2, null, null, 1],
            },
        },
        {
            id: 'miami-heatline',
            name: 'Miami Heatline',
            category: 'Electro Funk', collection: 'groove',
            description: '스냅 있는 킥과 카우벨, 탄력적인 베이스가 맞물리는 일렉트로 펑크',
            gridMode: '16', kit: 'electro', tempo: 112, swing: 16, listenBars: 8,
            hits: {
                Q: [0, 3, 7, 10, 12, 15], W: [4, 12], F: [4, 12],
                E: [0, 2, 4, 6, 8, 10, 12, 14], R: [7, 15], G: [5, 13], J: [2, 6, 10, 14],
            },
            probability: { G: { 5: 58, 13: 72 }, J: { 2: 52, 6: 64, 10: 48, 14: 68 } },
            synth: {
                scale: 'dorian', rootNote: 11, octave: 2, wave: 'square', volume: 0.80,
                pattern: [0, null, 4, 5, null, 7, 6, null, 0, 4, null, 8, 5, null, 6, 4],
            },
        },
        {
            id: 'night-bus-2am',
            name: 'Night Bus 2AM',
            category: 'Jersey Club', collection: 'club',
            description: '잘게 쪼갠 킥과 짧은 서브베이스가 급하게 튀어 오르는 저지 클럽',
            gridMode: '16', kit: 'tr808', tempo: 140, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 3, 6, 8, 11, 14], W: [4, 12], F: [4, 12],
                E: [0, 2, 4, 6, 8, 10, 12, 14], H: [2, 10], X: [7, 15],
            },
            probability: { H: { 2: 52, 10: 68 }, X: { 7: 56, 15: 74 }, E: { 6: 72, 14: 78 } },
            synth: {
                scale: 'naturalMinor', rootNote: 2, octave: 2, wave: 'square', volume: 0.86,
                pattern: [0, null, 3, null, 0, 5, null, 3, 0, null, 6, null, 5, null, 3, 1],
            },
        },
        {
            id: 'acid-rain',
            name: 'Acid Rain',
            category: 'Acid House', collection: 'club',
            description: '직선적인 하우스 드럼 위로 톱니파 베이스가 꼬이며 반복되는 애시드 루프',
            gridMode: '16', kit: 'tr808', tempo: 126, swing: 4, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], W: [4, 12], F: [4, 12], E: [2, 6, 10, 14],
                R: [6, 14], G: [3, 11],
            },
            probability: { G: { 3: 44, 11: 62 }, R: { 6: 66, 14: 76 } },
            synth: {
                scale: 'naturalMinor', rootNote: 9, octave: 2, wave: 'sawtooth', volume: 0.90,
                pattern: [0, 2, 3, 5, 3, 2, 0, 6, 0, 3, 5, 7, 5, 3, 2, 1],
            },
        },
        {
            id: 'velvet-rope',
            name: 'Velvet Rope',
            category: 'G-Funk', collection: 'groove',
            description: '느긋한 백비트와 미끄러운 베이스가 햇빛처럼 늘어지는 웨스트코스트 펑크',
            gridMode: '16', kit: 'electro', tempo: 94, swing: 18, listenBars: 8,
            hits: {
                Q: [0, 6, 10, 15], W: [4, 12], F: [4, 12], E: [0, 2, 5, 8, 10, 13],
                R: [7, 15], G: [3, 11],
            },
            probability: { G: { 3: 48, 11: 66 }, E: { 5: 62, 13: 70 }, R: { 7: 54 } },
            synth: {
                scale: 'minorPent', rootNote: 7, octave: 2, wave: 'sawtooth', volume: 0.80,
                pattern: [0, null, 3, 4, null, 5, 4, null, 0, null, 7, null, 5, 4, null, 3],
            },
        },
        {
            id: 'basement-cipher',
            name: 'Basement Cipher',
            category: 'Grime', collection: 'breaks',
            description: '140 BPM의 빈 공간을 날카로운 스네어와 사각파 저음이 가르는 그라임',
            gridMode: '16', kit: 'electro', tempo: 140, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 7, 10, 14], W: [4, 12], F: [12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [3, 11], Y: [6, 14],
            },
            probability: { R: { 3: 46, 11: 64 }, Y: { 6: 38, 14: 52 }, E: { 2: 64, 10: 72 } },
            synth: {
                scale: 'naturalMinor', rootNote: 10, octave: 2, wave: 'square', volume: 0.92,
                pattern: [0, null, null, 6, null, 3, null, 0, 0, null, 5, null, null, 7, 3, null],
            },
        },
        {
            id: 'cloud-temple',
            name: 'Cloud Temple',
            category: 'Trip Hop', collection: 'chill',
            description: '무거운 스네어와 흐릿한 퍼커션 아래 저음이 천천히 잠기는 트립합',
            gridMode: '16', kit: 'acoustic', tempo: 82, swing: 24, listenBars: 8,
            hits: {
                Q: [0, 7, 11], W: [4, 12], H: [3, 11, 15], E: [0, 4, 8, 12],
                Z: [2, 6, 10, 14], T: [0],
            },
            probability: { H: { 3: 42, 11: 58, 15: 36 }, Z: { 2: 48, 6: 62, 10: 54, 14: 68 }, T: { 0: 32 } },
            synth: {
                scale: 'minorPent', rootNote: 1, octave: 2, wave: 'sine', volume: 0.68,
                pattern: [0, null, null, 4, null, null, 3, null, 0, null, 2, null, null, 5, null, 3],
            },
        },
        {
            id: 'dawn-runner',
            name: 'Dawn Runner',
            category: 'Liquid DnB', collection: 'breaks',
            description: '빠른 브레이크 아래 맑고 유연한 베이스가 이어지는 리퀴드 드럼앤베이스',
            gridMode: '16', kit: 'electro', tempo: 174, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 10], W: [4, 7, 12, 15], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [7, 15], Y: [2, 6, 10, 14], Z: [1, 5, 9, 13],
            },
            probability: { W: { 7: 32, 15: 44 }, Y: { 2: 42, 6: 56, 10: 46, 14: 62 }, Z: { 5: 58, 13: 66 } },
            synth: {
                scale: 'majorPent', rootNote: 4, octave: 2, wave: 'sine', volume: 0.74,
                pattern: [0, null, null, 4, null, 3, null, 5, 0, null, 6, null, 4, null, 3, 1],
            },
        },
        {
            id: 'palm-avenue',
            name: 'Palm Avenue',
            category: 'Latin House', collection: 'club',
            description: '하우스 킥 사이로 콩가와 카우벨이 촘촘히 얽히는 라틴 플로어 그루브',
            gridMode: '16', kit: 'acoustic', tempo: 124, swing: 8, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], F: [4, 12], E: [2, 6, 10, 14], R: [6, 14],
                J: [1, 4, 7, 9, 12, 15], G: [3, 7, 11, 15], Z: [0, 4, 8, 12],
            },
            probability: { J: { 1: 58, 7: 72, 9: 54, 15: 76 }, G: { 3: 64, 11: 70 }, Z: { 4: 62, 12: 68 } },
            synth: {
                scale: 'dorian', rootNote: 0, octave: 2, wave: 'triangle', volume: 0.78,
                pattern: [0, null, 3, null, 5, null, 4, 2, 0, null, 6, null, 5, 3, null, 2],
            },
        },
        {
            id: 'cocoa-groove',
            name: 'Cocoa Groove',
            category: 'Afrobeat', collection: 'groove',
            description: '엇갈린 킥과 손타악기 위로 베이스가 둥글게 순환하는 아프로비트',
            gridMode: '16', kit: 'acoustic', tempo: 106, swing: 12, listenBars: 8,
            hits: {
                Q: [0, 6, 10, 14], W: [4, 12], H: [3, 11], J: [1, 5, 9, 13],
                Z: [0, 2, 4, 6, 8, 10, 12, 14], G: [7, 15],
            },
            probability: { J: { 1: 54, 5: 68, 9: 58, 13: 72 }, Z: { 2: 66, 6: 74, 10: 64, 14: 78 }, G: { 7: 62 } },
            synth: {
                scale: 'majorPent', rootNote: 5, octave: 2, wave: 'triangle', volume: 0.76,
                pattern: [0, null, 3, 4, null, 2, null, 5, 0, null, 4, null, 3, 2, 5, null],
            },
        },
        {
            id: 'sakura-platform',
            name: 'Sakura Platform',
            category: 'J-Pop', collection: 'pop',
            description: '빠른 백비트와 선명한 베이스 진행이 반짝이는 청량한 제이팝 루프',
            gridMode: '16', kit: 'electro', tempo: 148, swing: 2, listenBars: 8,
            hits: {
                Q: [0, 3, 8, 11, 12], W: [4, 12], F: [4, 12],
                E: [0, 2, 4, 6, 8, 10, 12, 14], R: [7, 15], T: [0, 8],
            },
            probability: { R: { 7: 62, 15: 76 }, T: { 8: 48 }, E: { 6: 72, 14: 78 } },
            synth: {
                scale: 'major', rootNote: 9, octave: 2, wave: 'square', volume: 0.78,
                pattern: [0, 2, 4, 5, 7, 5, 4, 2, 0, 4, 6, 7, 5, 4, 2, 1],
            },
        },
        {
            id: 'seoul-basement',
            name: 'Seoul Basement',
            category: 'K-Hip-Hop', collection: 'breaks',
            description: '단단한 킥과 뒤로 밀린 스네어, 짧은 808이 맞물리는 한국형 힙합 포켓',
            gridMode: '16', kit: 'tr808', tempo: 96, swing: 20, listenBars: 8,
            hits: {
                Q: [0, 6, 10, 15], W: [4, 12], F: [12], H: [3, 11],
                E: [0, 2, 4, 6, 8, 10, 12, 14], R: [7, 15],
            },
            probability: { H: { 3: 46, 11: 62 }, E: { 2: 72, 6: 58, 10: 68, 14: 64 }, R: { 7: 52 } },
            synth: {
                scale: 'minorPent', rootNote: 8, octave: 2, wave: 'square', volume: 0.86,
                pattern: [0, null, null, 4, null, 3, null, null, 0, null, 5, null, 3, null, 2, 0],
            },
        },
        {
            id: 'sunday-morning',
            name: 'Sunday Morning',
            category: 'Gospel Soul', collection: 'chill',
            description: '따뜻한 탬버린과 둥근 베이스가 느긋하게 고조되는 가스펠 소울',
            gridMode: '16', kit: 'acoustic', tempo: 84, swing: 18, listenBars: 8,
            hits: {
                Q: [0, 6, 8, 14], W: [4, 12], F: [4, 12], Y: [0, 8],
                X: [2, 6, 10, 14], H: [3, 11],
            },
            probability: { X: { 2: 54, 6: 68, 10: 58, 14: 74 }, H: { 3: 48, 11: 62 }, Y: { 8: 52 } },
            synth: {
                scale: 'majorPent', rootNote: 3, octave: 2, wave: 'sine', volume: 0.74,
                pattern: [0, null, 3, null, 4, null, 2, null, 0, null, 5, null, 4, 3, null, 2],
            },
        },
        {
            id: 'frozen-lake',
            name: 'Frozen Lake',
            category: 'Organic House', collection: 'club',
            description: '부드러운 4비트 킥과 손타악기, 투명한 베이스가 흐르는 오가닉 하우스',
            gridMode: '16', kit: 'acoustic', tempo: 118, swing: 10, listenBars: 8,
            hits: {
                Q: [0, 4, 8, 12], H: [4, 12], Z: [2, 6, 10, 14],
                J: [3, 7, 11, 15], R: [6, 14], Y: [0, 8],
            },
            probability: { Z: { 2: 62, 6: 74, 10: 66, 14: 78 }, J: { 3: 52, 7: 68, 11: 58, 15: 72 }, Y: { 8: 46 } },
            synth: {
                scale: 'dorian', rootNote: 6, octave: 2, wave: 'triangle', volume: 0.72,
                pattern: [0, null, 3, null, 5, null, 4, null, 0, null, 6, null, 5, 3, null, 2],
            },
        },
        {
            id: 'redline-drill',
            name: 'Redline',
            category: 'UK Drill', collection: 'breaks',
            description: '성긴 킥과 단단한 원스네어 사이로 어두운 808이 미끄러지는 드릴',
            gridMode: '16', kit: 'tr808', tempo: 142, swing: 2, listenBars: 8,
            hits: {
                Q: [0, 5, 11, 14], W: [8], F: [8],
                E: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], R: [7, 15],
            },
            probability: {
                E: { 1: 52, 3: 68, 5: 48, 7: 76, 9: 56, 11: 72, 13: 62, 14: 78, 15: 86 },
                R: { 7: 46, 15: 68 },
            },
            synth: {
                scale: 'naturalMinor', rootNote: 3, octave: 2, wave: 'square', volume: 0.94,
                pattern: [0, null, null, 6, null, 4, null, 2, 0, null, 7, null, 5, null, 3, 1],
            },
        },
        {
            id: 'neon-cowboy',
            name: 'Neon Cowboy',
            category: 'Country Rock', collection: 'pop',
            description: '곧은 스네어와 열린 라이드, 뛰는 베이스가 도로를 달리는 컨트리 록',
            gridMode: '16', kit: 'acoustic', tempo: 116, swing: 6, listenBars: 8,
            hits: {
                Q: [0, 4, 7, 8, 12, 15], W: [4, 12], E: [0, 2, 4, 6, 8, 10, 12, 14],
                Y: [0, 4, 8, 12], R: [7, 15], T: [0],
            },
            probability: { Y: { 4: 54, 12: 66 }, R: { 7: 48, 15: 62 }, T: { 0: 58 } },
            synth: {
                scale: 'majorPent', rootNote: 7, octave: 2, wave: 'triangle', volume: 0.76,
                pattern: [0, null, 3, 4, 5, null, 4, 3, 0, null, 5, 4, 3, null, 2, 1],
            },
        },
        {
            id: 'rainforest-rush',
            name: 'Rainforest Rush',
            category: 'Jungle', collection: 'breaks',
            description: '잘게 부서진 드럼과 빠른 저음이 밀림처럼 겹쳐지는 올드스쿨 정글',
            gridMode: '16', kit: 'electro', tempo: 168, swing: 0, listenBars: 8,
            hits: {
                Q: [0, 7, 10, 14], W: [4, 6, 12, 15], E: [0, 2, 4, 6, 8, 10, 12, 14],
                R: [3, 7, 11, 15], Y: [2, 5, 9, 13], Z: [1, 5, 9, 13],
            },
            probability: { W: { 6: 38, 15: 52 }, Y: { 2: 46, 5: 58, 9: 50, 13: 64 }, Z: { 1: 54, 5: 66, 9: 58, 13: 72 } },
            synth: {
                scale: 'minorPent', rootNote: 0, octave: 2, wave: 'square', volume: 0.82,
                pattern: [0, null, 4, null, null, 3, null, 5, 0, null, 6, null, 4, null, 3, 1],
            },
        },
    ]);

    const COLLECTIONS = Object.freeze([
        { id: 'all', label: '전체' },
        { id: 'pop', label: '팝' },
        { id: 'chill', label: '칠' },
        { id: 'groove', label: '그루브' },
        { id: 'club', label: '클럽' },
        { id: 'breaks', label: '브레이크' },
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
            this.activeCollection = 'all';
            this.renderFilters();
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
            const visiblePresets = PRESETS
                .map((preset, index) => ({ preset, index }))
                .filter(({ preset }) => this.activeCollection === 'all' || preset.collection === this.activeCollection);
            const collection = COLLECTIONS.find(item => item.id === this.activeCollection) || COLLECTIONS[0];
            list.setAttribute('aria-label', `${collection.label} 음악 프리셋 ${visiblePresets.length}개`);
            list.innerHTML = visiblePresets.map(({ preset, index }) => `
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

        renderFilters() {
            const filters = document.getElementById('presetFilters');
            if (!filters) return;
            filters.innerHTML = COLLECTIONS.map(collection => {
                const count = collection.id === 'all'
                    ? PRESETS.length
                    : PRESETS.filter(preset => preset.collection === collection.id).length;
                const active = collection.id === this.activeCollection;
                return `
                    <button type="button" class="preset-filter-btn${active ? ' active' : ''}"
                        data-preset-filter="${collection.id}" aria-pressed="${active}">
                        ${collection.label}<span>${count}</span>
                    </button>
                `;
            }).join('');
            filters.querySelectorAll('[data-preset-filter]').forEach(button => {
                button.addEventListener('click', () => this.setCollection(button.dataset.presetFilter));
            });
        }

        setCollection(collectionId) {
            if (!COLLECTIONS.some(collection => collection.id === collectionId)) return false;
            this.activeCollection = collectionId;
            document.querySelectorAll('[data-preset-filter]').forEach(button => {
                const active = button.dataset.presetFilter === collectionId;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', String(active));
            });
            this.renderList();
            this.syncUI();
            const collection = COLLECTIONS.find(item => item.id === collectionId);
            const count = collectionId === 'all'
                ? PRESETS.length
                : PRESETS.filter(preset => preset.collection === collectionId).length;
            this.announce(`${collection.label} 프리셋 ${count}개`);
            return true;
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
            const description = document.getElementById('presetMenuDescription');
            const pause = document.getElementById('listenPauseBtn');
            const preset = this.activeIndex >= 0 ? PRESETS[this.activeIndex] : null;
            menu?.classList.toggle('is-listening', this.listening);
            if (summaryLabel) summaryLabel.textContent = this.listening ? `${this.activeIndex + 1}/${PRESETS.length}` : '프리셋';
            if (description) description.textContent = `완성 루프 ${PRESETS.length}개 · 드럼·베이스·템포를 함께 불러옵니다. 감상 전 작업은 잠시 보관됩니다.`;
            if (listenButton) {
                listenButton.classList.toggle('active', this.listening);
                listenButton.setAttribute('aria-pressed', String(this.listening));
                listenButton.innerHTML = this.listening
                    ? '<svg class="icon"><use href="#i-return"/></svg> 원래 작업으로'
                    : '<svg class="icon"><use href="#i-headphones"/></svg> 전체 감상';
            }
            if (deck) deck.hidden = !this.listening;
            if (title) title.textContent = preset ? preset.name : '프리셋 감상';
            if (meta) meta.textContent = preset
                ? `${this.activeIndex + 1} / ${PRESETS.length} · ${Math.min(this.completedLoops, preset.listenBars)} / ${preset.listenBars}마디`
                : `1 / ${PRESETS.length}`;
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
