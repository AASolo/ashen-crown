// Дымовой тест: меню → выбор класса → игра; снимки экрана и сбор ошибок консоли.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.URL || 'http://localhost:5173/';
const OUT = process.env.OUT || '/tmp/claude-0/shots';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await page.goto(URL);
  await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Menu'), null, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '/01-menu.png' });
  const cls = process.env.CLS || 'blade';
  await page.evaluate((cls) => {
    const g = window.__game;
    const m = g.scene.getScene('Menu');
    m.chosen = cls; m.build('class');
  }, cls);
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + '/02-class.png' });
  await page.evaluate((cls) => {
    const g = window.__game; const m = g.scene.getScene('Menu');
    localStorage.clear();
    const hd = window.__dbg.newHero(cls, 0);
    hd.depth = Number(new URLSearchParams(location.search).get('depth') || 1); hd.seed = 12345;
    m.startGame(hd);
  }, cls);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').hero, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + '/03-game.png' });
  // немного побегать и подраться
  const info = await page.evaluate(() => {
    const gs = window.__game.scene.getScene('Game');
    return { enemies: gs.enemies.length, hero: [gs.hero.x, gs.hero.y], fps: window.__game.loop.actualFps, theme: gs.theme };
  });
  console.log('INFO', JSON.stringify(info));
  // телепорт к ближайшей стае и атака
  await page.evaluate(() => {
    const gs = window.__game.scene.getScene('Game');
    const e = gs.enemies.filter(e => !e.isBoss).sort((a, b) => Math.hypot(a.x - gs.hero.x, a.y - gs.hero.y) - Math.hypot(b.x - gs.hero.x, b.y - gs.hero.y))[0];
    gs.hero.x = e.x - 2; gs.hero.y = e.y - 2;
    if (!gs.level.walkable(Math.floor(gs.hero.x), Math.floor(gs.hero.y))) { gs.hero.x = e.x; gs.hero.y = e.y - 1; }
    gs.hero.target = e;
  });
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(700);
    await page.keyboard.press(['KeyQ', 'KeyW', 'KeyE'][i % 3]);
  }
  await page.screenshot({ path: OUT + '/04-fight.png' });
  // открыть инвентарь, выдав пару предметов
  await page.evaluate(() => {
    const gs = window.__game.scene.getScene('Game');
    gs.giveXp(500);
    // выдать по предмету каждой редкости для проверки сумки и подсказок
    for (let r = 0; r < 6; r++) {
      const it = window.__dbg.generateItem({ ilvl: 5, magicFind: 0, minRarity: r });
      const i = gs.heroData.bag.indexOf(null); if (i >= 0) gs.heroData.bag[i] = it;
    }
  });
  await page.keyboard.press('KeyI');
  await page.waitForTimeout(600);
  // навести на последний предмет — подсказка сравнения
  const slot = await page.evaluate(() => { const ui = window.__game.scene.getScene('UI'); const f = ui.slotRects.find(q => q.sel.where === 'bag' && q.sel.idx === 5); return f ? { x: f.r.x + f.r.w / 2, y: f.r.y + f.r.h / 2 } : null; });
  if (slot) await page.mouse.move(slot.x, slot.y);
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/05-inventory.png' });
  await page.keyboard.press('KeyI');
  await page.keyboard.press('KeyK');
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/06-skills.png' });
  await page.keyboard.press('KeyK');
  // к боссу
  await page.evaluate(() => {
    const gs = window.__game.scene.getScene('Game');
    gs.hero.hp = gs.hero.maxHp = 99999;
    const b = gs.boss; gs.hero.x = b.x - 4; gs.hero.y = b.y - 1;
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + '/07-boss.png' });
  await page.evaluate(() => { const gs = window.__game.scene.getScene('Game'); gs.boss.hp = gs.boss.maxHp * 0.5; });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: OUT + '/08-boss-phase2.png' });
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/09-map.png' });
  await page.keyboard.press('KeyM');
  const fin = await page.evaluate(() => { const gs = window.__game.scene.getScene('Game'); return { fps: window.__game.loop.actualFps, kills: gs.heroData.kills, lvl: gs.heroData.level, bag: gs.heroData.bag.filter(Boolean).length, saved: !!localStorage.getItem('ashen-crown-save-v1') }; });
  console.log('FIN', JSON.stringify(fin));
  console.log('ERRORS', errors.length ? errors.slice(0, 15).join('\n') : 'нет');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
