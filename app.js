(function(){
  const SAVE_KEY = 'kadapa-kalyanam-save-v2';
  const chapterRange = document.body.dataset.chapters || '1-6';
  const [fromC, toC] = chapterRange.split('-').map(Number);

  const state = {
    affection: 10,
    blush: 8,
    energy: 82,
    humor: 0,
    logic: 0,
    currentSceneId: null,
    visited: [],
    chapterRange,
    startedAt: Date.now(),
    endingReached: false
  };

  const scenes = (window.KADAPA_SCENES || []).filter(s => (s.chapter >= fromC && s.chapter <= toC) || String(s.id).startsWith('mg-'));
  const sceneById = Object.fromEntries(scenes.map(s => [s.id, s]));
  const firstScene = scenes.find(s => s.chapter === fromC && !String(s.id).startsWith('mg-'));

  const el = {
    sceneBadge: document.getElementById('sceneBadge'),
    chapterBadge: document.getElementById('chapterBadge'),
    affection: document.querySelector('.affection span'),
    blush: document.querySelector('.blush span'),
    energy: document.querySelector('.energy span'),
    affectionVal: document.getElementById('affectionVal'),
    blushVal: document.getElementById('blushVal'),
    energyVal: document.getElementById('energyVal'),
    speaker: document.getElementById('speaker'),
    text: document.getElementById('text'),
    choices: document.getElementById('choices'),
    portraitL: document.getElementById('portraitL'),
    portraitR: document.getElementById('portraitR'),
    saveInfo: document.getElementById('saveInfo'),
    miniWrap: document.getElementById('miniGame'),
    miniTitle: document.getElementById('miniTitle'),
    miniHint: document.getElementById('miniHint'),
    gameCanvas: document.getElementById('gameCanvas'),
    bgCanvas: document.getElementById('bgCanvas'),
    fxCanvas: document.getElementById('fxCanvas')
  };

  const bgCtx = el.bgCanvas.getContext('2d');
  const fxCtx = el.fxCanvas.getContext('2d');
  const gameCtx = el.gameCanvas.getContext('2d');

  function resizeCanvas(c){
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = Math.max(300, Math.floor(r.width * dpr));
    c.height = Math.max(200, Math.floor(r.height * dpr));
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function resizeAll(){
    [el.bgCanvas, el.fxCanvas, el.gameCanvas].forEach(resizeCanvas);
    if (state.currentSceneId) renderScene(sceneById[state.currentSceneId], false);
  }
  window.addEventListener('resize', resizeAll);

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function mergeDelta(delta={}){
    Object.keys(delta).forEach(k => {
      if (state[k] === undefined) state[k] = 0;
      state[k] += delta[k];
    });
    state.affection = clamp(state.affection, 0, 100);
    state.blush = clamp(state.blush, 0, 100);
    state.energy = clamp(state.energy, 0, 100);
  }

  function autoSave(){
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    el.saveInfo.textContent = `Auto-saved at ${new Date().toLocaleTimeString()}`;
  }

  function loadSave(){
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (saved.chapterRange !== chapterRange) return false;
      Object.assign(state, saved);
      return !!state.currentSceneId;
    } catch {
      return false;
    }
  }

  function resetSave(){
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }

  function updateBars(){
    el.affection.style.width = `${state.affection}%`;
    el.blush.style.width = `${state.blush}%`;
    el.energy.style.width = `${state.energy}%`;
    el.affectionVal.textContent = state.affection;
    el.blushVal.textContent = state.blush;
    el.energyVal.textContent = state.energy;
  }

  function drawSky(top, bottom){
    const w = el.bgCanvas.clientWidth;
    const h = el.bgCanvas.clientHeight;
    const g = bgCtx.createLinearGradient(0,0,0,h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    bgCtx.fillStyle = g;
    bgCtx.fillRect(0,0,w,h);
  }

  function drawCloud(x, y, s){
    bgCtx.globalAlpha = 0.28;
    bgCtx.fillStyle = '#ffffff';
    bgCtx.beginPath();
    bgCtx.arc(x, y, 24*s, 0, Math.PI * 2);
    bgCtx.arc(x + 24*s, y + 6*s, 20*s, 0, Math.PI * 2);
    bgCtx.arc(x - 22*s, y + 7*s, 18*s, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.globalAlpha = 1;
  }

  function drawGround(baseColor){
    const w = el.bgCanvas.clientWidth;
    const h = el.bgCanvas.clientHeight;
    bgCtx.fillStyle = baseColor;
    bgCtx.fillRect(0, h * 0.65, w, h * 0.35);
  }

  function drawBuilding(x, y, w, h, color){
    bgCtx.fillStyle = color;
    bgCtx.fillRect(x, y, w, h);
    bgCtx.fillStyle = 'rgba(255,255,255,0.28)';
    for(let r = 0; r < 3; r++){
      for(let c = 0; c < 3; c++){
        bgCtx.fillRect(x + 8 + c*(w/3), y + 10 + r*(h/4), 8, 10);
      }
    }
  }

  function drawTree(x, y, s){
    bgCtx.fillStyle = '#45362c';
    bgCtx.fillRect(x - 3*s, y, 6*s, 24*s);
    bgCtx.fillStyle = '#2d7a4d';
    bgCtx.beginPath();
    bgCtx.arc(x, y - 4*s, 15*s, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.fillStyle = '#3f9660';
    bgCtx.beginPath();
    bgCtx.arc(x + 10*s, y + 2*s, 11*s, 0, Math.PI * 2);
    bgCtx.arc(x - 10*s, y + 2*s, 11*s, 0, Math.PI * 2);
    bgCtx.fill();
  }

  function drawRoad(){
    const w = el.bgCanvas.clientWidth;
    const h = el.bgCanvas.clientHeight;
    bgCtx.fillStyle = '#424552';
    bgCtx.fillRect(0, h * 0.72, w, h * 0.28);
    bgCtx.strokeStyle = '#e8db85';
    bgCtx.lineWidth = 3;
    bgCtx.setLineDash([18, 18]);
    bgCtx.beginPath();
    bgCtx.moveTo(0, h * 0.86);
    bgCtx.lineTo(w, h * 0.86);
    bgCtx.stroke();
    bgCtx.setLineDash([]);
  }

  function drawClassroom(){
    const w = el.bgCanvas.clientWidth;
    const h = el.bgCanvas.clientHeight;
    bgCtx.fillStyle = '#e8ecf9';
    bgCtx.fillRect(0, h * 0.54, w, h * 0.46);
    bgCtx.fillStyle = '#31517c';
    bgCtx.fillRect(w * 0.2, h * 0.18, w * 0.6, h * 0.2);
    bgCtx.fillStyle = '#6b4e37';
    for(let i = 0; i < 5; i++) bgCtx.fillRect(w * 0.1 + i*(w*0.16), h * 0.62, w * 0.12, h * 0.08);
  }

  function drawMandapam(){
    const w = el.bgCanvas.clientWidth;
    const h = el.bgCanvas.clientHeight;
    bgCtx.fillStyle = '#f8c768';
    bgCtx.fillRect(w * 0.12, h * 0.42, w * 0.76, h * 0.22);
    bgCtx.fillStyle = '#a14f6a';
    bgCtx.fillRect(w * 0.1, h * 0.37, w * 0.8, h * 0.07);
    bgCtx.fillStyle = '#ffd778';
    for(let i = 0; i < 16; i++) bgCtx.fillRect(w * 0.11 + i*(w*0.05), h * 0.34, 8, 32);
  }

  function drawBackground(theme = ''){
    const w = el.bgCanvas.clientWidth;
    const h = el.bgCanvas.clientHeight;
    bgCtx.clearRect(0,0,w,h);

    if (theme.includes('classroom') || theme.includes('college-corridor') || theme.includes('exam')) {
      drawSky('#b9d6ff', '#dde8fb');
      drawClassroom();
      drawBuilding(40, h * 0.36, 95, 92, '#708eb1');
      drawBuilding(w - 150, h * 0.34, 108, 108, '#6783ab');
      return;
    }

    if (theme.includes('pelli') || theme.includes('mandapam') || theme.includes('vow') || theme.includes('anniversary')) {
      drawSky('#3c2e63', '#a35a7c');
      drawGround('#7b4a57');
      drawMandapam();
      return;
    }

    if (theme.includes('road') || theme.includes('street') || theme.includes('gate') || theme.includes('highway')) {
      drawSky('#8dc8ff', '#f8b07b');
      drawCloud(130, 80, 1.2);
      drawCloud(w - 180, 96, 1);
      drawGround('#5f946a');
      drawRoad();
      drawTree(90, h * 0.68, 1.1);
      drawTree(w - 120, h * 0.67, 1.3);
      drawBuilding(24, h * 0.5, 110, 90, '#44617b');
      drawBuilding(w - 180, h * 0.48, 140, 110, '#5e6c89');
      return;
    }

    if (theme.includes('home') || theme.includes('gd-house') || theme.includes('shanthi')) {
      drawSky('#9fc4ff', '#ffdcb1');
      drawGround('#6fa071');
      drawBuilding(70, h * 0.46, 150, 120, '#cb9e77');
      drawBuilding(w - 250, h * 0.44, 180, 130, '#b88e6a');
      drawTree(52, h * 0.64, 1.2);
      drawTree(w - 40, h * 0.62, 1.3);
      bgCtx.fillStyle = '#3d934e';
      for(let i = 0; i < 10; i++) bgCtx.fillRect(20 + i * 80, h * 0.72, 20, 8);
      return;
    }

    drawSky('#7a97c5', '#2a3558');
    drawGround('#4c587c');
    drawBuilding(40, h * 0.48, 120, 100, '#5f6f90');
    drawBuilding(w - 180, h * 0.48, 140, 100, '#5e6c89');
  }

  function drawFX(scene){
    const w = el.fxCanvas.clientWidth;
    const h = el.fxCanvas.clientHeight;
    fxCtx.clearRect(0,0,w,h);
    if ((scene.bg || '').includes('rain')) {
      fxCtx.strokeStyle = 'rgba(190,230,255,.52)';
      for(let i = 0; i < 110; i++){
        const x = (i * 19 + (Date.now() / 20) % w) % w;
        const y = (i * 31) % h;
        fxCtx.beginPath();
        fxCtx.moveTo(x, y);
        fxCtx.lineTo(x - 8, y + 18);
        fxCtx.stroke();
      }
    }
  }

  function setPortraits(speaker){
    const left = ['Yagnesh','GD','Lokesh','Narrator'].includes(speaker) ? (speaker === 'Narrator' ? 'Yagnesh' : speaker) : 'Yagnesh';
    const right = speaker === 'Yogitha' || speaker === 'Apex Friend' ? (speaker === 'Apex Friend' ? 'Apex Friends' : 'Yogitha') : 'Yogitha';
    el.portraitL.dataset.name = left;
    el.portraitR.dataset.name = right;
    el.portraitL.style.setProperty('--portrait-accent', '#78d8ff');
    el.portraitR.style.setProperty('--portrait-accent', '#ff93bc');
  }

  function playTone(freq=220,duration=0.1,type='sine',gain=0.02){
    if(!window.AudioContext) return;
    if(!playTone.ctx) playTone.ctx = new AudioContext();
    const ctx = playTone.ctx;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gainNode.gain.value = gain;
    osc.connect(gainNode).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function renderScene(scene, persist=true){
    if (!scene) return;
    state.currentSceneId = scene.id;
    if (!state.visited.includes(scene.id)) state.visited.push(scene.id);
    el.sceneBadge.textContent = `Scene ${state.visited.length}`;
    el.chapterBadge.textContent = `Chapter ${scene.chapter}`;
    drawBackground(scene.bg);
    drawFX(scene);
    setPortraits(scene.speaker);
    el.speaker.textContent = scene.speaker;
    el.text.textContent = scene.text;
    el.choices.innerHTML = '';

    if (scene.effects?.time === 'morning') playTone(330, 0.12, 'triangle', 0.03);
    if (scene.speaker === 'Yogitha') playTone(523, 0.16, 'sine', 0.02);

    scene.choices?.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.textContent = choice.label;
      btn.onclick = () => {
        if (choice.delta) mergeDelta(choice.delta);
        updateBars();
        if (choice.miniGame || scene.miniGame) {
          startMiniGame(choice.miniGame || scene.miniGame);
          return;
        }
        if (choice.next) renderScene(sceneById[choice.next]);
        else showEnding();
        autoSave();
      };
      el.choices.appendChild(btn);
    });

    if (persist) autoSave();
  }

  function showEnding(){
    state.endingReached = true;
    state.affection = 100;
    state.blush = 100;
    updateBars();
    el.speaker.textContent = 'Final Audit + Happy Ending';
    el.text.innerHTML = `Destiny-Fixed validated. All branches converge to a successful marriage and post-marriage happiness.<br>
      Affection full-cap target: Chapter 10-11 (or earlier on high-affection paths).<br>
      Blush full-cap target: late Chapter 10 to Chapter 11.<br>
      Final Stats → Affection: ${state.affection}, Blush: ${state.blush}, Energy: ${state.energy}, Humor: ${state.humor}, Logic: ${state.logic}.`;
    el.choices.innerHTML = '<button class="choice" onclick="location.reload()">Replay Chapter</button>';
    autoSave();
  }

  function nextAfterMiniGame(type){
    const map = {
      'shadow-follow': 'c2-s2',
      'jeelakarra': 'c5-s4',
      'talambralu': 'c5-s5'
    };
    return map[type];
  }

  function startMiniGame(type){
    el.miniWrap.classList.add('active');
    el.choices.innerHTML = '';
    if (type === 'shadow-follow') runShadowFollow();
    if (type === 'jeelakarra') runTimingGame('Jeelakarra Bellam', 'Press SPACE when marker stays in the golden zone.', 0.62, 'jeelakarra');
    if (type === 'talambralu') runRapidTap();
  }

  function closeMini(type, won=true){
    el.miniWrap.classList.remove('active');
    mergeDelta(won ? { affection: 5, blush: 3 } : { humor: 3 });
    updateBars();
    renderScene(sceneById[nextAfterMiniGame(type)]);
  }

  function runShadowFollow(){
    el.miniTitle.textContent = 'Shadow Follow: Shanthi Nagar';
    el.miniHint.textContent = 'Maintain 120m-220m for 18 seconds. ArrowUp/ArrowDown to adjust.';
    let dist = 170, speed = 0, t = 0, ok = 0;
    const loop = setInterval(() => {
      t += 0.1;
      dist += (Math.random() * 10 - 5) - speed;
      dist = clamp(dist, 40, 330);
      gameCtx.clearRect(0,0,el.gameCanvas.clientWidth,el.gameCanvas.clientHeight);
      gameCtx.fillStyle = '#15294e';
      gameCtx.fillRect(0,0,900,400);
      gameCtx.fillStyle = '#404752';
      gameCtx.fillRect(0,250,900,120);
      gameCtx.fillStyle = '#ffd27a';
      gameCtx.fillRect(120,190,120,44);
      gameCtx.fillStyle = '#78cfff';
      gameCtx.fillRect(120 + dist,245,96,34);
      gameCtx.fillStyle = '#fff';
      gameCtx.fillText(`Distance: ${Math.round(dist)}m`, 20, 24);
      gameCtx.fillText(`Time: ${t.toFixed(1)} / 18`, 20, 46);
      if (dist > 120 && dist < 220) ok += 0.1;
      if (t >= 18) {
        clearInterval(loop);
        document.onkeydown = null;
        closeMini('shadow-follow', ok >= 10.5);
      }
    }, 100);
    document.onkeydown = (e) => {
      if (e.key === 'ArrowUp') speed = clamp(speed + 1.8, -8, 8);
      if (e.key === 'ArrowDown') speed = clamp(speed - 1.8, -8, 8);
    };
  }

  function runTimingGame(title, hint, zone, type){
    el.miniTitle.textContent = title;
    el.miniHint.textContent = hint;
    let x = 0, dir = 1;
    const loop = setInterval(() => {
      x += dir * 0.02;
      if (x >= 1 || x <= 0) dir *= -1;
      gameCtx.clearRect(0,0,el.gameCanvas.clientWidth,el.gameCanvas.clientHeight);
      gameCtx.fillStyle = '#2a234e';
      gameCtx.fillRect(20,120,520,36);
      gameCtx.fillStyle = '#ffd26d';
      gameCtx.fillRect(20 + zone*520 - 30,120,80,36);
      gameCtx.fillStyle = '#ff7ca8';
      gameCtx.fillRect(20 + x*520,115,10,46);
      gameCtx.fillStyle = '#fff';
      gameCtx.fillText('Press SPACE to lock ritual timing', 20, 90);
    }, 40);
    document.onkeydown = (e) => {
      if (e.code === 'Space') {
        clearInterval(loop);
        document.onkeydown = null;
        closeMini(type, Math.abs(x - zone) < 0.09);
      }
    };
  }

  function runRapidTap(){
    el.miniTitle.textContent = 'Talambralu Joy Tap';
    el.miniHint.textContent = 'Press SPACE rapidly to fill celebration meter in 10 seconds.';
    let taps = 0, t = 0;
    const loop = setInterval(() => {
      t += 0.1;
      gameCtx.clearRect(0,0,el.gameCanvas.clientWidth,el.gameCanvas.clientHeight);
      gameCtx.fillStyle = '#4a2754';
      gameCtx.fillRect(20,140,520,26);
      gameCtx.fillStyle = '#ffd87c';
      gameCtx.fillRect(20,140,Math.min(520, taps*6.5),26);
      gameCtx.fillStyle = '#fff';
      gameCtx.fillText(`Taps: ${taps}  Time: ${t.toFixed(1)}/10`, 20, 110);
      if (t >= 10) {
        clearInterval(loop);
        document.onkeydown = null;
        closeMini('talambralu', taps >= 68);
      }
    }, 100);
    document.onkeydown = (e) => { if (e.code === 'Space') taps++; };
  }

  document.getElementById('resetBtn').onclick = resetSave;
  document.getElementById('restartBtn').onclick = () => {
    state.currentSceneId = firstScene?.id;
    state.visited = [];
    autoSave();
    renderScene(firstScene);
  };

  resizeAll();
  updateBars();
  if (loadSave() && sceneById[state.currentSceneId]) renderScene(sceneById[state.currentSceneId], false);
  else renderScene(firstScene);
})();
