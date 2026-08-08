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
                topbar: rect('.app-topbar'),
                header: rect('header'),
                controls: rect('.controls'),
                transportPrimary: rect('.transport-primary'),
                gridMode: rect('.grid-mode-row'),
                sliderRack: rect('.top-transport .slider-rack'),
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
                topControlSizes: [...document.querySelectorAll('.mode-btn, .save-menu-summary, .promo-recorder-summary')]
                    .filter(element => element.getClientRects().length > 0)
                    .map(element => {
                        const box = element.getBoundingClientRect();
                        return { width: box.width, height: box.height };
                    }),
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

async function measureSaveMenu(page) {
    return page.evaluate(() => {
        const topbar = document.querySelector('.app-topbar');
        const menu = document.getElementById('loopLibrarySection');
        const panel = menu.querySelector('.save-menu-panel');
        const before = topbar.getBoundingClientRect();
        menu.open = true;
        const openedTopbar = topbar.getBoundingClientRect();
        const openedPanel = panel.getBoundingClientRect();
        const actionSizes = [...panel.querySelectorAll('.loop-library-actions button')]
            .map(button => {
                const box = button.getBoundingClientRect();
                return { width: box.width, height: box.height };
            });
        const result = {
            topbarBottom: before.bottom,
            topbarHeightDelta: Math.abs(openedTopbar.height - before.height),
            panel: {
                top: openedPanel.top,
                left: openedPanel.left,
                right: openedPanel.right,
            },
            actionSizes,
        };
        menu.open = false;
        return result;
    });
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
        const desktopSaveMenu = await measureSaveMenu(page);
        const tablet = await capture(page, url, 'tablet-820', { width: 820, height: 1180, deviceScaleFactor: 1 });
        const tabletSaveMenu = await measureSaveMenu(page);
        const tabletTouch = await capture(page, url, 'tablet-820-touch', {
            width: 820,
            height: 1180,
            deviceScaleFactor: 1,
            hasTouch: true,
        });
        const tabletTouchSaveMenu = await measureSaveMenu(page);
        const mobile = await capture(page, url, 'mobile-390', {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            isMobile: true,
            hasTouch: true,
        });
        const mobileSaveMenu = await measureSaveMenu(page);
        for (const [name, result] of Object.entries({ desktop, tablet, tabletTouch, mobile })) {
            assert(result.page.scrollWidth === result.page.clientWidth,
                `${name} has page-level horizontal overflow: ${result.page.scrollWidth}px > ${result.page.clientWidth}px`);
        }
        const desktopRatio = desktop.regions.sequencer.width / desktop.regions.pads.width;
        assert(desktopRatio >= 2.1 && desktopRatio <= 2.6,
            `desktop workspace is not near 70/30: ${desktopRatio.toFixed(2)}`);
        assert(desktop.regions.topbar.height <= 44,
            `desktop top bar is no longer compact: ${desktop.regions.topbar.height}px`);
        assert(tablet.regions.topbar.height <= 44,
            `tablet top bar is no longer compact: ${tablet.regions.topbar.height}px`);
        assert(tabletTouch.regions.topbar.height <= 57,
            `touch tablet top bar is no longer compact: ${tabletTouch.regions.topbar.height}px`);
        assert(mobile.regions.topbar.height <= 52,
            `mobile top bar is no longer one compact row: ${mobile.regions.topbar.height}px`);
        assert(desktop.regions.controls.height <= 54,
            `desktop transport is no longer compact: ${desktop.regions.controls.height}px`);
        assert(tablet.regions.controls.height <= 92,
            `tablet transport is no longer compact: ${tablet.regions.controls.height}px`);
        assert(tabletTouch.regions.controls.height <= 112,
            `touch tablet transport is no longer compact: ${tabletTouch.regions.controls.height}px`);
        assert(mobile.regions.controls.height <= 104,
            `mobile transport is no longer compact: ${mobile.regions.controls.height}px`);
        assert(desktop.regions.sequencer.y <= 145 && tablet.regions.sequencer.y <= 170 &&
                tabletTouch.regions.sequencer.y <= 202 && mobile.regions.sequencer.y <= 231,
            `workspace start moved down: ${JSON.stringify({
                desktop: desktop.regions.sequencer.y,
                tablet: tablet.regions.sequencer.y,
                tabletTouch: tabletTouch.regions.sequencer.y,
                mobile: mobile.regions.sequencer.y,
            })}`);
        assert(desktop.regions.mobileNav.width === 0 && tablet.regions.mobileNav.width === 0 &&
                tabletTouch.regions.mobileNav.width === 0,
            'mobile section navigation is visible above its breakpoint');
        assert(mobile.regions.mobileNav.height >= 40,
            `mobile section navigation is missing or too small: ${mobile.regions.mobileNav.height}px`);
        assert(mobile.state.navLinks === 3 && mobile.state.navTargetsResolve,
            'mobile section navigation links are incomplete or point to missing targets');
        for (const [name, result] of Object.entries({ desktop, tablet, tabletTouch, mobile })) {
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
        for (const [name, result] of Object.entries({ tabletTouch, mobile })) {
            assert(result.state.topControlSizes.every(size => size.width >= 40 && size.height >= 40),
                `${name} top controls are too small for touch: ${JSON.stringify(result.state.topControlSizes)}`);
        }

        const saveMenus = {
            desktop: { viewport: desktop.viewport, geometry: desktopSaveMenu },
            tablet: { viewport: tablet.viewport, geometry: tabletSaveMenu },
            tabletTouch: { viewport: tabletTouch.viewport, geometry: tabletTouchSaveMenu },
            mobile: { viewport: mobile.viewport, geometry: mobileSaveMenu },
        };
        for (const [name, { viewport, geometry }] of Object.entries(saveMenus)) {
            assert(geometry.panel.top >= geometry.topbarBottom - 1,
                `${name} save menu overlaps the top bar: ${JSON.stringify(geometry)}`);
            assert(geometry.panel.left >= -1 && geometry.panel.right <= viewport.width + 1,
                `${name} save menu escapes the viewport: ${JSON.stringify(geometry)}`);
            assert(geometry.topbarHeightDelta < 1,
                `${name} save menu reflows the top bar: ${JSON.stringify(geometry)}`);
        }
        for (const [name, geometry] of Object.entries({ tabletTouch: tabletTouchSaveMenu, mobile: mobileSaveMenu })) {
            assert(geometry.actionSizes.every(size => size.width >= 40 && size.height >= 40),
                `${name} save actions are too small for touch: ${JSON.stringify(geometry.actionSizes)}`);
        }
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
        await page.focus('#loopLibrarySection > summary');
        await page.keyboard.press('Enter');
        assert(await page.$eval('#loopLibrarySection', menu => menu.open),
            'save menu did not open from the keyboard');
        await page.keyboard.press('Escape');
        const escapeState = await page.evaluate(() => ({
            open: document.getElementById('loopLibrarySection').open,
            focused: document.activeElement === document.querySelector('#loopLibrarySection > summary'),
        }));
        assert(!escapeState.open && escapeState.focused,
            `Escape did not close and return focus to the save trigger: ${JSON.stringify(escapeState)}`);

        await page.click('#loopLibrarySection > summary');
        await page.focus('#saveLoopBtn');
        await page.click('.logo-mark');
        await new Promise(resolve => setTimeout(resolve, 32));
        const outsideState = await page.evaluate(() => ({
            open: document.getElementById('loopLibrarySection').open,
            focused: document.activeElement === document.querySelector('#loopLibrarySection > summary'),
        }));
        assert(!outsideState.open && outsideState.focused,
            `outside pointer click did not close and restore focus: ${JSON.stringify(outsideState)}`);

        const exclusiveState = await page.evaluate(async () => {
            const save = document.getElementById('loopLibrarySection');
            const promo = document.getElementById('promoRecorderPanel');
            save.open = true;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            promo.open = true;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const promoWins = { save: save.open, promo: promo.open };
            save.open = true;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const saveWins = { save: save.open, promo: promo.open };
            save.open = false;
            promo.open = false;
            return { promoWins, saveWins };
        });
        assert(!exclusiveState.promoWins.save && exclusiveState.promoWins.promo &&
                exclusiveState.saveWins.save && !exclusiveState.saveWins.promo,
            `top disclosures can remain open together: ${JSON.stringify(exclusiveState)}`);

        const saveActionCalls = await page.evaluate(async () => {
            const loops = drumMachine.loopLibrary;
            const original = {
                saveToHistory: loops.saveToHistory,
                shareCurrentState: loops.shareCurrentState,
                clearHistory: loops.clearHistory,
            };
            const calls = [];
            loops.saveToHistory = silent => calls.push(`save:${silent}`);
            loops.shareCurrentState = async () => calls.push('share');
            loops.clearHistory = () => calls.push('clear');
            const menu = document.getElementById('loopLibrarySection');
            menu.open = true;
            document.getElementById('saveLoopBtn').click();
            document.getElementById('shareLoopBtn').click();
            document.getElementById('clearLoopHistoryBtn').click();
            await Promise.resolve();
            loops.saveToHistory = original.saveToHistory;
            loops.shareCurrentState = original.shareCurrentState;
            loops.clearHistory = original.clearHistory;
            menu.open = false;
            return calls;
        });
        assert(saveActionCalls.join(',') === 'save:false,share,clear',
            `save menu buttons are not wired to the library: ${saveActionCalls.join(',')}`);
        const mobileTouchTargets = await page.evaluate(() => {
            const sizes = selector => [...document.querySelectorAll(selector)]
                .filter(element => element.getClientRects().length > 0)
                .map(element => {
                    const box = element.getBoundingClientRect();
                    return { width: box.width, height: box.height };
                });
            const ranges = sizes('.top-transport input[type="range"]');
            const modes = sizes('.mode-btn');
            const saveSummaries = sizes('.save-menu-summary');
            drumMachine.setMode('custom');
            const customActions = sizes('.custom-mode-only .button-row button');
            drumMachine.setMode('normal');
            return { ranges, modes, saveSummaries, customActions };
        });
        for (const [name, sizes] of Object.entries(mobileTouchTargets)) {
            assert(sizes.length > 0 && sizes.every(size => size.width >= 40 && size.height >= 40),
                `${name} are too small for touch: ${JSON.stringify(sizes)}`);
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
        process.stdout.write(`${JSON.stringify({ desktop, tablet, tabletTouch, mobile }, null, 2)}\n`);
    } finally {
        await browser.close();
        server.close();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
