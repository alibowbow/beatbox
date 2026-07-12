# BEATBOX STUDIO PRO V3.0

브라우저에서 바로 연주하고 패턴을 만드는 단일 페이지 드럼머신·그루브박스입니다. 별도 빌드나 오디오 파일 없이 Web Audio API로 드럼을 합성하며, 4×4 이미지 아틀라스를 이용해 15개 악기를 일관된 비주얼로 표시합니다.

## V3 핵심 기능

- **정밀 타이밍 엔진**: AudioContext 시계를 기준으로 25ms lookahead / 0.1초 ahead scheduling
- **실제 스윙**: 짝을 이루는 두 스텝의 총 길이를 유지하면서 long/short 타이밍 적용
- **16·24 스텝**: 16스텝은 16분음표, 24스텝은 16분음표 셋잇단 기반으로 한 사이클 4박 유지
- **LIVE GROOVE DECK**: 현재 악기, 키, 스텝, BPM, 스윙, 킷을 실시간 표시
- **15개 합성 드럼**: 킥, 스네어, 하이햇, 오픈햇, 크래시, 라이드, 탐 3종, 박수, 카우벨, 림샷, 콩가, 쉐이커, 탬버린
- **3개 드럼 킷**: 어쿠스틱, 808 클래식, 일렉트로
- **8개 장르 프리셋**: 록, 재즈, 펑크, 셔플, 힙합, EDM, 레게, 메탈
- **리듬 도구**: 유클리드 생성기, 스텝별 100/75/50/25% 확률, 악기별 뮤트, 16·24 대응 필인
- **베이스·멜로디 신스**: 5개 스케일, 12개 루트, 4개 옥타브, 4개 파형의 모노포닉 레인
- **연주 컨트롤**: BPM 60~200, Swing 0~70, Humanize 0~100, Master 0~100
- **커스텀 비트박스**: 마이크 녹음, 3초 자동 종료, 자동 무음 트리밍, A~Z 키 매핑
- **V3 패턴 파일**: gridMode, kit, tempo, swing, humanize, masterVolume, mute, probability, synth 설정을 JSON으로 저장·복원하며 구버전 JSON도 불러오기 지원

## 이미지 아틀라스

```text
assets/
├── beatbox-instruments-atlas.png   # 1024×1024 RGBA, 4×4
└── beatbox-instruments-atlas.json  # 256×256 프레임 manifest
```

프레임 순서는 다음과 같습니다.

| 행 | 프레임 |
|---|---|
| 1 | kick, snare, hihat, openhat |
| 2 | crash, ride, tom1, tom2 |
| 3 | floortom, clap, cowbell, rimshot |
| 4 | conga, shaker, tambourine, groovebox |

CSS에서 단일 PNG를 `background-size: 400% 400%`로 재사용합니다. 아틀라스 이미지를 불러오지 못해도 악기 키와 이름은 그대로 남습니다.

## 사용 방법

1. `index.html`을 브라우저에서 엽니다.
2. 패드 또는 키보드로 악기를 연주합니다.
3. 시퀀서 칸을 눌러 비트를 배치하고 재생합니다.
4. 우클릭 또는 길게 누르기로 스텝 발음 확률을 순환합니다.
5. 저장 버튼으로 V3 JSON을 내려받고, 불러오기로 다시 복원합니다.

커스텀 녹음은 보안 정책상 HTTPS 또는 localhost에서만 사용할 수 있습니다. 커스텀 키·이름·패턴 행은 JSON에서 복원되지만 녹음된 AudioBuffer 자체는 포함되지 않으므로 페이지를 새로 연 뒤에는 해당 샘플을 다시 녹음해야 합니다.

## 키보드

- `Q W E R T Y A S D F G H J Z X`: 일반 드럼 연주
- `Space`: 재생·정지
- `Enter`: 새 비트 생성
- `Backspace`: 드럼 패턴 초기화

폼, 선택 메뉴, 버튼 등 인터랙티브 요소에 포커스가 있을 때는 전역 단축키가 동작하지 않습니다.

## 실행 환경

- 최신 Chrome, Edge, Firefox, Safari
- Web Audio API
- MediaRecorder API 및 마이크 권한(커스텀 녹음)
- 정적 호스팅 가능: GitHub Pages 포함

## 파일 구조

- `index.html`: UI, 스타일, 오디오 엔진, 시퀀서 전체
- `assets/beatbox-instruments-atlas.png`: 악기 스프라이트 원본
- `assets/beatbox-instruments-atlas.json`: 아틀라스 좌표 명세

MIT License
