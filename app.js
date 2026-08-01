const KAKAO_JAVASCRIPT_KEY = '';
const KAKAO_CHANNEL_PUBLIC_ID = '';
const HERO_INTERVAL_MS = 6500;
const PROGRAM_INTERVAL_MS = 5000; // 2초 전환을 원하면 2000으로 변경
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function lineMarkup(html) {
  return html.split(/<br\s*\/?\s*>/i).map((line) => `<span class="motion-line"><span>${line}</span></span>`).join('');
}

const toast = document.querySelector('.toast');
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function openKakaoChannel() {
  if (!KAKAO_JAVASCRIPT_KEY || !KAKAO_CHANNEL_PUBLIC_ID) {
    showToast('app.js에 카카오 JavaScript 키와 채널 ID를 입력해 주세요.');
    return;
  }
  try {
    if (!window.Kakao) throw new Error('Kakao SDK not loaded');
    if (!Kakao.isInitialized()) Kakao.init(KAKAO_JAVASCRIPT_KEY);
    Kakao.Channel.chat({ channelPublicId: KAKAO_CHANNEL_PUBLIC_ID });
  } catch (error) {
    console.error(error);
    showToast('카카오톡 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

const menuToggle = document.querySelector('.menu-toggle');
menuToggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.mobile-nav a').forEach((link) => link.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

function createHeroCarousel() {
  const root = document.querySelector('[data-carousel="hero"]');
  const slides = [...root.querySelectorAll('.carousel-slide')];
  const current = document.querySelector('[data-current]');
  const progress = document.querySelector('[data-progress]');
  const nextTitle = document.querySelector('[data-next-title]');
  let index = 1;
  let timer;
  let startX = 0;

  function render() {
    slides.forEach((slide, i) => {
      let position = i - index;
      if (position > slides.length / 2) position -= slides.length;
      if (position < -slides.length / 2) position += slides.length;
      slide.classList.toggle('is-active', i === index);
      slide.dataset.orbit = position < 0 ? 'previous' : position > 0 ? 'next' : 'active';
      slide.style.setProperty('--orbit-position', String(position));
      slide.style.setProperty('--orbit-depth', String(Math.min(Math.abs(position), 2)));
    });
    const active = slides[index];
    const activeCenter = active.offsetLeft + active.offsetWidth / 2;
    root.querySelector('.carousel-track').style.transform = `translateX(${Math.min(0, root.clientWidth * .5 - activeCenter)}px)`;
    current.textContent = String(index + 1).padStart(2, '0');
    progress.style.width = `${((index + 1) / slides.length) * 100}%`;
    nextTitle.textContent = slides[(index + 1) % slides.length].dataset.title;
  }
  function go(next) { index = (next + slides.length) % slides.length; render(); restart(); }
  function restart() {
    window.clearInterval(timer);
    if (!reducedMotion) timer = window.setInterval(() => go(index + 1), HERO_INTERVAL_MS);
  }
  document.querySelector('[data-prev]').addEventListener('click', () => go(index - 1));
  document.querySelector('[data-next]').addEventListener('click', () => go(index + 1));
  root.addEventListener('pointerdown', (event) => { startX = event.clientX; });
  root.addEventListener('pointerup', (event) => { const distance = event.clientX - startX; if (Math.abs(distance) > 45) go(index + (distance < 0 ? 1 : -1)); });
  window.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft') go(index - 1); if (event.key === 'ArrowRight') go(index + 1); });
  window.addEventListener('resize', render);
  render(); restart();
}

const programs = [
  { label: 'PROGRAM 01 / BEGINNER', title: '처음 시작하는<br>첼로', description: '악기 선택부터 바른 자세와 활 쓰기까지,<br>첫 소리를 편안하고 탄탄하게 만듭니다.', image: 'assets/cello-carousel-adult.png', alt: '입문 첼로 레슨 장면', meta: [['01 / SETUP','몸에 맞는 시작','악기와 의자 높이, 자세를 함께 맞춥니다.'],['02 / BOW','첫 소리 만들기','활의 무게와 속도를 익혀 안정된 소리를 냅니다.'],['03 / READ','악보와 친해지기','리듬과 음정을 실제 연주 속에서 배웁니다.'],['FORMAT','주 1회 · 50분','악기가 없어도 상담 후 시작할 수 있습니다.']] },
  { label: 'PROGRAM 02 / INTERMEDIATE', title: '한 단계<br>깊어지는 연주', description: '정확하게 켜는 것을 넘어, 프레이징과 음색으로<br>나만의 해석을 만들어 가는 과정입니다.', image: 'assets/cello-carousel-detail.png', alt: '중급 첼로 활 연습 장면', meta: [['01 / LISTEN','현재 소리 진단','음정·리듬·보잉 습관을 함께 확인합니다.'],['02 / REFINE','소리 다듬기','활의 속도와 무게를 조절해 음색을 바꿉니다.'],['03 / EXPRESS','표현 설계하기','곡의 흐름을 나만의 언어로 만듭니다.'],['FORMAT','주 1–2회 · 60분','개인 레슨 노트와 연습 가이드를 제공합니다.']] },
  { label: 'PROGRAM 03 / PROJECT', title: '나만의<br>한 곡 완성', description: '좋아하는 곡을 골라 작은 목표를 세우고,<br>기록으로 남길 한 번의 연주를 완성합니다.', image: 'assets/cello-carousel-notes.png', alt: '첼로 연주곡을 완성하는 레슨 장면', meta: [['01 / CHOOSE','한 곡 선택하기','취향과 현재 수준에 맞는 곡을 고릅니다.'],['02 / PLAN','연습 설계하기','4–8주의 작은 목표로 곡을 나눕니다.'],['03 / RECORD','연주 기록하기','집중 코칭 뒤 나만의 연주를 녹음합니다.'],['FORMAT','4–8주 프로젝트','원포인트 또는 정규 과정으로 진행합니다.']] }
];

function createProgramCarousel() {
  const root = document.querySelector('[data-program-carousel]');
  const image = root.querySelector('[data-program-image]');
  const dots = [...root.querySelectorAll('[data-program-dot]')];
  const meta = document.querySelector('[data-program-meta]');
  let index = 0;
  let timer;
  function render() {
    const item = programs[index];
    image.classList.add('is-changing');
    window.setTimeout(() => { image.src = item.image; image.alt = item.alt; image.classList.remove('is-changing'); }, reducedMotion ? 0 : 180);
    root.querySelector('[data-program-label]').textContent = item.label;
    root.querySelector('[data-program-title]').innerHTML = lineMarkup(item.title);
    root.querySelector('[data-program-description]').innerHTML = item.description;
    dots.forEach((dot, i) => dot.setAttribute('aria-selected', String(i === index)));
    meta.innerHTML = item.meta.map(([label,title,description]) => `<article><small>${label}</small><h3>${title}</h3><p>${description}</p></article>`).join('');
  }
  function go(next, restartTimer = true) { const target = (next + programs.length) % programs.length; if (target === index) return; index = target; render(); if (restartTimer) restart(); }
  function restart() { window.clearInterval(timer); if (!reducedMotion) timer = window.setInterval(() => go(index + 1), PROGRAM_INTERVAL_MS); }
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
  root.querySelector('[data-program-next]').addEventListener('click', () => go(index + 1));
  root.addEventListener('mouseenter', () => window.clearInterval(timer));
  root.addEventListener('mouseleave', restart);
  render(); restart();
  return { go, pause: () => window.clearInterval(timer), resume: restart };
}

function createScrollMotion(programCarousel) {
  const heroTitle = document.querySelector('#hero-title');
  heroTitle.innerHTML = lineMarkup(heroTitle.innerHTML);

  const revealGroups = [
    ['.hero-copy .kicker, .hero-copy-bottom > p, .hero-copy-bottom .action-row', 'hero-reveal'],
    ['.program-copy > *, .about-copy > *, .visit-copy > *, .trial-heading > *, .trial-summary > *', 'scroll-reveal'],
    ['.program-meta article, .about-meta article, .visit-meta article, .form-grid label, .consent', 'scroll-reveal-item'],
    ['.about-image, .program-visual, .map-art', 'visual-reveal']
  ];
  revealGroups.forEach(([selector, className]) => document.querySelectorAll(selector).forEach((element, i) => {
    element.classList.add(className);
    element.style.setProperty('--reveal-order', String(i % 6));
  }));

  document.querySelectorAll('.about-copy h2, .visit-copy h2, .trial-heading h2').forEach((heading) => {
    heading.innerHTML = lineMarkup(heading.innerHTML);
  });

  requestAnimationFrame(() => document.querySelector('.hero-copy').classList.add('is-visible'));

  if (!reducedMotion) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .16, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.program-copy, .program-meta, .about-copy, .about-image, .about-meta, .visit-copy, .map-art, .visit-meta, .trial-form, .trial-summary').forEach((element) => observer.observe(element));
  } else {
    document.querySelectorAll('.hero-copy, .program-copy, .program-meta, .about-copy, .about-image, .about-meta, .visit-copy, .map-art, .visit-meta, .trial-form, .trial-summary').forEach((element) => element.classList.add('is-visible'));
  }

  const programSection = document.querySelector('.program-section');
  let lastProgramStep = -1;
  let ticking = false;
  function updateScrollMotion() {
    const viewport = window.innerHeight;
    const programRect = programSection.getBoundingClientRect();
    const progress = Math.max(0, Math.min(.999, (viewport * .58 - programRect.top) / Math.max(programRect.height - viewport * .42, 1)));
    const step = Math.min(programs.length - 1, Math.floor(progress * programs.length));
    if (programRect.top < viewport * .7 && programRect.bottom > viewport * .3 && step !== lastProgramStep) {
      lastProgramStep = step;
      programCarousel.go(step, false);
      programCarousel.pause();
    }
    if (programRect.bottom < 0 || programRect.top > viewport) programCarousel.resume();

    const heroProgress = Math.max(0, Math.min(1, window.scrollY / Math.max(viewport, 1)));
    document.documentElement.style.setProperty('--hero-scroll', heroProgress.toFixed(3));
    ticking = false;
  }
  if (!reducedMotion) window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateScrollMotion); }
  }, { passive: true });
  updateScrollMotion();
}

document.querySelector('[data-copy-address]').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText('서울시 ○○구 ○○로 00, 3층'); showToast('주소를 복사했습니다.'); }
  catch { showToast('주소 복사를 지원하지 않는 브라우저입니다.'); }
});

const form = document.querySelector('#consult-form');
const summary = document.querySelector('[data-summary]');
function updateSummary() {
  const name = form.elements.name.value || '이름 미입력';
  const level = form.elements.level.value;
  const time = form.elements['preferred-time'].value;
  summary.innerHTML = `${name} · ${level}<br>${time}`;
}
form.addEventListener('input', updateSummary);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const inquiry = `[온결 첼로 체험 레슨 문의]\n이름: ${form.elements.name.value}\n경험: ${form.elements.level.value}\n목표: ${form.elements.message.value || '별도 문의 없음'}\n희망 시간: ${form.elements['preferred-time'].value}`;
  try { await navigator.clipboard.writeText(inquiry); showToast('문의 내용을 복사했습니다. 카카오톡에서 붙여넣어 주세요.'); }
  catch { showToast('카카오톡에서 문의 내용을 직접 입력해 주세요.'); }
  window.setTimeout(openKakaoChannel, 350);
});

createHeroCarousel();
const programCarousel = createProgramCarousel();
createScrollMotion(programCarousel);
updateSummary();
