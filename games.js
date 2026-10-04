import {CONTENT} from './content.js';
import {bgm} from './sound.js';   // 게임마다 다른 배경음악 (플레이 중에만)
const rand = n => Math.floor(Math.random()*n);
const html = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function launchGame(type, onWin, ctx = {}) {
  const config=CONTENT.games[type]; let stop=()=>{};
  const layer=document.createElement('div'); layer.className='overlay game-layer';
  layer.innerHTML=`<section class="modal game ${type==='hidden'?'wide':''}" role="dialog" aria-modal="true"><button class="close ghost" type="button">닫기</button><p class="kicker">보너스 게임 · ${config.place||''}</p><h2>${config.title}</h2><p>${config.instruction}</p><div class="game-body"></div></section>`;
  document.body.append(layer);
  const body=layer.querySelector('.game-body');
  const close=()=>{stop();bgm.stop(type);layer.remove()}; layer.querySelector('.close').onclick=close;
  const win=()=>{stop();bgm.stop(type);body.innerHTML='<div class="win"><div class="big">🏆</div><h2>보너스 성공! 식물이 달라졌어요.</h2><button class="primary">온실로 돌아가기</button></div>';body.querySelector('button').onclick=()=>{onWin(type);close()}};
  if(type==='observation') {
    // 빠르게 지나가는 그림을 모두 기억한 뒤, 마지막에야 어떤 그림을 셀지 질문이 나온다.
    const icons=config.icons||['🍃','🌼','☀️','💧'], frames=config.frames||20, ms=config.intervalMs||500;
    const sequence=Array.from({length:frames},()=>icons[rand(icons.length)]);
    const shown=[...new Set(sequence)], target=shown[rand(shown.length)];
    const answer=sequence.filter(x=>x===target).length;let i=0, interval;
    body.innerHTML=`<p>화면에 ${frames}개의 그림이 ${(ms/1000).toFixed(1)}초마다 바뀌어요. 어떤 그림을 셀지는 마지막에 알려 줘요!</p><div class="frame" aria-live="polite">👀</div><p class="stats" id="remaining"></p><button class="primary">관찰 시작</button>`;
    body.querySelector('button').onclick=()=>{body.querySelector('button').remove();bgm.start('observation');const frame=body.querySelector('.frame');const remaining=body.querySelector('#remaining');
      const show=()=>{frame.textContent=sequence[i];frame.classList.remove('flash');void frame.offsetWidth;frame.classList.add('flash');i++;remaining.textContent=`${i} / ${frames}`};
      show();
      interval=setInterval(()=>{if(i<frames){show();return}
        clearInterval(interval);bgm.stop('observation');frame.textContent='❓';remaining.textContent='관찰 끝! 이제 질문이 나와요';
        body.insertAdjacentHTML('beforeend',`<label class="q">${target} 은(는) 모두 몇 번 나왔나요?<input class="field" type="number" min="0" inputmode="numeric"></label><button class="primary check">확인</button><p class="feedback" aria-live="polite"></p>`);
        body.querySelector('input').focus();
        body.querySelector('.check').onclick=()=>{const input=body.querySelector('input');if(input.value!==''&&Number(input.value)===answer)win();else body.querySelector('.feedback').textContent=`아쉬워요! 정답은 ${answer}번이었어요. 창을 닫고 다시 도전해 보세요.`};
      },ms);
    };stop=()=>clearInterval(interval);
  } else if(type==='hidden') {
    // 어질러진 공구 창고: 이름만 보고 물건을 찾는다. 엉뚱한 물건을 누르면 시간이 줄어든다.
    const pool=[...config.targets].sort(()=>Math.random()-.5), picks=pool.slice(0,config.pick||5);
    const pickIcons=new Set(picks.map(t=>t.icon));
    const fillers=[...config.decoys,...pool.slice(config.pick||5).map(t=>t.icon)].filter(i=>!pickIcons.has(i));
    const cols=12, rows=7, cells=Array.from({length:cols*rows},(_,i)=>i).sort(()=>Math.random()-.5).slice(0,Math.min(config.clutter||70,cols*rows));
    const items=cells.map((cell,i)=>{const t=i<picks.length?picks[i]:null;
      return {icon:t?t.icon:fillers[rand(fillers.length)], target:t, x:((cell%cols)+.18+Math.random()*.64)/cols*100, y:((Math.floor(cell/cols))+.2+Math.random()*.6)/rows*100,
        size:t?2.7+Math.random()*.6:2.6+Math.random()*2.2, rot:Math.round(Math.random()*70-35), z:t?2:1+rand(3)}});
    let left=config.timeLimit||90, found=0, timer=null;
    body.innerHTML=`<div class="find-list" aria-label="찾을 물건">${picks.map((t,i)=>`<span class="find" data-i="${i}">${html(t.name)}</span>`).join('')}</div>
      <p class="stats">남은 시간 <span class="time">${left}</span>초 · 찾은 물건 <span class="cnt">0</span>/${picks.length}</p>
      <div class="shed"><div class="shed-cover"><button class="primary go">탐색 시작</button><p>시작하면 창고 문이 열려요</p></div></div><p class="feedback" aria-live="polite"></p>`;
    const shed=body.querySelector('.shed');
    const end=ok=>{clearInterval(timer);timer=null;bgm.stop('hidden');shed.classList.add('done');
      if(ok){setTimeout(win,500);return}
      shed.querySelectorAll('.it.t:not(.found)').forEach(b=>b.classList.add('reveal'));
      body.querySelector('.feedback').textContent='시간이 끝났어요! 빨간 동그라미가 숨은 물건이었어요.';
      const again=document.createElement('button');again.className='primary';again.textContent=CONTENT.labels.retry;
      again.onclick=()=>{close();launchGame(type,onWin)};body.append(again)};
    const tick=()=>{left=Math.max(0,left);body.querySelector('.time').textContent=left;if(left<=0)end(false)};
    body.querySelector('.go').onclick=()=>{bgm.start('hidden');
      shed.innerHTML=`<div class="shelf s1"></div><div class="shelf s2"></div><div class="shelf s3"></div><div class="peg"></div><div class="crate c1"></div><div class="crate c2"></div><div class="sack"></div>`+
        items.map((it,i)=>`<button type="button" class="it ${it.target?'t':''}" data-i="${i}" style="left:${it.x}%;top:${it.y}%;font-size:${it.size}cqw;--r:${it.rot}deg;z-index:${it.z}" aria-label="${it.target?html(it.target.name):'물건'}">${it.icon}</button>`).join('');
      timer=setInterval(()=>{left--;tick()},1000);
      shed.onclick=e=>{const b=e.target.closest('.it');if(!b||!timer)return;const it=items[Number(b.dataset.i)];
        if(it.target&&!b.classList.contains('found')){b.classList.add('found');found++;body.querySelector('.cnt').textContent=found;
          body.querySelector(`.find[data-i="${picks.indexOf(it.target)}"]`).classList.add('ok');if(found===picks.length)end(true);return}
        if(b.classList.contains('found'))return;
        left-=config.penalty||5;b.classList.remove('miss');void b.offsetWidth;b.classList.add('miss');
        const r=shed.getBoundingClientRect(),m=document.createElement('span');m.className='minus';m.textContent=`-${config.penalty||5}초`;
        m.style.left=(e.clientX-r.left)+'px';m.style.top=(e.clientY-r.top)+'px';shed.append(m);setTimeout(()=>m.remove(),900);tick()};
    };
    stop=()=>clearInterval(timer);
  } else if(type==='color') {
    // 모드 선택 → 모드별 시간(쉬운 10초·도전 15초) 터치(목표 색은 매번 무작위) → 결과·명예의 전당 등록
    const colors=[['빨강','#e7454c'],['파랑','#287acf'],['초록','#3fac68']];
    const modes=config.modes||[{key:'easy',label:'쉬운 모드',goal:50}], size=config.hallSize||10;
    let boardTimer, clockTimer; stop=()=>{clearInterval(boardTimer);clearInterval(clockTimer)};
    const hallList=async mode=>{const list=ctx.fetchHall?await ctx.fetchHall('color'):[];
      return list.filter(e=>e&&e.mode===mode).sort((x,y)=>y.score-x.score||(x.at||0)-(y.at||0)).slice(0,size)};
    const hallHtml=(rows,mine)=>rows.length?`<ol class="hall">${rows.map((e,i)=>`<li class="${mine&&e.at===mine.at&&e.name===mine.name?'me':''}"><b class="rk">${i<3?['🥇','🥈','🥉'][i]:i+1}</b><span class="nm">${html(e.name)}</span><span class="tm">${html(e.team||'')}</span><b class="sc">${e.score}점</b></li>`).join('')}</ol>`:'<p class="hall-empty">아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!</p>';
    const showHall=async(mode,mine)=>{const box=body.querySelector('.hall-box');if(!box)return;box.innerHTML='<p class="hall-empty">불러오는 중…</p>';box.innerHTML=hallHtml(await hallList(mode),mine)};
    const menu=()=>{stop();
      body.innerHTML=`<div class="mode-pick">${modes.map(m=>`<button class="mode-card ${m.key}" data-m="${m.key}"><span class="ml">${html(m.label)}</span><span class="mg">${m.duration||config.duration}초 · 목표 <b>${m.goal}</b>점 이상</span></button>`).join('')}</div>
        <section class="hall-wrap"><h3>🏛️ 명예의 전당</h3><div class="hall-tabs">${modes.map((m,i)=>`<button class="${i?'':'on'}" data-h="${m.key}">${html(m.label)}</button>`).join('')}</div><div class="hall-box"></div></section>`;
      body.querySelectorAll('[data-h]').forEach(t=>t.onclick=()=>{body.querySelectorAll('[data-h]').forEach(x=>x.classList.toggle('on',x===t));showHall(t.dataset.h)});
      body.querySelectorAll('[data-m]').forEach(bt=>bt.onclick=()=>play(modes.find(m=>m.key===bt.dataset.m)));
      showHall(modes[0].key)};
    const play=mode=>{let remaining=mode.duration||config.duration,score=0,active=false;
      const pool=colors.filter(c=>(config.targets||[config.target||'빨강']).includes(c[0])),[target,tHex]=(pool.length?pool:colors)[rand((pool.length?pool:colors).length)];
      body.innerHTML=`<p class="stats"><span class="mode-chip ${mode.key}">${html(mode.label)} · 목표 ${mode.goal}점</span><br>목표 색 <b class="tcolor" style="background:${tHex}">${html(target)}</b> · 시간 <span class="time">${remaining}</span>초 · 점수 <span class="score">0</span>점</p><div class="grid"></div><button class="primary start">시작</button><p class="feedback" aria-live="polite"></p>`;
      const cells=Array.from({length:16},()=>{const b=document.createElement('button');b.type='button';b.className='cell';b.disabled=true;body.querySelector('.grid').append(b);return b});
      const refresh=()=>{cells.forEach(b=>{const [label,color]=colors[rand(3)];b.dataset.color=label;b.style.background=color;b.style.filter='';b.setAttribute('aria-label',label);b.disabled=false})};
      cells.forEach(b=>b.onclick=()=>{if(!active||b.disabled)return;b.disabled=true;score+=b.dataset.color===target?config.correctPoints:config.wrongPoints;
        body.querySelector('.score').textContent=score;b.style.filter='brightness(1.45)'});
      body.querySelector('.start').onclick=()=>{body.querySelector('.start').remove();active=true;bgm.start('color');refresh();boardTimer=setInterval(refresh,config.changeMs);
        clockTimer=setInterval(()=>{remaining--;body.querySelector('.time').textContent=remaining;if(remaining>0)return;
          stop();bgm.stop('color');active=false;cells.forEach(b=>b.disabled=true);result(mode,score)},1000)}};
    const result=(mode,score)=>{const ok=score>=mode.goal;let mine=null;
      const people=(ctx.people||[]).filter(Boolean);
      body.innerHTML=`<div class="result ${ok?'ok':'no'}"><div class="big">${ok?'🎉':'💦'}</div><h3>${score}점 · ${ok?'목표 달성!':'목표 '+mode.goal+'점까지 '+(mode.goal-score)+'점 부족'}</h3></div>
        <section class="reg"><h4>명예의 전당에 기록 남기기</h4><p class="muted">누가 해냈나요?</p>
          <div class="who">${people.map((n,i)=>`<button class="chip" data-who="${html(n)}">${i===0&&ctx.leader===n?'★ ':''}${html(n)}</button>`).join('')}<button class="chip" data-who="${html(ctx.teamLabel?'모둠 전체':'우리 모둠')}">👥 모둠 전체</button></div>
          <button class="primary reg-btn" disabled>기록 등록</button></section>
        <section class="hall-wrap"><h3>🏛️ ${html(mode.label)} 명예의 전당</h3><div class="hall-box"></div></section>
        <div class="row">${ok?'<button class="primary claim">🏆 보너스 받기</button>':''}<button class="ghost again">다시 도전</button></div>`;
      let who=null;
      body.querySelectorAll('[data-who]').forEach(c=>c.onclick=()=>{who=c.dataset.who;body.querySelectorAll('[data-who]').forEach(x=>x.classList.toggle('on',x===c));body.querySelector('.reg-btn').disabled=false});
      body.querySelector('.reg-btn').onclick=async e=>{if(!who||mine)return;e.currentTarget.disabled=true;e.currentTarget.textContent='등록 완료!';
        mine={mode:mode.key,score,name:who,team:ctx.teamLabel||'',teamId:ctx.teamId||'',at:Date.now()};
        await ctx.addHall?.('color',{mode:mode.key,score,name:who,team:ctx.teamLabel||'',teamId:ctx.teamId||''});
        body.querySelectorAll('[data-who]').forEach(x=>x.disabled=true);
        const rows=await hallList(mode.key);const m=rows.find(r=>r.name===who&&r.score===score&&r.teamId===(ctx.teamId||''));
        body.querySelector('.hall-box').innerHTML=hallHtml(rows,m||null)};
      body.querySelector('.again').onclick=menu;
      body.querySelector('.claim')?.addEventListener('click',win);
      showHall(mode.key)};
    menu();
  }
}
