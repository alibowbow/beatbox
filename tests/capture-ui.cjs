const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const chromiumPath = process.env.CHROMIUM_PATH;
const outputDir = process.env.UI_CAPTURE_DIR || path.join(root, 'ui-captures');

if (!chromiumPath) throw new Error('CHROMIUM_PATH is required');

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

async function capture(page, url, name, viewport) {
    await page.setViewport(viewport);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof drumMachine !== 'undefined' && document.querySelectorAll('#beatGrid .beat-cell').length > 0);
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 250));

    const metrics = await page.evaluate(() => {
        const rect = selector => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const box = element.getBoundingClientRect();
            return { x: box.x, y: box.y, width: box.width, height: box.height };
        };
        const scrollBox = selector => {
            const element = document.querySelector(selector);
            const box = element.getBoundingClientRect();
            return {
                left: box.left,
                right: box.right,
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
            };
        };
        const navLinks = [...document.querySelectorAll('.mobile-section-nav a')];
        return {
            viewport: { width: innerWidth, height: innerHeight },
            page: {
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                scrollHeight: document.documentElement.scrollHeight,
            },
            regions: {
                header: rect('header'),
                controls: rect('.controls'),
                sequencer: rect('.sequencer'),
                bass: rect('.bass-section'),
                pads: rect('.drum-pads'),
                pattern: rect('.pattern-panel'),
                library: rect('#loopLibrarySection'),
                mobileNav: rect('.mobile-section-nav'),
            },
            state: {
                beatGrid: scrollBox('#beatGrid'),
                synthGrid: scrollBox('#synthGrid'),
                navLinks: navLinks.length,
                navTargetsResolve: navLinks.every(link => link.hash && document.querySelector(link.hash)),
                patternToolsOpen: document.getElementById('patternTools').open,
                libraryOpen: document.getElementById('loopLibrarySection').open,
                promoOpen: document.getElementById('promoRecorderPanel').open,
                beatTabStops: document.querySelectorAll('#beatGrid .sound-label[tabindex="0"], #beatGrid .beat-cell[tabindex="0"]').length,
                synthTabStops: document.querySelectorAll('#synthGrid .synth-cell[tabindex="0"]').length,
                beatRows: document.querySelectorAll('#beatGrid > [role="row"]').length,
                synthRows: document.querySelectorAll('#synthGrid > [role="row"]').length,
            },
            visibleHeadings: [...document.querySelectorAll('h1, h2, h3')]
                .filter(element => {
                    const box = element.getBoundingClientRect();
                    return element.getClientRects().length > 0 && box.top < innerHeight && box.bottom > 0;
                })
                .map(element => element.textContent.trim()),
        };
    });

    await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });
    await page.screenshot({ path: path.join(outputDir, `${name}-full.png`), fullPage: true });
    return metrics;
}

async function main() {
    fs.mkdirSync(outputDir, { recursive: true });
    const server = await startServer();
    const browser = await puppeteer.launch({
        executablePath: chromiumPath,
        headless: 'shell',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--autoplay-policy=no-user-gesture-required',
            '--font-render-hinting=none',
        ],
    });

    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) request.abort();
            else request.continue();
        });
        const url = `http://127.0.0.1:${server.address().port}/`;
        const desktop = await capture(page, url, 'desktop-1440', { width: 1440, height: 1100, deviceScaleFactor: 1 });
        const tablet = await capture(page, url, 'tablet-820', { width: 820, height: 1180, deviceScaleFactor: 1 });
        const mobile = await capture(page, url, 'mobile-390', {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            isMobile: true,
            hasTouch: true,
        });
        for (const [name, result] of Object.entries({ desktop, tablet, mobile })) {
            assert(result.page.scrollWidth === result.page.clientWidth,
                `${name} has page-level horizontal overflow: ${result.page.scrollWidth}px > ${result.page.clientWidth}px`);
        }
        const desktopRatio = desktop.regions.sequencer.width / desktop.regions.pads.width;
        assert(desktopRatio >= 2.1 && desktopRatio <= 2.6,
            `desktop workspace is not near 70/30: ${desktopRatio.toFixed(2)}`);
        assert(desktop.regions.controls.height <= 76,
            `desktop transport is no longer compact: ${desktop.regions.controls.height}px`);
        assert(tablet.regions.controls.height <= 180,
            `tablet transport is no longer compact: ${tablet.regions.controls.height}px`);
        assert(mobile.regions.controls.height <= 125,
            `mobile transport is no longer compact: ${mobile.regions.controls.height}px`);
        assert(desktop.regions.mobileNav.width === 0 && tablet.regions.mobileNav.width === 0,
            'mobile section navigation is visible above its breakpoint');
        assert(mobile.regions.mobileNav.height >= 40,
            `mobile section navigation is missing or too small: ${mobile.regions.mobileNav.height}px`);
        assert(mobile.state.navLinks === 3 && mobile.state.navTargetsResolve,
            'mobile section navigation links are incomplete or point to missing targets');
        for (const [name, result] of Object.entries({ desktop, tablet, mobile })) {
            assert(result.state.beatTabStops === 1 && result.state.synthTabStops === 1,
                `${name} sequencers expose more than one roving Tab stop`);
            assert(result.state.beatRows > 1 && result.state.synthRows > 1,
                `${name} sequencer row semantics are missing`);
        }
        assert(!mobile.state.patternToolsOpen && !mobile.state.libraryOpen && !mobile.state.promoOpen,
            'fresh mobile disclosures are not compact by default');
        for (const [name, grid] of Object.entries({ beat: mobile.state.beatGrid, synth: mobile.state.synthGrid })) {
            assert(grid.left >= 0 && grid.right <= mobile.viewport.width + 1,
                `${name} grid escapes the mobile viewport`);
            assert(grid.scrollWidth > grid.clientWidth,
                `${name} grid no longer contains its own horizontal overflow`);
        }
        assert(mobile.regions.pads.y > mobile.regions.bass.y && mobile.regions.pattern.y > mobile.regions.pads.y,
            'mobile sections are not ordered sequencer → bass → pads → monitor');
        const mobilePromoMenu = await page.evaluate(() => {
            const topbar = document.querySelector('.app-topbar').getBoundingClientRect();
            const panel = document.getElementById('promoRecorderPanel');
            panel.open = true;
            const opened = panel.getBoundingClientRect();
            panel.open = false;
            return { topbarBottom: topbar.bottom, panelTop: opened.top, panelRight: opened.right };
        });
        assert(mobilePromoMenu.panelTop >= mobilePromoMenu.topbarBottom - 1,
            `mobile promo menu overlaps the top bar: ${JSON.stringify(mobilePromoMenu)}`);
        assert(mobilePromoMenu.panelRight <= mobile.viewport.width + 1,
            `mobile promo menu escapes the viewport: ${JSON.stringify(mobilePromoMenu)}`);
        const mobileTouchTargets = await page.evaluate(() => {
            const heights = selector => [...document.querySelectorAll(selector)]
                .filter(element => element.getClientRects().length > 0)
                .map(element => element.getBoundingClientRect().height);
            const rangeHeights = heights('.top-transport input[type="range"]');
            const modeHeights = heights('.mode-btn');
            drumMachine.setMode('custom');
            const customActionHeights = heights('.custom-mode-only .button-row button');
            drumMachine.setMode('normal');
            return { rangeHeights, modeHeights, customActionHeights };
        });
        for (const [name, heights] of Object.entries(mobileTouchTargets)) {
            assert(heights.length > 0 && heights.every(height => height >= 40),
                `${name} are too small for touch: ${heights.join(',')}`);
        }
        const keyboardGrid = await page.evaluate(() => {
            const entry = document.querySelector('#beatGrid .sound-label[tabindex="0"], #beatGrid .beat-cell[tabindex="0"]');
            entry.focus();
            entry.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            const cell = document.activeElement;
            const movedToCell = cell.classList.contains('beat-cell');
            cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
            return {
                movedToCell,
                active: cell.getAttribute('aria-pressed'),
                label: cell.getAttribute('aria-label'),
                tabStops: document.querySelectorAll('#beatGrid .sound-label[tabindex="0"], #beatGrid .beat-cell[tabindex="0"]').length,
            };
        });
        assert(keyboardGrid.movedToCell && keyboardGrid.active === 'true' && /확률 100%/.test(keyboardGrid.label),
            `keyboard probability editing failed: ${JSON.stringify(keyboardGrid)}`);
        assert(keyboardGrid.tabStops === 1, 'keyboard navigation lost the single grid Tab stop');
        const interactionRegression = await page.evaluate(() => {
            const machine = drumMachine;
            const pad = document.querySelector('.pad[data-key="R"]');
            const originalPlaySound = machine.playSound;
            const originalSetTimeout = window.setTimeout;
            const calls = [];
            machine.playSound = key => calls.push(key);

            // 긴 누름을 즉시 재현한다. 이전 700ms 플래그 방식은 타이머가 끝난 뒤
            // 호환 click에서 같은 패드를 한 번 더 재생했다.
            window.setTimeout = callback => {
                callback();
                return 1;
            };
            pad.dispatchEvent(new PointerEvent('pointerdown', {
                bubbles: true,
                pointerType: 'touch',
                pointerId: 71,
                button: 0,
            }));
            window.setTimeout = originalSetTimeout;
            pad.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, button: 0 }));
            const longPressCalls = calls.length;

            calls.length = 0;
            for (const pointerId of [81, 82]) {
                pad.dispatchEvent(new PointerEvent('pointerdown', {
                    bubbles: true,
                    pointerType: 'touch',
                    pointerId,
                    button: 0,
                }));
            }
            for (let i = 0; i < 2; i++) {
                pad.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, button: 0 }));
            }
            const concurrentPointerCalls = calls.length;

            calls.length = 0;
            pad.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
            const keyboardPadCalls = calls.length;

            calls.length = 0;
            const beatCell = document.querySelector('#beatGrid .beat-cell');
            beatCell.focus();
            beatCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
            const focusedGridShortcut = calls.join(',');

            calls.length = 0;
            const tempo = document.getElementById('tempo');
            tempo.focus();
            tempo.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
            const formShortcutCalls = calls.length;

            machine.playSound = originalPlaySound;
            window.setTimeout = originalSetTimeout;
            return {
                longPressCalls,
                concurrentPointerCalls,
                keyboardPadCalls,
                focusedGridShortcut,
                formShortcutCalls,
            };
        });
        assert(interactionRegression.longPressCalls === 1,
            `long-held pad retriggered on release: ${JSON.stringify(interactionRegression)}`);
        assert(interactionRegression.concurrentPointerCalls === 2,
            `concurrent pointers were not independent: ${JSON.stringify(interactionRegression)}`);
        assert(interactionRegression.keyboardPadCalls === 1,
            `keyboard pad activation failed: ${JSON.stringify(interactionRegression)}`);
        assert(interactionRegression.focusedGridShortcut === 'Q',
            `focused grid swallowed the drum shortcut: ${JSON.stringify(interactionRegression)}`);
        assert(interactionRegression.formShortcutCalls === 0,
            `form control leaked a global shortcut: ${JSON.stringify(interactionRegression)}`);
        process.stdout.write(`${JSON.stringify({ desktop, tablet, mobile }, null, 2)}\n`);
    } finally {
        await browser.close();
        server.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
