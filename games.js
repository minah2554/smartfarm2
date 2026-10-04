import {CONTENT} from './content.js';
const rand = n => Math.floor(Math.random()*n);
const html = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function launchGame(type, onWin) {
  const config=CONTENT.games[type]; let stop=()=>{};
  const layer=document.createElement('div'); layer.className='overlay';
  layer.innerHTML=`<section class="modal game" role="dialog" aria-modal="true"><button class="close ghost" type="button">닫기</button><p class="kicker">보너스 게임 · ${config.place||''}</p><h2>${config.title}</h2><p>${config.instruction}</p><div class="game-body"></div></section>`;
  document.body.append(layer);
  const body=layer.querySelector('.game-body');
  const close=()=>{stop();layer.remove()}; layer.querySelector('.close').onclick=close;
  const win=()=>{stop();body.innerHTML='<div class="win"><div class="big">🏆</div><h2>보너스 성공! 식물이 달라졌어요.</h2><button class="primary">온실로 돌아가기</button></div>';body.querySelector('button').onclick=()=>{onWin(type);close()}};
  if(type==='observation') {
    // 빠르게 지나가는 그림을 모두 기억한 뒤, 마지막에야 어떤 그림을 셀지 질문이 나온다.
    const icons=config.icons||['🍃','🌼','☀️','💧'], frames=config.frames||20, ms=config.intervalMs||500;
    const sequence=Array.from({length:frames},()=>icons[rand(icons.length)]);
    const shown=[...new Set(sequence)], target=shown[rand(shown.length)];
    const answer=sequence.filter(x=>x===target).length;let i=0, interval;
    body.innerHTML=`<p>화면에 ${frames}개의 그림이 ${(ms/1000).toFixed(1)}초마다 바뀌어요. 어떤 그림을 셀지는 마지막에 알려 줘요!</p><div class="frame" aria-live="polite">👀</div><p class="stats" id="remaining"></p><button class="primary">관찰 시작</button>`;
    body.querySelector('button').onclick=()=>{body.querySelector('button').remove();const frame=body.querySelector('.frame');const remaining=body.querySelector('#remaining');
      const show=()=>{frame.textContent=sequence[i];frame.classList.remove('flash');void frame.offsetWidth;frame.classList.add('flash');i++;remaining.textContent=`${i} / ${frames}`};
      show();
      interval=setInterval(()=>{if(i<frames){show();return}
        clearInterval(interval);frame.textContent='❓';remaining.textContent='관찰 끝! 이제 질문이 나와요';
        body.insertAdjacentHTML('beforeend',`<label class="q">${target} 은(는) 모두 몇 번 나왔나요?<input class="field" type="number" min="0" inputmode="numeric"></label><button class="primary check">확인</button><p class="feedback" aria-live="polite"></p>`);
        body.querySelector('input').focus();
        body.querySelector('.check').onclick=()=>{const input=body.querySelector('input');if(input.value!==''&&Number(input.value)===answer)win();else body.querySelector('.feedback').textContent=`아쉬워요! 정답은 ${answer}번이었어요. 창을 닫고 다시 도전해 보세요.`};
      },ms);
    };stop=()=>clearInterval(interval);
  } else if(type==='hidden') {
    // 실제 온실 삽화의 다섯 물건을 터치해 찾는다. 좌표는 반응형 영역의 비율이다.
    const spots=[['🔍',12,37],['🧤',74,70],['🗝️',49,16],['🦋',83,29],['🚿',25,75]];
    body.innerHTML=`<p>찾을 물건: ${config.targets.join(' · ')}</p><div class="hidden-scene"><span class="scene-decor" style="left:33%;top:35%">🌿</span><span class="scene-decor" style="left:57%;top:45%">🌱</span><span class="scene-decor" style="left:3%;top:5%">☁️</span><span class="scene-decor" style="left:72%;top:3%">☀️</span></div><p class="stats">찾은 물건 0/5</p>`;
    let found=0;spots.forEach(([symbol,x,y],i)=>{const b=document.createElement('button');b.className='target';b.type='button';b.style.left=x+'%';b.style.top=y+'%';b.textContent=symbol;b.setAttribute('aria-label',config.targets[i]);
      b.onclick=()=>{if(b.disabled)return;b.disabled=true;b.classList.add('found');found++;body.querySelector('.stats').textContent=`찾은 물건 ${found}/5`;if(found===5)win()};body.querySelector('.hidden-scene').append(b)});
  } else if(type==='color') {
    const colors=[['빨강','#e7454c'],['파랑','#287acf'],['초록','#3fac68']];let remaining=config.duration,score=0, boardTimer, clockTimer, active=false;
    body.innerHTML=`<p class="stats">목표: ${html(config.target)} · ${config.passAbove}점 초과<br>시간 <span class="time">${remaining}</span>초 · 점수 <span class="score">0</span>점</p><div class="grid"></div><button class="primary start">시작</button><p class="feedback" aria-live="polite"></p>`;
    const cells=Array.from({length:16},()=>{const b=document.createElement('button');b.type='button';b.className='cell';b.disabled=true;body.querySelector('.grid').append(b);return b});
    const refresh=()=>{cells.forEach(b=>{const [label,color]=colors[rand(3)];b.dataset.color=label;b.style.background=color;b.setAttribute('aria-label',label);b.disabled=false})};
    cells.forEach(b=>b.onclick=()=>{if(!active||b.disabled)return;b.disabled=true;score+=b.dataset.color===config.target?config.correctPoints:config.wrongPoints;
      body.querySelector('.score').textContent=score;b.style.filter='brightness(1.45)'});
    body.querySelector('.start').onclick=()=>{body.querySelector('.start').remove();active=true;refresh();boardTimer=setInterval(refresh,config.changeMs);
      clockTimer=setInterval(()=>{remaining--;body.querySelector('.time').textContent=remaining;if(remaining>0)return;
        stop();cells.forEach(b=>b.disabled=true);if(score>config.passAbove)win();else{
          body.querySelector('.feedback').textContent=`${score}점 · 목표 점수 초과 실패. 다시 도전할 수 있어요.`;
          const again=document.createElement('button');again.className='primary';again.textContent=CONTENT.labels.retry;
          again.onclick=()=>{close();launchGame(type,onWin)};body.append(again)}},1000)};
    stop=()=>{active=false;clearInterval(boardTimer);clearInterval(clockTimer)};
  }
}
