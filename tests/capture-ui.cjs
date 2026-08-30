const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.resolve(__dirname, '..');
const chromiumPath = process.env.CHROMIUM_PATH;
const outputDir = process.env.UI_CAPTURE_DIR || path.join(root, 'ui-captures');
const LEGACY_MOBILE_PATTERN_TOOL_HEIGHTS = { 360: 423, 390: 423, 430: 377 };

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
        const workspaceTabs = [...document.querySelectorAll('[data-workspace-tab]')];
        const sequencerRegion = rect('.sequencer');
        const drumView = {
            drumHidden: document.getElementById('sequencerPanel').hidden,
            bassHidden: document.getElementById('synthLane').hidden,
            drumContextHidden: document.getElementById('performancePads').hidden,
            bassContextHidden: document.getElementById('bassPreviewPanel').hidden,
        };
        window.setWorkspaceTab('bass');
        const bassRegion = rect('.bass-section');
        const synthGridRegion = scrollBox('#synthGrid');
        const bassPanelBox = document.getElementById('synthLane').getBoundingClientRect();
        const bassView = {
            drumHidden: document.getElementById('sequencerPanel').hidden,
            bassHidden: document.getElementById('synthLane').hidden,
            drumContextHidden: document.getElementById('performancePads').hidden,
            bassContextHidden: document.getElementById('bassPreviewPanel').hidden,
            panelBottom: bassPanelBox.bottom,
            previewY: rect('#bassPreviewPanel')?.y,
            patternY: rect('.pattern-panel')?.y,
            patternTitle: document.getElementById('patternContextTitle')?.textContent,
        };
        window.setWorkspaceTab('drums');
        document.getElementById('sequencerPanel').classList.remove('workspace-panel-enter');
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
                sequencer: sequencerRegion,
                bass: bassRegion,
                pads: rect('.drum-pads'),
                pattern: rect('.pattern-panel'),
                library: rect('#loopLibrarySection'),
                presets: rect('#musicPresetMenu'),
                patternTools: rect('#patternTools'),
                workspaceTabs: rect('.workspace-tabs'),
                transportOptions: rect('.transport-options-summary'),
            },
            state: {
                beatGrid: scrollBox('#beatGrid'),
                synthGrid: synthGridRegion,
                workspaceTabs: workspaceTabs.length,
                tabTargetsResolve: workspaceTabs.every(tab => tab.getAttribute('aria-controls') &&
                    document.getElementById(tab.getAttribute('aria-controls'))),
                drumView,
                bassView,
                activeWorkspace: document.querySelector('[data-workspace-tab][aria-selected="true"]')?.dataset.workspaceTab,
                patternMenusOpen: document.querySelectorAll('#patternTools .pattern-quick-menu[open]').length,
                libraryOpen: document.getElementById('loopLibrarySection').open,
                presetsOpen: document.getElementById('musicPresetMenu').open,
                promoOpen: document.getElementById('promoRecorderPanel').open,
                transportOptionsOpen: document.getElementById('transportOptions').open,
                beatTabStops: document.querySelectorAll('#beatGrid .sound-label[tabindex="0"], #beatGrid .beat-cell[tabindex="0"]').length,
                synthTabStops: document.querySelectorAll('#synthGrid .synth-cell[tabindex="0"]').length,
                beatRows: document.querySelectorAll('#beatGrid > [role="row"]').length,
                synthRows: document.querySelectorAll('#synthGrid > [role="row"]').length,
                topControlSizes: [...document.querySelectorAll('.mode-btn, .preset-menu-summary, .save-menu-summary, .promo-recorder-summary, .transport-primary button, .workspace-tab, .transport-options-summary')]
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

async function measurePresetMenu(page) {
    return page.evaluate(() => {
        const topbar = document.querySelector('.app-topbar');
        const menu = document.getElementById('musicPresetMenu');
        const panel = menu.querySelector('.preset-menu-panel');
        const before = topbar.getBoundingClientRect();
        menu.open = true;
        const openedTopbar = topbar.getBoundingClientRect();
        const openedPanel = panel.getBoundingClientRect();
        const actionSizes = [...panel.querySelectorAll('#listenAllBtn, .music-preset-card')]
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
                height: openedPanel.height,
                scrollHeight: panel.scrollHeight,
            },
            actionSizes,
        };
        menu.open = false;
        return result;
    });
}

async function measureListeningDeck(page) {
    return page.evaluate(() => {
        const library = drumMachine.presetLibrary;
        const menu = document.getElementById('musicPresetMenu');
        const previous = {
            listening: library.listening,
            activeIndex: library.activeIndex,
            completedLoops: library.completedLoops,
        };
        library.listening = true;
        library.activeIndex = 0;
        library.completedLoops = 1;
        library.syncUI();
        menu.open = true;
        const sizes = [...document.querySelectorAll('#listeningDeck button')].map(button => {
            const box = button.getBoundingClientRect();
            return { width: box.width, height: box.height };
        });
        menu.open = false;
        library.listening = previous.listening;
        library.activeIndex = previous.activeIndex;
        library.completedLoops = previous.completedLoops;
        library.syncUI();
        return sizes;
    });
}

async function measurePatternTools(page) {
    return page.evaluate(async () => {
        const shell = document.getElementById('patternTools');
        const nextContent = document.querySelector('.grid-hint');
        const menuIds = ['patternGenreMenu', 'euclidToolMenu', 'patternFileMenu'];
        const before = {
            shell: shell.getBoundingClientRect(),
            nextY: nextContent.getBoundingClientRect().y,
            documentHeight: document.documentElement.scrollHeight,
        };
        const menus = {};

        for (const id of menuIds) {
            const disclosure = document.getElementById(id);
            disclosure.open = true;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const shellBox = shell.getBoundingClientRect();
            const panelBox = disclosure.querySelector('.pattern-tool-panel').getBoundingClientRect();
            const targets = [...disclosure.querySelectorAll('summary, button, select')]
                .filter(element => element.getClientRects().length > 0)
                .map(element => {
                    const box = element.getBoundingClientRect();
                    return { width: box.width, height: box.height };
                });
            menus[id] = {
                shellHeight: shellBox.height,
                visualHeight: panelBox.bottom - shellBox.top,
                nextYDelta: nextContent.getBoundingClientRect().y - before.nextY,
                documentHeightDelta: document.documentElement.scrollHeight - before.documentHeight,
                panel: {
                    top: panelBox.top,
                    bottom: panelBox.bottom,
                    left: panelBox.left,
                    right: panelBox.right,
                    height: panelBox.height,
                },
                shellBottom: shellBox.bottom,
                targets,
            };
            disclosure.open = false;
        }

        return {
            shellHeight: before.shell.height,
            viewportHeight: innerHeight,
            pageWidth: {
                client: document.documentElement.clientWidth,
                scroll: document.documentElement.scrollWidth,
            },
            menus,
        };
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
        const desktopPresetMenu = await measurePresetMenu(page);
        const tablet = await capture(page, url, 'tablet-820', { width: 820, height: 1180, deviceScaleFactor: 1 });
        const tabletSaveMenu = await measureSaveMenu(page);
        const tabletPresetMenu = await measurePresetMenu(page);
        const tabletTouch = await capture(page, url, 'tablet-820-touch', {
            width: 820,
            height: 1180,
            deviceScaleFactor: 1,
            hasTouch: true,
        });
        const tabletTouchSaveMenu = await measureSaveMenu(page);
        const tabletTouchPresetMenu = await measurePresetMenu(page);
        const tabletTouchListeningDeck = await measureListeningDeck(page);
        const mobile = await capture(page, url, 'mobile-390', {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            isMobile: true,
            hasTouch: true,
        });
        await page.click('#bassWorkspaceTab');
        await new Promise(resolve => setTimeout(resolve, 220));
        await page.screenshot({ path: path.join(outputDir, 'mobile-390-bass.png'), fullPage: false });
        await page.click('#drumWorkspaceTab');
        await page.$eval('#musicPresetMenu', menu => { menu.open = true; });
        await page.screenshot({ path: path.join(outputDir, 'mobile-390-presets.png'), fullPage: false });
        await page.$eval('#musicPresetMenu', menu => { menu.open = false; });
        const mobileSaveMenu = await measureSaveMenu(page);
        const mobilePresetMenu = await measurePresetMenu(page);
        const mobileListeningDeck = await measureListeningDeck(page);
        const mobilePatternTools = {};
        for (const width of [300, 360, 390, 430]) {
            await page.setViewport({
                width,
                height: 844,
                deviceScaleFactor: 1,
                isMobile: true,
                hasTouch: true,
            });
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            mobilePatternTools[width] = await measurePatternTools(page);
        }
        await page.setViewport({
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            isMobile: true,
            hasTouch: true,
        });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
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
        assert(desktop.regions.controls.height <= 52,
            `desktop transport is no longer compact: ${desktop.regions.controls.height}px`);
        assert(tablet.regions.controls.height <= 50,
            `tablet transport is no longer compact: ${tablet.regions.controls.height}px`);
        assert(tabletTouch.regions.controls.height <= 58,
            `touch tablet transport is no longer compact: ${tabletTouch.regions.controls.height}px`);
        assert(mobile.regions.controls.height <= 54,
            `mobile transport is no longer compact: ${mobile.regions.controls.height}px`);
        assert(desktop.regions.sequencer.y <= 100 && tablet.regions.sequencer.y <= 135 &&
                tabletTouch.regions.sequencer.y <= 150 && mobile.regions.sequencer.y <= 128,
            `workspace start moved down: ${JSON.stringify({
                desktop: desktop.regions.sequencer.y,
                tablet: tablet.regions.sequencer.y,
                tabletTouch: tabletTouch.regions.sequencer.y,
                mobile: mobile.regions.sequencer.y,
            })}`);
        for (const [name, result] of Object.entries({ desktop, tablet, tabletTouch, mobile })) {
            assert(result.state.workspaceTabs === 2 && result.state.tabTargetsResolve,
                `${name} drum/bass workspace tabs are incomplete`);
            assert(result.state.activeWorkspace === 'drums' &&
                    !result.state.drumView.drumHidden && result.state.drumView.bassHidden &&
                    !result.state.drumView.drumContextHidden && result.state.drumView.bassContextHidden &&
                    result.state.bassView.drumHidden && !result.state.bassView.bassHidden &&
                    result.state.bassView.drumContextHidden && !result.state.bassView.bassContextHidden &&
                    result.state.bassView.patternTitle === '베이스 라인',
                `${name} workspace tabs do not exclusively switch panels: ${JSON.stringify(result.state)}`);
            assert(result.regions.workspaceTabs.height >= 36,
                `${name} workspace tab bar is missing: ${JSON.stringify(result.regions.workspaceTabs)}`);
            assert(result.state.beatTabStops === 1 && result.state.synthTabStops === 1,
                `${name} sequencers expose more than one roving Tab stop`);
            assert(result.state.beatRows > 1 && result.state.synthRows > 1,
                `${name} sequencer row semantics are missing`);
        }
        assert(mobile.state.patternMenusOpen === 0 && !mobile.state.libraryOpen &&
                !mobile.state.presetsOpen && !mobile.state.promoOpen && !mobile.state.transportOptionsOpen,
            'fresh mobile disclosures are not compact by default');
        for (const [width, measurement] of Object.entries(mobilePatternTools)) {
            const legacyHeight = LEGACY_MOBILE_PATTERN_TOOL_HEIGHTS[width];
            const maxHeight = legacyHeight ? Math.floor(legacyHeight * 0.25) : 105;
            assert(measurement.shellHeight <= maxHeight,
                `${width}px pattern tools exceed the compact height limit: ${measurement.shellHeight}px > ${maxHeight}px`);
            assert(measurement.pageWidth.client === measurement.pageWidth.scroll,
                `${width}px compact pattern tools cause page overflow: ${JSON.stringify(measurement.pageWidth)}`);
            for (const [id, menu] of Object.entries(measurement.menus)) {
                assert(menu.shellHeight <= maxHeight && menu.visualHeight <= maxHeight,
                    `${width}px ${id} exceeds the compact visual height limit ${maxHeight}px: ${JSON.stringify(menu)}`);
                assert(Math.abs(menu.nextYDelta) < 1.5 && Math.abs(menu.documentHeightDelta) < 1,
                    `${width}px ${id} reflows the sequencer instead of floating: ${JSON.stringify(menu)}`);
                assert(menu.panel.left >= -1 && menu.panel.right <= Number(width) + 1,
                    `${width}px ${id} escapes the mobile viewport: ${JSON.stringify(menu.panel)}`);
                assert(menu.panel.top >= menu.shellBottom - 1 && menu.panel.bottom <= measurement.viewportHeight + 1,
                    `${width}px ${id} is not positioned below the shell or escapes the viewport height: ${JSON.stringify(menu)}`);
                const expectedTargets = { patternGenreMenu: 9, euclidToolMenu: 5, patternFileMenu: 4 }[id];
                assert(menu.targets.length === expectedTargets &&
                        menu.targets.every(size => size.width >= 40 && size.height >= 40),
                    `${width}px ${id} contains a touch target below 40px: ${JSON.stringify(menu.targets)}`);
            }
        }
        for (const [name, grid] of Object.entries({ beat: mobile.state.beatGrid, synth: mobile.state.synthGrid })) {
            assert(grid.left >= 0 && grid.right <= mobile.viewport.width + 1,
                `${name} grid escapes the mobile viewport`);
            assert(grid.scrollWidth > grid.clientWidth,
                `${name} grid no longer contains its own horizontal overflow`);
        }
        assert(mobile.state.bassView.previewY > mobile.state.bassView.panelBottom &&
                mobile.state.bassView.patternY > mobile.state.bassView.panelBottom,
            'mobile supporting sections do not remain below the active bass workspace');
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
        const presetMenus = {
            desktop: { viewport: desktop.viewport, geometry: desktopPresetMenu },
            tablet: { viewport: tablet.viewport, geometry: tabletPresetMenu },
            tabletTouch: { viewport: tabletTouch.viewport, geometry: tabletTouchPresetMenu },
            mobile: { viewport: mobile.viewport, geometry: mobilePresetMenu },
        };
        for (const [name, { viewport, geometry }] of Object.entries(presetMenus)) {
            assert(geometry.panel.top >= geometry.topbarBottom - 1,
                `${name} preset menu overlaps the top bar: ${JSON.stringify(geometry)}`);
            assert(geometry.panel.left >= -1 && geometry.panel.right <= viewport.width + 1,
                `${name} preset menu escapes the viewport: ${JSON.stringify(geometry)}`);
            assert(geometry.topbarHeightDelta < 1,
                `${name} preset menu reflows the top bar: ${JSON.stringify(geometry)}`);
        }
        for (const [name, geometry] of Object.entries({ tabletTouch: tabletTouchPresetMenu, mobile: mobilePresetMenu })) {
            assert(geometry.actionSizes.length >= 9 && geometry.actionSizes.every(size => size.width >= 40 && size.height >= 40),
                `${name} preset actions are too small for touch: ${JSON.stringify(geometry.actionSizes)}`);
        }
        for (const [name, sizes] of Object.entries({
            tabletTouch: tabletTouchListeningDeck,
            mobile: mobileListeningDeck,
        })) {
            assert(sizes.length === 4 && sizes.every(size => size.width >= 40 && size.height >= 40),
                `${name} listening controls are too small for touch: ${JSON.stringify(sizes)}`);
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

        await page.focus('#musicPresetMenu > summary');
        await page.keyboard.press('Enter');
        assert(await page.$eval('#musicPresetMenu', menu => menu.open),
            'preset menu did not open from the keyboard');
        await page.keyboard.press('Escape');
        const presetEscapeState = await page.evaluate(() => ({
            open: document.getElementById('musicPresetMenu').open,
            focused: document.activeElement === document.querySelector('#musicPresetMenu > summary'),
        }));
        assert(!presetEscapeState.open && presetEscapeState.focused,
            `Escape did not close and return focus to the preset trigger: ${JSON.stringify(presetEscapeState)}`);

        await page.focus('#drumWorkspaceTab');
        await page.keyboard.press('ArrowRight');
        const bassTabState = await page.evaluate(() => ({
            active: document.querySelector('[data-workspace-tab][aria-selected="true"]')?.dataset.workspaceTab,
            focused: document.activeElement?.dataset.workspaceTab,
            drumHidden: document.getElementById('sequencerPanel').hidden,
            bassHidden: document.getElementById('synthLane').hidden,
        }));
        assert(bassTabState.active === 'bass' && bassTabState.focused === 'bass' &&
                bassTabState.drumHidden && !bassTabState.bassHidden,
            `ArrowRight did not switch to the bass panel: ${JSON.stringify(bassTabState)}`);
        await page.keyboard.press('ArrowLeft');
        const drumTabState = await page.evaluate(() => ({
            active: document.querySelector('[data-workspace-tab][aria-selected="true"]')?.dataset.workspaceTab,
            focused: document.activeElement?.dataset.workspaceTab,
            drumHidden: document.getElementById('sequencerPanel').hidden,
            bassHidden: document.getElementById('synthLane').hidden,
        }));
        assert(drumTabState.active === 'drums' && drumTabState.focused === 'drums' &&
                !drumTabState.drumHidden && drumTabState.bassHidden,
            `ArrowLeft did not return to the drum panel: ${JSON.stringify(drumTabState)}`);

        await page.focus('#transportOptions > summary');
        await page.keyboard.press('Enter');
        assert(await page.$eval('#transportOptions', menu => menu.open),
            'transport settings did not open from the keyboard');
        const transportGeometry = await page.evaluate(() => {
            const trigger = document.querySelector('#transportOptions > summary').getBoundingClientRect();
            const panel = document.getElementById('transportOptionsPanel').getBoundingClientRect();
            return {
                triggerBottom: trigger.bottom,
                panelTop: panel.top,
                panelLeft: panel.left,
                panelRight: panel.right,
                viewportWidth: innerWidth,
            };
        });
        assert(transportGeometry.panelTop >= transportGeometry.triggerBottom - 1 &&
                transportGeometry.panelLeft >= -1 &&
                transportGeometry.panelRight <= transportGeometry.viewportWidth + 1,
            `transport settings panel overlaps or escapes mobile: ${JSON.stringify(transportGeometry)}`);
        await page.keyboard.press('Escape');
        const transportEscapeState = await page.evaluate(() => ({
            open: document.getElementById('transportOptions').open,
            focused: document.activeElement === document.querySelector('#transportOptions > summary'),
        }));
        assert(!transportEscapeState.open && transportEscapeState.focused,
            `Escape did not close and return focus to transport settings: ${JSON.stringify(transportEscapeState)}`);

        await page.focus('#patternGenreMenu > summary');
        await page.keyboard.press('Enter');
        assert(await page.$eval('#patternGenreMenu', menu => menu.open),
            'genre pattern menu did not open from the keyboard');
        await page.keyboard.press('Escape');
        const patternEscapeState = await page.evaluate(() => ({
            open: document.getElementById('patternGenreMenu').open,
            focused: document.activeElement === document.querySelector('#patternGenreMenu > summary'),
        }));
        assert(!patternEscapeState.open && patternEscapeState.focused,
            `Escape did not close and return focus to the genre trigger: ${JSON.stringify(patternEscapeState)}`);

        await page.click('#patternGenreMenu > summary');
        await page.focus('.genre-btn[data-genre="rock"]');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 32));
        const genreActionState = await page.evaluate(() => ({
            open: document.getElementById('patternGenreMenu').open,
            focused: document.activeElement === document.querySelector('#patternGenreMenu > summary'),
            gridMode: drumMachine.gridMode,
            selected: document.querySelector('.genre-btn[aria-pressed="true"]')?.dataset.genre,
            label: document.getElementById('genreToolValue').textContent,
            hasPattern: Object.values(drumMachine.pattern).some(row => row.some(Boolean)),
        }));
        assert(!genreActionState.open && genreActionState.focused &&
                genreActionState.gridMode === '16' && genreActionState.selected === 'rock' &&
                genreActionState.label === '록' && genreActionState.hasPattern,
            `genre action did not apply and close cleanly: ${JSON.stringify(genreActionState)}`);

        const genreMatrix = await page.evaluate(() => {
            const expected = {
                rock: ['16', '록'], jazz: ['24', '재즈'], funk: ['16', '펑크'],
                shuffle: ['24', '셔플'], hiphop: ['16', '힙합'], edm: ['16', 'EDM'],
                reggae: ['16', '레게'], metal: ['16', '메탈'],
            };
            return Object.entries(expected).map(([genre, [gridMode, label]]) => {
                drumMachine.loadGenrePattern(genre);
                return {
                    genre,
                    expectedGridMode: gridMode,
                    gridMode: drumMachine.gridMode,
                    expectedLabel: label,
                    label: document.getElementById('genreToolValue').textContent,
                    pressed: [...document.querySelectorAll('.genre-btn[aria-pressed="true"]')]
                        .map(button => button.dataset.genre),
                    hasPattern: Object.values(drumMachine.pattern).some(row => row.some(Boolean)),
                };
            });
        });
        assert(genreMatrix.every(result => result.gridMode === result.expectedGridMode &&
                result.label === result.expectedLabel && result.pressed.join(',') === result.genre && result.hasPattern),
            `genre presets are not all wired correctly: ${JSON.stringify(genreMatrix)}`);

        const genreResetByMusicPreset = await page.evaluate(() => {
            drumMachine.loadGenrePattern('rock');
            drumMachine.presetLibrary.applyPreset(0);
            return {
                label: document.getElementById('genreToolValue').textContent,
                pressed: document.querySelectorAll('.genre-btn[aria-pressed="true"]').length,
            };
        });
        assert(genreResetByMusicPreset.label === '선택' && genreResetByMusicPreset.pressed === 0,
            `music preset left a stale genre selection: ${JSON.stringify(genreResetByMusicPreset)}`);

        const customGenreState = await page.evaluate(() => {
            drumMachine.setMode('custom');
            const menu = document.getElementById('patternGenreMenu');
            menu.querySelector('summary').click();
            const state = {
                open: menu.open,
                disabled: menu.querySelector('summary').getAttribute('aria-disabled'),
                status: document.getElementById('status').textContent,
            };
            drumMachine.setMode('normal');
            return state;
        });
        assert(!customGenreState.open && customGenreState.disabled === 'true' &&
                customGenreState.status.includes('일반 드럼 모드'),
            `custom mode did not disable the genre tool clearly: ${JSON.stringify(customGenreState)}`);

        const euclidOptionState = await page.evaluate(() => {
            drumMachine.setGridMode('24');
            const pulses = document.getElementById('euclidPulses');
            const rotate = document.getElementById('euclidRotate');
            const expanded = {
                pulseOptions: pulses.options.length,
                pulseLast: pulses.options[pulses.options.length - 1].value,
                rotateOptions: rotate.options.length,
                rotateLast: rotate.options[rotate.options.length - 1].value,
            };
            pulses.value = '24';
            rotate.value = '23';
            drumMachine.setGridMode('16');
            return {
                expanded,
                clamped: { pulses: pulses.value, rotate: rotate.value },
            };
        });
        assert(euclidOptionState.expanded.pulseOptions === 25 && euclidOptionState.expanded.pulseLast === '24' &&
                euclidOptionState.expanded.rotateOptions === 24 && euclidOptionState.expanded.rotateLast === '23' &&
                euclidOptionState.clamped.pulses === '16' && euclidOptionState.clamped.rotate === '15',
            `Euclidean option ranges do not follow grid mode: ${JSON.stringify(euclidOptionState)}`);

        await page.click('#euclidToolMenu > summary');
        await page.select('#euclidInst', 'Q');
        await page.select('#euclidPulses', '4');
        await page.select('#euclidRotate', '1');
        await page.focus('#euclidApplyBtn');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 32));
        const euclidActionState = await page.evaluate(() => ({
            open: document.getElementById('euclidToolMenu').open,
            focused: document.activeElement === document.querySelector('#euclidToolMenu > summary'),
            activeSteps: drumMachine.pattern.Q
                .map((active, index) => active ? index : -1)
                .filter(index => index >= 0),
            quickValue: document.getElementById('euclidToolValue').textContent,
        }));
        assert(!euclidActionState.open && euclidActionState.focused &&
                euclidActionState.activeSteps.join(',') === '1,5,9,13' &&
                euclidActionState.quickValue === 'P4 · R1',
            `Euclidean action did not apply and close cleanly: ${JSON.stringify(euclidActionState)}`);

        const patternFileCalls = await page.evaluate(async () => {
            const machine = drumMachine;
            const original = {
                exportPattern: machine.exportPattern,
                importPattern: machine.importPattern,
                clearBeat: machine.clearBeat,
            };
            const calls = [];
            machine.exportPattern = () => calls.push('export');
            machine.importPattern = () => calls.push('import');
            machine.clearBeat = () => calls.push('clear');
            for (const id of ['exportPatternBtn', 'importPatternBtn', 'clearPatternBtn']) {
                const menu = document.getElementById('patternFileMenu');
                menu.open = true;
                const button = document.getElementById(id);
                button.focus();
                button.click();
                await new Promise(resolve => requestAnimationFrame(resolve));
                if (menu.open || document.activeElement !== menu.querySelector('summary')) calls.push(`focus:${id}`);
            }
            machine.exportPattern = original.exportPattern;
            machine.importPattern = original.importPattern;
            machine.clearBeat = original.clearBeat;
            return calls;
        });
        assert(patternFileCalls.join(',') === 'export,import,clear',
            `pattern file actions are not wired or lose focus: ${patternFileCalls.join(',')}`);

        await page.click('#patternFileMenu > summary');
        await page.focus('#clearPatternBtn');
        await page.keyboard.press('Tab');
        await new Promise(resolve => setTimeout(resolve, 32));
        const patternTabExitState = await page.evaluate(() => ({
            open: document.getElementById('patternFileMenu').open,
            focusInside: document.getElementById('patternFileMenu').contains(document.activeElement),
        }));
        assert(!patternTabExitState.open && !patternTabExitState.focusInside,
            `Tab left a pattern popover covering the next focused control: ${JSON.stringify(patternTabExitState)}`);

        await page.click('#musicPresetMenu > summary');
        await page.focus('.music-preset-card');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 32));
        const presetActionFocus = await page.evaluate(() => ({
            open: document.getElementById('musicPresetMenu').open,
            focused: document.activeElement === document.querySelector('#musicPresetMenu > summary'),
        }));
        assert(!presetActionFocus.open && presetActionFocus.focused,
            `preset action close lost keyboard focus: ${JSON.stringify(presetActionFocus)}`);

        await page.click('#musicPresetMenu > summary');
        await page.focus('#listenAllBtn');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 100));
        const listeningActionFocus = await page.evaluate(() => ({
            open: document.getElementById('musicPresetMenu').open,
            focused: document.activeElement === document.querySelector('#musicPresetMenu > summary'),
            listening: drumMachine.presetLibrary.listening,
            playing: drumMachine.isPlaying,
        }));
        assert(!listeningActionFocus.open && listeningActionFocus.focused &&
            listeningActionFocus.listening && listeningActionFocus.playing,
            `listening action close lost focus or playback state: ${JSON.stringify(listeningActionFocus)}`);
        await page.evaluate(() => drumMachine.presetLibrary.stopListening({
            restore: true,
            stopPlayback: true,
            silent: true,
        }));

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

        const exclusiveStates = await page.evaluate(async () => {
            const disclosures = [...document.querySelectorAll('[data-top-disclosure]')];
            const states = [];
            for (const winner of disclosures) {
                winner.open = true;
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                states.push({
                    winner: winner.id,
                    open: disclosures.filter(item => item.open).map(item => item.id),
                });
            }
            disclosures.forEach(item => { item.open = false; });
            return states;
        });
        assert(exclusiveStates.length === 7 && exclusiveStates.every(state =>
                state.open.length === 1 && state.open[0] === state.winner),
            `top and pattern disclosures can remain open together: ${JSON.stringify(exclusiveStates)}`);

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
            const transportOptions = document.getElementById('transportOptions');
            transportOptions.open = true;
            const ranges = sizes('.top-transport input[type="range"]');
            const modes = sizes('.mode-btn');
            transportOptions.open = false;
            const saveSummaries = sizes('.save-menu-summary');
            const presetSummaries = sizes('.preset-menu-summary');
            drumMachine.setMode('custom');
            const customActions = sizes('.custom-mode-only .button-row button');
            drumMachine.setMode('normal');
            return { ranges, modes, saveSummaries, presetSummaries, customActions };
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
