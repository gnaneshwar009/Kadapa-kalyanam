(function(){
  const SAVE_KEY = 'kadapa-kalyanam-save-v1';
  const chapterRange = document.body.dataset.chapters || '1-6';
  const [fromC, toC] = chapterRange.split('-').map(Number);

  const state = {
    affection: 10,
    blush: 8,
    energy: 85,
    humor: 0,
    logic: 0,
    currentSceneId: null,
    visited: [],
    chapterRange,
    startedAt: Date.now(),
    endingReached: false
  };

  const scenes = (window.KADAPA_SCENES || []).filter(s => s.chapter >= fromC && s.chapter <= toC || String(s.id).startsWith('mg-'));
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
  function resizeAll(){ [el.bgCanvas, el.fxCanvas, el.gameCanvas].forEach(resizeCanvas); if(state.currentSceneId) renderScene(sceneById[state.currentSceneId], false); }
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
    } catch { return false; }
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

  function drawBackground(theme){
    const w = el.bgCanvas.clientWidth, h = el.bgCanvas.clientHeight;
    bgCtx.clearRect(0,0,w,h);
    const gradients = {
      'patha-home':['#2f3f77','#12192f'], 'gd-house':['#44408a','#181a3a'], 'college-hall':['#6f8bb8','#29344f'],
      'college-lunch':['#7ba0c9','#304569'], 'road-evening':['#ff9f7a','#2e4068'], 'road-rain':['#6b7f9f','#182234'],
      'strike-day':['#b8ae87','#3a3f49'], 'shanthi-street':['#c18f8a','#3f2f46'], 'sankranti':['#ffcf7a','#8f3f63'],
      'gd-house-night':['#2e3868','#0e1533'], 'exam-day':['#8fb0cc','#2b3950'], 'farewell-hall':['#ffcecf','#874e8e'],
      'college-gate-evening':['#ffd0aa','#6d4f8d'], 'new-rtc-road':['#99cdf2','#274f7e'], 'yv-street':['#f2af83','#69392d'],
      'lake-evening':['#8ed6da','#2f4e77'], 'pelli-prep':['#ffd387','#9f5f53'], 'pelli-stage':['#ffeab8','#a05f8f'],
      'patha-home-new':['#f8d6c4','#925f87'], 'credits':['#a6bff7','#2b3158']
    };
    const g = bgCtx.createLinearGradient(0,0,0,h);
    const colors = gradients[theme] || ['#546','#112'];
    g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
    bgCtx.fillStyle = g; bgCtx.fillRect(0,0,w,h);
    for(let i=0;i<8;i++){
      bgCtx.globalAlpha = 0.2;
      bgCtx.fillStyle = i % 2 ? '#fff' : '#ffd38a';
      bgCtx.fillRect((i*140 + 40)%w, h - 60 - (i%3)*30, 100, 60 + (i%3)*20);
    }
    bgCtx.globalAlpha = 1;
  }

  function drawFX(scene){
    const w = el.fxCanvas.clientWidth, h = el.fxCanvas.clientHeight;
    fxCtx.clearRect(0,0,w,h);
    if (scene.bg === 'road-rain') {
      fxCtx.strokeStyle = 'rgba(180,220,255,.45)';
      for(let i=0;i<120;i++){
        const x = (i*17 + (Date.now()/20)%w)%w;
        const y = (i*47)%h;
        fxCtx.beginPath(); fxCtx.moveTo(x,y); fxCtx.lineTo(x-5,y+15); fxCtx.stroke();
      }
    }
  }

  function setPortraits(speaker){
    const left = ['Yagnesh','GD','Lokesh'].includes(speaker) ? speaker : 'Yagnesh';
    const right = speaker === 'Yogitha' || speaker === 'Apex Friend' ? (speaker === 'Apex Friend' ? 'Friends' : 'Yogitha') : 'Yogitha';
    el.portraitL.dataset.name = `${left}`;
    el.portraitR.dataset.name = `${right}`;
    el.portraitL.style.background = `linear-gradient(180deg, rgba(111,212,255,.35), rgba(0,0,0,.35))`;
    el.portraitR.style.background = `linear-gradient(180deg, rgba(255,124,168,.35), rgba(0,0,0,.35))`;
  }

  function playTone(freq=220,duration=0.1,type='sine',gain=0.02){
    if(!window.AudioContext) return;
    if(!playTone.ctx) playTone.ctx = new AudioContext();
    const ctx = playTone.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + duration);
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
    if (scene.effects?.time === 'morning') playTone(330,.12,'triangle',0.03);
    if (scene.speaker === 'Yogitha') playTone(523,.18,'sine',0.02);

    scene.choices?.forEach(choice => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = choice.label;
      b.onclick = () => {
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
      el.choices.appendChild(b);
    });

    if (persist) autoSave();
  }

  function showEnding(){
    state.endingReached = true;
    state.affection = 100; state.blush = 100;
    updateBars();
    el.speaker.textContent = 'Debug + Ending';
    el.text.innerHTML = `Affection and blush are maxed at the marriage completion scenes (c5-s3 onward).<br>
    Final stats => Affection: ${state.affection}, Blush: ${state.blush}, Energy: ${state.energy}, Humor: ${state.humor}, Logic: ${state.logic}.<br>
    Destiny-Fixed rule enforced: no breakup states exist in scene graph.`;
    el.choices.innerHTML = '<button class="choice" onclick="location.reload()">Replay Chapter</button>';
    autoSave();
  }

  function nextAfterMiniGame(type){
    const map = {'shadow-follow':'c2-s1','jeelakarra':'c5-s2','talambralu':'c5-s3'};
    return map[type];
  }

  function startMiniGame(type){
    el.miniWrap.classList.add('active');
    el.choices.innerHTML = '';
    if (type === 'shadow-follow') runShadowFollow();
    if (type === 'jeelakarra') runTimingGame('Jeelakarra Bellam', 'Tap stop in golden zone while maintaining eye-contact timing.', 0.14, 'jeelakarra');
    if (type === 'talambralu') runRapidTap();
  }

  function closeMini(type, won=true){
    el.miniWrap.classList.remove('active');
    mergeDelta(won ? {affection:5,blush:3} : {humor:3});
    updateBars();
    renderScene(sceneById[nextAfterMiniGame(type)]);
  }

  function runShadowFollow(){
    el.miniTitle.textContent = 'Shadow Follow: Shanthi Nagar';
    el.miniHint.textContent = 'Keep distance 120m-220m for 15 seconds. Arrow Up/Down to adjust speed.';
    let dist = 170, speed = 0, t = 0, ok = 0;
    const loop = setInterval(() => {
      t += .1;
      dist += (Math.random()*10-5) - speed;
      dist = clamp(dist, 30, 320);
      gameCtx.clearRect(0,0,el.gameCanvas.clientWidth,el.gameCanvas.clientHeight);
      gameCtx.fillStyle = '#10203f'; gameCtx.fillRect(0,0,900,400);
      gameCtx.fillStyle = '#ffd06c'; gameCtx.fillRect(120,120,120,40);
      gameCtx.fillStyle = '#6cc6ff'; gameCtx.fillRect(120 + dist,200,100,35);
      gameCtx.fillStyle = '#fff'; gameCtx.fillText(`Distance: ${Math.round(dist)}m`, 20, 24);
      gameCtx.fillText(`Time: ${t.toFixed(1)} / 15`, 20, 45);
      if (dist > 120 && dist < 220) ok += .1;
      if (t >= 15) {
        clearInterval(loop);
        document.onkeydown = null;
        closeMini('shadow-follow', ok >= 9);
      }
    }, 100);
    document.onkeydown = (e) => {
      if (e.key === 'ArrowUp') speed = clamp(speed + 2, -8, 8);
      if (e.key === 'ArrowDown') speed = clamp(speed - 2, -8, 8);
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
      gameCtx.fillStyle = '#1b2549'; gameCtx.fillRect(20,120,520,36);
      gameCtx.fillStyle = '#ffd26d'; gameCtx.fillRect(20 + zone*520,120,80,36);
      gameCtx.fillStyle = '#ff7ca8'; gameCtx.fillRect(20 + x*520,115,10,46);
      gameCtx.fillStyle = '#fff'; gameCtx.fillText('Press SPACE to lock timing', 20, 90);
    }, 40);
    document.onkeydown = (e) => {
      if (e.code === 'Space') {
        clearInterval(loop); document.onkeydown = null;
        closeMini(type, Math.abs(x-zone) < .08);
      }
    };
  }

  function runRapidTap(){
    el.miniTitle.textContent = 'Talambralu Joy Tap';
    el.miniHint.textContent = 'Tap SPACE repeatedly to fill celebration meter within 8 seconds.';
    let taps = 0, t = 0;
    const loop = setInterval(() => {
      t += .1;
      gameCtx.clearRect(0,0,el.gameCanvas.clientWidth,el.gameCanvas.clientHeight);
      gameCtx.fillStyle = '#43224f'; gameCtx.fillRect(20,140,520,26);
      gameCtx.fillStyle = '#ffd87c'; gameCtx.fillRect(20,140,Math.min(520, taps*8),26);
      gameCtx.fillStyle = '#fff'; gameCtx.fillText(`Taps: ${taps} Time: ${t.toFixed(1)}/8`,20,110);
      if (t >= 8){ clearInterval(loop); document.onkeydown = null; closeMini('talambralu', taps >= 60); }
    },100);
    document.onkeydown = (e) => { if (e.code === 'Space') taps++; };
  }

  document.getElementById('resetBtn').onclick = resetSave;
  document.getElementById('restartBtn').onclick = () => { state.currentSceneId = firstScene?.id; state.visited=[]; autoSave(); renderScene(firstScene); };

  resizeAll();
  updateBars();
  if (loadSave() && sceneById[state.currentSceneId]) renderScene(sceneById[state.currentSceneId], false);
  else renderScene(firstScene);
})();
