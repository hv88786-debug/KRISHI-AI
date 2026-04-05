/* AgroGuardian — Animations + Accordion Engine */
(function(){

/* 1. NAV scroll shadow */
var nav=document.querySelector('nav');
if(nav){
  window.addEventListener('scroll',function(){
    nav.classList.toggle('scrolled',window.scrollY>10);
  });
}

/* 2. Page-link smooth transitions */
document.addEventListener('click',function(e){
  var a=e.target.closest('a[href]');
  if(!a)return;
  var href=a.getAttribute('href');
  if(!href||href.startsWith('#')||href.startsWith('http')||href.startsWith('javascript'))return;
  e.preventDefault();
  document.body.style.opacity='0';
  document.body.style.transform='translateY(-6px)';
  document.body.style.transition='opacity 0.22s ease,transform 0.22s ease';
  setTimeout(function(){window.location.href=href;},220);
});

/* 3. Scroll reveal (all variants) */
var revealEls=document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale');
var revObs=new IntersectionObserver(function(entries){
  entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible');});
},{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
revealEls.forEach(function(el){revObs.observe(el);});

/* 4. Counter animation */
function animateCounter(el,target,duration){
  var start=0,startTime=null;
  var isFloat=String(target).includes('.');
  function step(ts){
    if(!startTime)startTime=ts;
    var prog=Math.min((ts-startTime)/duration,1);
    var ease=1-Math.pow(1-prog,3);
    var val=start+(target-start)*ease;
    el.textContent=isFloat?val.toFixed(1):Math.round(val).toLocaleString();
    if(prog<1)requestAnimationFrame(step);
    else el.textContent=isFloat?target.toFixed(1):target.toLocaleString();
  }
  requestAnimationFrame(step);
}
var counterObs=new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting&&!e.target.dataset.counted){
      e.target.dataset.counted='1';
      var raw=e.target.dataset.count;
      var target=parseFloat(raw);
      animateCounter(e.target,target,1200);
    }
  });
},{threshold:0.5});
document.querySelectorAll('[data-count]').forEach(function(el){counterObs.observe(el);});

/* 5. Accordion (AC) */
function setupAC(){
  document.querySelectorAll('.ac-header').forEach(function(header){
    if(header.dataset.acReady)return;
    header.dataset.acReady='1';
    header.addEventListener('click',function(){
      var ac=header.closest('.ac');
      var body=ac.querySelector('.ac-body');
      var isOpen=ac.classList.contains('ac-open');
      /* close all siblings in same group */
      var group=ac.dataset.group;
      if(group){
        document.querySelectorAll('.ac[data-group="'+group+'"]').forEach(function(sib){
          if(sib!==ac){
            sib.classList.remove('ac-open');
            var sb=sib.querySelector('.ac-body');
            if(sb){sb.style.maxHeight='0';sb.classList.remove('ac-body-open');}
          }
        });
      }
      if(isOpen){
        ac.classList.remove('ac-open');
        body.style.maxHeight='0';
        body.classList.remove('ac-body-open');
      } else {
        ac.classList.add('ac-open');
        body.style.maxHeight=body.scrollHeight+'px';
        body.classList.add('ac-body-open');
      }
    });
    /* open by default if has ac-open class */
    if(header.closest('.ac').classList.contains('ac-open')){
      var body=header.closest('.ac').querySelector('.ac-body');
      if(body){body.style.maxHeight=body.scrollHeight+'px';body.classList.add('ac-body-open');}
    }
  });
}
setupAC();

/* 6. Toast system */
window.showToast=function(opts){
  opts=opts||{};
  var container=document.querySelector('.toast-container');
  if(!container){container=document.createElement('div');container.className='toast-container';document.body.appendChild(container);}
  var t=document.createElement('div');
  t.className='toast toast-'+(opts.type||'green');
  t.innerHTML='<span class="toast-icon">'+(opts.icon||'✅')+'</span>'
    +'<div class="toast-body"><div class="toast-text">'+(opts.title||'Done')+'</div>'
    +(opts.sub?'<div class="toast-sub">'+opts.sub+'</div>':'')
    +'</div>'
    +'<button class="toast-close" onclick="this.closest(\'.toast\').remove()">×</button>'
    +'<div class="toast-progress"></div>';
  container.appendChild(t);
  setTimeout(function(){if(t.parentNode)t.remove();},4200);
};

/* 7. Button ripple */
document.querySelectorAll('.btn,.action-btn,.scan-btn,.ab-green,.ab-outline').forEach(function(btn){
  btn.addEventListener('click',function(e){
    var r=document.createElement('span');
    var rect=btn.getBoundingClientRect();
    r.style.cssText='position:absolute;border-radius:50%;background:rgba(255,255,255,0.25);width:80px;height:80px;margin-top:-40px;margin-left:-40px;left:'+(e.clientX-rect.left)+'px;top:'+(e.clientY-rect.top)+'px;animation:rippleEl 0.6s ease-out;pointer-events:none;z-index:0';
    btn.appendChild(r);
    setTimeout(function(){r.remove();},620);
  });
});
var style=document.createElement('style');
style.textContent='@keyframes rippleEl{0%{transform:scale(0);opacity:0.4}100%{transform:scale(3.5);opacity:0}}.btn,.action-btn,.scan-btn{position:relative;overflow:hidden}';
document.head.appendChild(style);

/* 8. Stagger children on load */
document.querySelectorAll('.stagger-children').forEach(function(el){
  setTimeout(function(){el.classList.add('loaded');},100);
});

/* 9. Number shimmer on metric cards hover */
document.querySelectorAll('.mcard,.stat-card,.impact-card').forEach(function(card){
  card.addEventListener('mouseenter',function(){
    var val=card.querySelector('.mcard-val,.stat-num,.impact-num');
    if(val){val.style.transform='scale(1.06)';val.style.transition='transform 0.2s cubic-bezier(0.34,1.56,0.64,1)';}
  });
  card.addEventListener('mouseleave',function(){
    var val=card.querySelector('.mcard-val,.stat-num,.impact-num');
    if(val){val.style.transform='';}
  });
});

})();
