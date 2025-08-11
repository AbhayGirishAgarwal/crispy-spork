(() => {
    const introScreen = document.getElementById('introScreen');
    const endScreen = document.getElementById('endScreen');
    const boardEl = document.getElementById('board');
    const toastEl = document.getElementById('toast');
  
    const diffSelect = document.getElementById('difficulty');
    const startBtn = document.getElementById('startBtn');
  
    const levelLabel = document.getElementById('levelLabel');
    const timeDisplay = document.getElementById('timeDisplay');
    const matchesDisplay = document.getElementById('matchesDisplay');
    const attemptsDisplay = document.getElementById('attemptsDisplay');
    const accuracyDisplay = document.getElementById('accuracyDisplay');
  
    const finalLevel = document.getElementById('finalLevel');
    const finalTime = document.getElementById('finalTime');
    const finalMatches = document.getElementById('finalMatches');
    const finalAttempts = document.getElementById('finalAttempts');
    const finalAccuracy = document.getElementById('finalAccuracy');
    const medalBadge = document.getElementById('medalBadge');
  
    const PAIRS = [
      { id: 1, scenario: "You arrive at the royal hall where elders are seated.", response: "Greet them first with a polite hello, bow, or curtsy.", tip: "In the royal court, elders are greeted first to show respect." },
      { id: 2, scenario: "You accidentally bump someone in a busy corridor.", response: "Say “Excuse me” and check if they’re okay.", tip: "Always acknowledge accidents quickly and kindly." },
      { id: 3, scenario: "At the banquet, you need to sneeze.", response: "Turn away, cover with a tissue or elbow, then say “Pardon me.”", tip: "Covering your mouth keeps everyone comfortable and healthy." },
      { id: 4, scenario: "A page brings you a gift.", response: "Say “Thank you” and smile—gratitude is golden.", tip: "Gratitude builds goodwill in any kingdom." },
      { id: 5, scenario: "Two friends are speaking and you need help.", response: "Wait for a pause, then say “Excuse me” before speaking.", tip: "Interrupt kindly; timing and tone matter." },
      { id: 6, scenario: "At dinner, you want the bread that’s far away.", response: "Ask politely, “Could you please pass the bread?”", tip: "Asking to pass items keeps the table calm and tidy." },
      { id: 7, scenario: "Your friend shares a story.", response: "Listen without interrupting and make eye contact.", tip: "Listening shows value and respect." },
      { id: 8, scenario: "You’ve made a mistake during rehearsal.", response: "Apologize briefly and try again positively.", tip: "Short, sincere apologies are best." },
      { id: 9, scenario: "Someone new joins your table.", response: "Welcome them and offer a seat or space.", tip: "Inclusion is a royal habit." },
      { id:10, scenario: "You cough while others are eating.", response: "Cover your mouth and take a sip of water.", tip: "Small manners keep meals pleasant." },
      { id:11, scenario: "You receive help carrying books.", response: "Say thanks and offer help next time.", tip: "Return kindness when you can." },
      { id:12, scenario: "You need to leave a conversation.", response: "Say, “Excuse me, I must go now. Thank you!”", tip: "Exit politely—never vanish." }
    ];
  
    let level = 'medium';
    let targetPairs = 9;
    let timerId = null;
    let matches = 0;
    let attempts = 0;
    let firstCard = null;
    let lockBoard = false;
    let totalPairs = 0;
    let startTimestamp = 0;
  
    const AudioFX = (() => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      function tone(freq=440, dur=0.12, type='sine', vol=0.15) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type; o.frequency.value = freq;
        o.connect(g); g.connect(ctx.destination);
        g.gain.value = vol;
        o.start(); o.stop(ctx.currentTime + dur);
      }
      function chime() {
        const g = ctx.createGain(); g.connect(ctx.destination); g.gain.value = 0.12;
        const now = ctx.currentTime;
        const o1 = ctx.createOscillator();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(880, now);
        o1.frequency.linearRampToValueAtTime(988, now + 0.15);
        o1.connect(g); o1.start(now); o1.stop(now + 0.2);
      }
      function noNoBuzz() {
        const g = ctx.createGain(); g.connect(ctx.destination); g.gain.value = 0.15;
        const now = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(140, now);
        o.frequency.linearRampToValueAtTime(110, now + 0.1);
        o.frequency.setValueAtTime(140, now + 0.2);
        o.frequency.linearRampToValueAtTime(110, now + 0.3);
        o.connect(g); o.start(now); o.stop(now + 0.35);
      }
      return {
        flip: () => tone(740, .08, 'square', 0.07),
        match: () => chime(),
        mismatch: () => noNoBuzz(),
        start: () => tone(523, .25, 'triangle', 0.12),
        win: () => chime()
      };
    })();
  
    const pad = n => String(n).padStart(2,'0');
    function formatTime(ms) {
      const s = Math.max(0, Math.floor(ms/1000));
      const mm = Math.floor(s/60), ss = s % 60;
      return `${pad(mm)}:${pad(ss)}`;
    }
    function shuffle(arr) {
      for(let i=arr.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [arr[i],arr[j]] = [arr[j],arr[i]];
      }
      return arr;
    }
    function levelConfig(lvl){
      if(lvl==='easy') return {pairs:6, time:90};
      if(lvl==='hard') return {pairs:12, time:150};
      return {pairs:9, time:120};
    }
    function setBoardCols(count){
      boardEl.className = 'board';
      const cols = count <= 12 ? 4 : count <= 18 ? 5 : 6;
      boardEl.classList.add(`cols-${cols}`);
    }
    function showToast(text){
      toastEl.innerHTML = `<span class="tip-title">Etiquette Tip:</span> ${text}`;
      toastEl.classList.add('show');
      setTimeout(()=> toastEl.classList.remove('show'), 2200);
    }
    function rotatePairs(arr, by){ return arr.slice(by).concat(arr.slice(0,by)); }
    function buildDeck(list, pairs){
      const chosen = list.slice(0, pairs);
      const deck = [];
      chosen.forEach(p=>{
        deck.push({ id:`S${p.id}`, pairId:p.id, type:'scenario', text:p.scenario });
        deck.push({ id:`R${p.id}`, pairId:p.id, type:'response', text:p.response, tip:p.tip });
      });
      return shuffle(deck);
    }
    function renderBoard(deck){
      boardEl.innerHTML = '';
      setBoardCols(deck.length);
      deck.forEach(card=>{
        const el = document.createElement('button');
        el.className = 'card';
        el.dataset.pairId = card.pairId;
        el.dataset.type = card.type;
        el.dataset.id = card.id;
        el.innerHTML = `
          <div class="card-inner">
            <div class="face front ${card.type==='scenario' ? 'scenario-front' : 'response-front'}">
              <div class="card-type-front">${card.type==='scenario' ? 'Scenario' : 'Response'}</div>
            </div>
            <div class="face back">
              <div class="card-type">${card.type==='scenario' ? 'Scenario' : 'Response'}</div>
              <div class="card-text">${card.text}</div>
            </div>
          </div>
        `;
        el.addEventListener('click', ()=> onFlip(el, card));
        boardEl.appendChild(el);
      });
    }
    function onFlip(el, data){
      if(lockBoard || el.classList.contains('matched') || el.classList.contains('flipped')) return;
      AudioFX.flip();
      el.classList.add('flipped');
      if(!firstCard){
        firstCard = {el, data}; return;
      }
      attempts++; updateHUD();
      const isMatch = (firstCard.data.pairId === data.pairId) && (firstCard.data.type !== data.type);
      if(isMatch){
        el.classList.add('matched');
        firstCard.el.classList.add('matched');
        matches++; updateHUD();
        AudioFX.match();
        const tipText = data.tip || firstCard.data.tip || "";
        if(tipText) showToast(tipText);
        firstCard = null;
        if(matches === totalPairs) setTimeout(endGame, 450);
      } else {
        lockBoard = true; AudioFX.mismatch();
        setTimeout(()=>{
          el.classList.remove('flipped');
          firstCard.el.classList.remove('flipped');
          firstCard = null; lockBoard = false;
        }, 650);
      }
    }
    function updateHUD(){
      matchesDisplay.textContent = matches;
      attemptsDisplay.textContent = attempts;
      const acc = attempts ? Math.round((matches/attempts)*100) : 100;
      accuracyDisplay.textContent = `${acc}%`;
    }
    function startTimer(sec){
      clearInterval(timerId);
      const endAt = Date.now() + sec*1000;
      startTimestamp = Date.now();
      timeDisplay.textContent = formatTime(sec*1000);
      timerId = setInterval(()=>{
        const msLeft = endAt - Date.now();
        timeDisplay.textContent = formatTime(msLeft);
        if(msLeft <= 0){
          clearInterval(timerId); timeDisplay.textContent = '00:00'; endGame(true);
        }
      }, 250);
    }
    function computeMedal(msElapsed, attempts, matches, pairs){
      const acc = attempts ? matches/attempts : 1;
      const seconds = msElapsed/1000;
      const base = pairs===12?{gold:95,silver:120}:pairs===9?{gold:80,silver:100}:{gold:60,silver:80};
      if(acc >= 0.88 && seconds <= base.gold) return '🥇';
      if(acc >= 0.75 && seconds <= base.silver) return '🥈';
      return '🥉';
    }
    function endGame(){
      clearInterval(timerId);
      const elapsed = Date.now() - startTimestamp;
      const medal = computeMedal(elapsed, attempts, matches, totalPairs);
      AudioFX.win();
      finalLevel.textContent = level[0].toUpperCase()+level.slice(1);
      finalTime.textContent = formatTime(elapsed);
      finalMatches.textContent = `${matches}/${totalPairs}`;
      finalAttempts.textContent = attempts;
      const acc = attempts ? Math.round((matches/attempts)*100) : 100;
      finalAccuracy.textContent = `${acc}%`;
      medalBadge.textContent = medal;
      endScreen.hidden = false;
    }
    function resetState(){
      clearInterval(timerId);
      matches = 0; attempts = 0; firstCard = null; lockBoard = false; updateHUD();
    }
    function startGame(){
      level = diffSelect.value || level;
      const cfg = levelConfig(level);
      targetPairs = cfg.pairs; totalPairs = targetPairs;
      levelLabel.textContent = level[0].toUpperCase()+level.slice(1);
      const rotated = rotatePairs(PAIRS, Math.floor(Math.random()*PAIRS.length));
      const deck = buildDeck(rotated, targetPairs);
      resetState(); renderBoard(deck); startTimer(cfg.time);
      introScreen.style.display = 'none'; endScreen.hidden = true; AudioFX.start();
    }
    startBtn.addEventListener('click', startGame);
    diffSelect.addEventListener('keydown', e=>{ if(e.key==='Enter') startGame(); });
    introScreen.style.display = 'flex';
  })();
  