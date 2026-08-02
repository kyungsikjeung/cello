import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { defaultSite } from "./data/default-site.js";
import { publicTemplateLinks, resolveTemplateRequest } from "./data/template-registry.js";
import { RestaurantTemplate } from "./RestaurantTemplate.jsx";

const asset = (name) =>
  /^(blob:|data:|https?:|\/)/.test(name) ? name : `/assets/${name}`;
const focusStyle = (item) => ({
  "--focus-desktop": `${item.focusDesktop?.x ?? 50}% ${item.focusDesktop?.y ?? 50}%`,
  "--focus-mobile": `${item.focusMobile?.x ?? 50}% ${item.focusMobile?.y ?? 50}%`,
});
function Lines({ children }) {
  return children.map((line, i) => (
    <span className="motion-line" key={`${line}-${i}`}>
      <span style={{ transitionDelay: `${i * 0.08}s` }}>{line}</span>
    </span>
  ));
}

function Header({ site }) {
  const [open, setOpen] = useState(false);
  const nav = [
    ["PROGRAM", "program"],
    ["ABOUT", "about"],
    ["VISIT", "visit"],
    ["BOOK A TRIAL", "trial"],
  ];
  return (
    <header className="site-header">
      <a className="wordmark" href="#home">
        {site.wordmark}
      </a>
      <nav className="desktop-nav">
        {nav.map(([label, id], i) => (
          <a key={id} className={i === 3 ? "nav-accent" : ""} href={`#${id}`}>
            {label}
            {i === 3 ? " ↗" : ""}
          </a>
        ))}
      </nav>
      <button
        className="menu-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span />
        <span />
        <span />
        <b className="sr-only">메뉴 열기</b>
      </button>
      <nav
        className="mobile-nav"
        style={{ transform: open ? "none" : undefined }}
      >
        {nav.map(([label, id], i) => (
          <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
            {label}
            <span>0{i + 1}</span>
          </a>
        ))}
      </nav>
    </header>
  );
}

function Hero({ hero }) {
  const slides = hero.slides,
    size = slides.length,
    queue = [...slides, ...slides, ...slides];
  const [cursor, setCursor] = useState(size + 1),
    [animated, setAnimated] = useState(true),
    [ready, setReady] = useState(false);
  const rootRef = useRef(null),
    trackRef = useRef(null),
    dragStart = useRef(0);
  const index = ((cursor % size) + size) % size;
  const positionTrack = () => {
    const root = rootRef.current,
      track = trackRef.current,
      card = track?.querySelector(".hero-slide");
    if (!root || !track || !card) return;
    const gap = parseFloat(getComputedStyle(track).gap) || 14;
    const width = card.getBoundingClientRect().width;
    track.style.transform = `translate3d(${root.clientWidth / 2 - (cursor * (width + gap) + width / 2)}px,0,0)`;
  };
  useLayoutEffect(positionTrack, [cursor, size]);
  useEffect(() => {
    const resize = () => positionTrack();
    addEventListener("resize", resize);
    return () => removeEventListener("resize", resize);
  }, [cursor]);
  useEffect(() => {
    const id = setInterval(() => setCursor((v) => v + 1), hero.autoplayMs);
    return () => clearInterval(id);
  }, [hero.autoplayMs]);
  useEffect(() => {
    let frame = 0;
    const reveal = requestAnimationFrame(() =>
      requestAnimationFrame(() => setReady(true)),
    );
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const update = () => {
      const p = clamp(scrollY / Math.max(innerHeight, 1)),
        root = document.documentElement;
      root.style.setProperty("--hero-scroll", p);
      root.style.setProperty("--title-exit", clamp((p - 0.15) / 0.7));
      root.style.setProperty("--copy-exit", clamp((p - 0.4) / 0.25));
      root.style.setProperty("--image-focus", clamp((p - 0.4) / 0.45));
      root.style.setProperty("--hero-handoff", clamp((p - 0.85) / 0.15));
      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(reveal);
      if (frame) cancelAnimationFrame(frame);
      removeEventListener("scroll", onScroll);
    };
  }, []);
  const settle = () => {
    let reset = null;
    if (cursor >= size * 2) reset = cursor - size;
    if (cursor < size) reset = cursor + size;
    if (reset !== null) {
      setAnimated(false);
      setCursor(reset);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimated(true)),
      );
    }
  };
  useEffect(() => {
    if (cursor < size || cursor >= size * 2) {
      const id = setTimeout(settle, animated ? 920 : 0);
      return () => clearTimeout(id);
    }
  }, [cursor, animated, size]);
  const move = (direction) => setCursor((v) => v + direction);
  return (
    <section className="hero" id="home">
      <div className={`hero-copy ${ready ? "is-visible" : ""}`}>
        <p className="kicker hero-reveal">{hero.kicker}</p>
        <h1>
          <Lines>{hero.title}</Lines>
        </h1>
        <div className="hero-copy-bottom">
          <p className="hero-reveal">
            {hero.description.map((line, i) => (
              <span key={i}>
                {line}
                {i < hero.description.length - 1 && <br />}
              </span>
            ))}
          </p>
          <div className="action-row hero-reveal">
            <a className="button primary" href="#trial">
              {hero.cta}
            </a>
            <span>DRAG TO EXPLORE →</span>
          </div>
        </div>
      </div>
      <div
        className={`hero-carousel carousel center-loop ${ready ? "is-intro-visible" : ""}`}
        ref={rootRef}
        onPointerDown={(e) => {
          dragStart.current = e.clientX;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          const d = e.clientX - dragStart.current;
          if (Math.abs(d) > 45) move(d < 0 ? 1 : -1);
        }}
      >
        <div
          ref={trackRef}
          className={`hero-track carousel-track ${animated ? "is-animated" : "is-resetting"}`}
          onTransitionEnd={settle}
        >
          {queue.map((slide, i) => {
            const active = i === cursor;
            return (
              <figure
                key={`${slide.caption}-${i}`}
                className={`hero-slide carousel-slide ${active ? "is-active" : ""}`}
                aria-hidden={!active}
              >
                <img
                  src={asset(slide.image)}
                  style={focusStyle(slide)}
                  alt={active ? slide.alt : ""}
                />
                <figcaption>
                  <small>{slide.label}</small>
                  <strong>{slide.caption}</strong>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
      <div className="hero-controls">
        <div className="counter">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div className="progress">
            <i style={{ width: `${((index + 1) / size) * 100}%` }} />
          </div>
          <span>{String(size).padStart(2, "0")}</span>
        </div>
        <span className="control-hint">CENTERED INFINITE LOOP</span>
        <div className="arrow-group">
          <button onClick={() => move(-1)}>←</button>
          <button onClick={() => move(1)}>→</button>
        </div>
        <p>
          <small>다음 장면</small>
          <strong>{slides[(index + 1) % size].caption}</strong>
        </p>
      </div>
    </section>
  );
}

function Program({ programs }) {
  const [index, setIndex] = useState(0),
    ref = useRef(null),
    item = programs[index] || programs[0];
  useEffect(() => {
    if (index >= programs.length) setIndex(0);
  }, [programs.length, index]);
  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      if (r.top < innerHeight * 0.75 && r.bottom > innerHeight * 0.2) {
        const p = Math.max(
          0,
          Math.min(0.999, (innerHeight * 0.65 - r.top) / Math.max(r.height, 1)),
        );
        setIndex(
          Math.min(programs.length - 1, Math.floor(p * programs.length)),
        );
      }
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [programs.length]);
  return (
    <section className="program-section" id="program" ref={ref}>
      <div className="program-stage">
        <div className="program-copy is-visible">
          <p className="kicker scroll-reveal">{item.label}</p>
          <h2 className="scroll-reveal">
            <Lines>{item.title}</Lines>
          </h2>
          <p className="program-description scroll-reveal">
            {item.description}
          </p>
          <div className="program-dots scroll-reveal">
            {programs.map((p, i) => (
              <button
                key={i}
                aria-selected={i === index}
                onClick={() => setIndex(i)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="program-actions scroll-reveal">
            <a className="button primary" href="#trial">
              이 과정 체험하기 ↗
            </a>
            <button
              className="text-button"
              onClick={() => setIndex((index + 1) % programs.length)}
            >
              다음 과정 보기 →
            </button>
          </div>
        </div>
        <div className="program-visual visual-reveal is-visible">
          <img
            src={asset(item.image)}
            style={focusStyle(item)}
            alt={`${item.title.join(" ")} 레슨 장면`}
          />
        </div>
      </div>
      <div className="program-meta is-visible">
        {item.meta.map((m, i) => (
          <article className="scroll-reveal-item" key={i}>
            <small>{m[0]}</small>
            <h3>{m[1]}</h3>
            <p>{m[2]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const cards = {
  about: [
    ["EDUCATION", "전문적인 음악 교육", "첼로 전공과 전문 연주 교육"],
    ["EXPERIENCE", "10년의 개인 지도", "입문부터 전공 준비까지"],
    ["METHOD", "기록으로 보이는 성장", "레슨 노트와 녹음으로 확인"],
  ],
  visit: [
    ["WEEKDAY", "11:00 — 21:00", "월요일부터 금요일"],
    ["SATURDAY", "10:00 — 18:00", "일요일·공휴일 휴무"],
    ["TRANSIT", "○○역 도보 5분", "버스 정류장 도보 2분"],
    ["PARKING", "예약 시 안내", "인근 유료주차장 이용"],
  ],
};
function InfoCards({ type }) {
  return (
    <div className={`${type}-meta is-visible`}>
      {cards[type].map((x) => (
        <article className="scroll-reveal-item" key={x[0]}>
          <small>{x[0]}</small>
          <h3>{x[1]}</h3>
          <p>{x[2]}</p>
        </article>
      ))}
    </div>
  );
}

function LessonTemplate({ site = defaultSite, preview = false }) {
  const [summary, setSummary] = useState(
    "입력한 상담 내용이 여기에 표시됩니다.",
  );
  useEffect(() => {
    document.title = site.seo.title;
    document.documentElement.style.setProperty("--blue", site.theme.primary);
  }, [site.seo.title, site.theme.primary]);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }),
      { threshold: 0.15 },
    );
    document
      .querySelectorAll(
        ".about-image,.about-copy,.map-art,.visit-copy,.trial-form,.trial-summary",
      )
      .forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [site.id]);
  return (
    <div className={preview ? "cms-preview-page" : ""}>
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      <Header site={site} />
      <main id="main">
        <Hero hero={site.hero} />
        <Program programs={site.programs} />
        <section className="about-section" id="about">
          <div className="about-image visual-reveal">
            <img
              src={asset(site.teacher.image)}
              style={focusStyle(site.teacher)}
              alt={`${site.teacher.name}의 첼로 레슨`}
            />
          </div>
          <div className="about-copy">
            <p className="kicker scroll-reveal">{site.teacher.kicker}</p>
            <h2 className="scroll-reveal">
              <Lines>{site.teacher.title}</Lines>
            </h2>
            <p className="scroll-reveal">
              {site.teacher.description.map((x, i) => (
                <span key={i}>
                  {x}
                  {i === 0 && <br />}
                </span>
              ))}
            </p>
            <div className="teacher-line scroll-reveal">
              <span>
                <b>{site.teacher.name}</b>
                <small>{site.teacher.role}</small>
              </span>
              <a href="#trial">선생님과 상담하기 ↗</a>
            </div>
          </div>
          <InfoCards type="about" />
        </section>
        <section className="visit-section" id="visit">
          <div className="map-art visual-reveal">
            <i />
            <i />
            <i />
            <div>
              <b>{site.wordmark.split("/")[0]}</b>
              <small>STUDIO</small>
            </div>
            <span>MAP PREVIEW · {site.visit.transit}</span>
          </div>
          <div className="visit-copy">
            <p className="kicker scroll-reveal">{site.visit.kicker}</p>
            <h2 className="scroll-reveal">
              <Lines>{site.visit.title}</Lines>
            </h2>
            <p className="scroll-reveal">
              {site.visit.address}
              <br />
              {site.visit.transit}
            </p>
            <div className="action-row scroll-reveal">
              <a className="button primary" href="https://map.kakao.com">
                카카오맵 길찾기 ↗
              </a>
            </div>
          </div>
          <InfoCards type="visit" />
        </section>
        <section className="trial-section" id="trial">
          <form
            className="trial-form"
            onInput={(e) => {
              const f = new FormData(e.currentTarget);
              setSummary(
                `${f.get("name") || "이름 미입력"} · ${f.get("level") || "처음이에요"}`,
              );
            }}
          >
            <div className="trial-heading">
              <p className="kicker">TRIAL LESSON / 01</p>
              <h2>
                <Lines>{site.contact.title}</Lines>
              </h2>
            </div>
            <div className="form-grid">
              <label>
                <span>NAME</span>
                <input name="name" placeholder="이름을 입력하세요" />
              </label>
              <label>
                <span>EXPERIENCE</span>
                <select name="level">
                  <option>처음이에요</option>
                  <option>배운 적 있어요</option>
                </select>
              </label>
              <label className="wide">
                <span>GOAL</span>
                <input
                  name="message"
                  placeholder="배우고 싶은 이유를 알려주세요"
                />
              </label>
            </div>
          </form>
          <aside className="trial-summary">
            <div>
              <p className="kicker">YOUR INQUIRY</p>
              <h3>
                작성한 내용을 복사해
                <br />
                카카오톡으로 상담합니다.
              </h3>
            </div>
            <div>
              <div className="summary-box">
                <small>SUMMARY</small>
                <p>{summary}</p>
              </div>
              <button className="button primary full">
                카카오톡 상담 준비 ↗
              </button>
            </div>
          </aside>
        </section>
      </main>
      <footer>
        <a className="wordmark" href="#home">
          {site.wordmark}
        </a>
        <p>
          {site.contact.phone}
          <br />© 2026 {site.name}.
        </p>
      </footer>
    </div>
  );
}

export function LandingTemplate({ site = defaultSite, preview = false, category }) {
  const rendererCategory = category || site?.category;
  const isBusinessTemplate =
    rendererCategory === "restaurant" ||
    rendererCategory === "franchise" ||
    site?.template?.startsWith("restaurant-") ||
    site?.template === "franchise-brand-01" ||
    Boolean(site?.gallery?.images && site?.inquiry && (site?.menu?.items || site?.offerings?.items));

  if (isBusinessTemplate) {
    return <RestaurantTemplate site={site} preview={preview} />;
  }

  const isLessonTemplate =
    rendererCategory === "lesson" ||
    site?.template === "editorial-02b" ||
    Boolean(site?.programs && site?.teacher && site?.contact);

  if (isLessonTemplate) return <LessonTemplate site={site} preview={preview} />;
  return <TemplateDataError preview={preview} />;
}

function TemplateDataError({ preview }) {
  return (
    <main className={`template-not-found ${preview ? "cms-preview-page" : ""}`}>
      <p>TEMPLATE / DATA MISMATCH</p>
      <h1>템플릿 데이터를<br />불러오지 못했습니다.</h1>
      <span>카테고리와 섹션 데이터가 일치하지 않습니다. CMS에서 기본값을 복원하거나 페이지를 새로고침해 주세요.</span>
    </main>
  );
}

function TemplateNotFound({ requested }) {
  return (
    <main className="template-not-found">
      <p>TEMPLATE / NOT FOUND</p>
      <h1>요청한 템플릿을<br />찾을 수 없습니다.</h1>
      <span>`{requested}` 주소를 확인하거나 아래 템플릿을 선택해 주세요.</span>
      <nav aria-label="사용 가능한 템플릿">
        {publicTemplateLinks.map((template) => (
          <a key={template.id} href={template.href}>
            {{ lesson: "레슨", restaurant: "레스토랑", franchise: "프랜차이즈" }[template.category] || template.category}
            <small>{template.id}</small>
          </a>
        ))}
      </nav>
    </main>
  );
}

export default function App() {
  const resolved = resolveTemplateRequest(window.location.search);
  if (!resolved.site) return <TemplateNotFound requested={resolved.requested} />;
  return <LandingTemplate site={resolved.site} category={resolved.entry.category} />;
}
