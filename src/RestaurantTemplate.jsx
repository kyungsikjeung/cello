import { useEffect, useMemo, useRef, useState } from "react";
import { hotspotStyle } from "./data/hotspot.js";

const asset = (value = "") =>
  /^(blob:|data:|https?:|\/)/.test(value) ? value : `/assets/${value}`;

const focusStyle = (item = {}) => ({
  "--focus-desktop": `${item.focusDesktop?.x ?? 50}% ${item.focusDesktop?.y ?? 50}%`,
  "--focus-mobile": `${item.focusMobile?.x ?? 50}% ${item.focusMobile?.y ?? 50}%`,
});

const list = (value) => (Array.isArray(value) ? value : []);
const lines = (value) => (Array.isArray(value) ? value : value ? [value] : []);
const modulo = (value, length) => (length ? ((value % length) + length) % length : 0);

function circularOffset(index, active, length) {
  if (!length) return 0;
  let offset = modulo(index - active, length);
  if (offset > length / 2) offset -= length;
  return offset;
}

function HeroMedia({ media = {} }) {
  if (!media.src) return <div className="restaurant-hero-media restaurant-media-placeholder" aria-hidden="true" />;

  if (media.kind === "video") {
    return (
      <video
        className="restaurant-hero-media"
        data-parallax
        data-parallax-strength="52"
        src={asset(media.src)}
        poster={asset(media.poster || media.mobileFallback)}
        style={focusStyle(media)}
        autoPlay={media.autoplay}
        muted
        loop={media.loop}
        playsInline
        aria-label={media.alt || "프랜차이즈 브랜드 영상"}
      />
    );
  }

  return (
    <img
      className="restaurant-hero-media"
      data-parallax
      data-parallax-strength="52"
      src={asset(media.src)}
      style={focusStyle(media)}
      alt={media.alt || "프랜차이즈 대표 공간"}
      fetchPriority="high"
    />
  );
}

function RestaurantHeader({ wordmark, statusLabel, todayHours, isFranchise }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState("restaurant-story");
  const navItems = isFranchise
    ? [["브랜드", "restaurant-story", "01"], ["운영 시스템", "restaurant-offerings", "02"], ["지점", "restaurant-locations", "03"], ["공간", "restaurant-gallery", "04"], ["가맹 문의", "restaurant-inquiry", "05"]]
    : [["브랜드", "restaurant-story", "01"], ["메뉴", "restaurant-offerings", "02"], ["공간 안내", "restaurant-locations", "03"], ["예약 문의", "restaurant-inquiry", "04"]];

  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && setMenuOpen(false);
    const sectionIds = isFranchise
      ? ["restaurant-story", "restaurant-offerings", "restaurant-locations", "restaurant-gallery", "restaurant-process", "restaurant-inquiry"]
      : ["restaurant-story", "restaurant-offerings", "restaurant-locations", "restaurant-inquiry"];
    let frame = 0;
    const updateNavigationState = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      const marker = window.innerHeight * .36;
      const visibleSection = sectionIds.find((id) => {
        const section = document.getElementById(id);
        if (!section) return false;
        const rect = section.getBoundingClientRect();
        return rect.top <= marker && rect.bottom > marker;
      }) || sectionIds[0];
      const next = visibleSection === "restaurant-process" ? "restaurant-inquiry" : visibleSection;
      setActiveId((current) => current === next ? current : next);
    };
    const requestNavigationUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateNavigationState);
    };
    updateNavigationState();
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", requestNavigationUpdate, { passive: true });
    window.addEventListener("resize", requestNavigationUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", requestNavigationUpdate);
      window.removeEventListener("resize", requestNavigationUpdate);
    };
  }, [isFranchise]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [menuOpen]);

  return (
    <header className={`restaurant-header ${menuOpen ? "is-menu-open" : ""} ${scrolled ? "is-scrolled" : ""}`}>
      <a className="restaurant-wordmark" href="#restaurant-home" onClick={() => setMenuOpen(false)}>
        {wordmark}
      </a>
      <nav className="restaurant-desktop-nav" aria-label={isFranchise ? "프랜차이즈 주요 메뉴" : "레스토랑 주요 메뉴"}>
        {navItems.map(([label, id, number]) => (
          <a key={id} className={activeId === id ? "is-active" : undefined} aria-current={activeId === id ? "location" : undefined} href={`#${id}`}><small>{number}</small>{label}</a>
        ))}
      </nav>
      <a className="restaurant-header-cta" href="#restaurant-inquiry">{isFranchise ? "가맹 상담" : "BOOK A TABLE"} <span>↗</span></a>
      <button
        className="restaurant-menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="restaurant-mobile-nav"
        aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span /><span />
      </button>
      <nav className="restaurant-mobile-nav" id="restaurant-mobile-nav" aria-label="모바일 메뉴">
        {navItems.map(([label, id, number]) => (
          <a key={id} className={activeId === id ? "is-active" : undefined} aria-current={activeId === id ? "location" : undefined} href={`#${id}`} onClick={() => setMenuOpen(false)}>
            <small>{number}</small><span>{label}</span><b>↗</b>
          </a>
        ))}
        <p><b>{statusLabel}</b><span>{todayHours}</span></p>
      </nav>
    </header>
  );
}

function OfferingIndex({ items, isFranchise }) {
  const [active, setActive] = useState(0);
  const activeItem = items[modulo(active, items.length)] || null;

  useEffect(() => {
    if (!items.length) return undefined;
    setActive((value) => modulo(value, items.length));
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || items.length < 2) return undefined;
    const timer = window.setInterval(() => setActive((value) => modulo(value + 1, items.length)), 3600);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!activeItem) {
    return <p className="restaurant-empty-state">{isFranchise ? "운영 기반" : "대표 메뉴"} 항목을 CMS에서 추가해 주세요.</p>;
  }

  return (
    <div className="restaurant-menu-layout">
      <figure className="restaurant-menu-feature" data-reveal>
        <img
          key={activeItem.image}
          data-parallax
          data-parallax-strength="22"
          src={asset(activeItem.image)}
          style={focusStyle(activeItem)}
          alt={activeItem.alt || activeItem.name || (isFranchise ? "운영 지원 이미지" : "대표 메뉴")}
        />
        <figcaption>
          <small>{String(modulo(active, items.length) + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</small>
          <span>{activeItem.description}</span>
        </figcaption>
      </figure>
      <div className="restaurant-menu-index" role="list" aria-label={isFranchise ? "운영 기반 목록" : "대표 메뉴 목록"}>
        {items.map((item, index) => {
          const selected = modulo(active, items.length) === index;
          return (
            <button
              key={`${item.name || item.label || "offering"}-${index}`}
              type="button"
              className={selected ? "is-active" : ""}
              aria-pressed={selected}
              onClick={() => setActive(index)}
              onMouseEnter={() => setActive(index)}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              <span>{item.name || item.label || `${isFranchise ? "SYSTEM" : "MENU"} ${index + 1}`}</span>
              <b>{item.badge || (Number.isFinite(item.price) ? `${new Intl.NumberFormat("ko-KR").format(item.price)}원` : "SIGNATURE")}</b>
              <i aria-hidden="true">↗</i>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HotspotScene({ scene = {}, items }) {
  const [active, setActive] = useState(null);
  const sceneImage = scene.image || items[0]?.image;
  const sceneAlt = scene.alt || items[0]?.alt || "프랜차이즈 매장 운영 구성";

  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && setActive(null);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    if (active !== null && active >= items.length) setActive(null);
  }, [active, items.length]);

  if (!items.length) {
    return <p className="restaurant-empty-state">운영 기반 항목을 CMS에서 추가해 주세요.</p>;
  }

  return (
    <div className="restaurant-hotspot-scene" data-reveal>
      <figure className="restaurant-hotspot-stage" style={focusStyle(scene)}>
        {sceneImage
          ? <img data-parallax data-parallax-strength="12" src={asset(sceneImage)} alt={sceneAlt} />
          : <div className="restaurant-media-placeholder" aria-label={sceneAlt} />}
        {items.map((item, index) => {
          const selected = active === index;
          const popupId = `restaurant-hotspot-popup-${index}`;
          return (
            <div
              className={`restaurant-hotspot ${selected ? "is-active" : ""}`}
              style={hotspotStyle(item, index, items.length)}
              key={`${item.name || "hotspot"}-${index}`}
            >
              <button
                className="restaurant-hotspot-trigger"
                type="button"
                aria-expanded={selected}
                aria-controls={popupId}
                aria-label={`${item.name} 설명 ${selected ? "닫기" : "열기"}`}
                onClick={() => setActive(selected ? null : index)}
              ><span aria-hidden="true">+</span></button>
              {selected && (
                <article className="restaurant-hotspot-popover" id={popupId} aria-live="polite">
                  <small>{String(index + 1).padStart(2, "0")} / {item.badge}</small>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <button type="button" onClick={() => setActive(null)} aria-label={`${item.name} 설명 닫기`}>×</button>
                </article>
              )}
            </div>
          );
        })}
        <figcaption><span>+</span><p><b>공간을 탐색하세요</b> 포인트를 누르면 운영 구성을 확인할 수 있습니다.</p></figcaption>
      </figure>
    </div>
  );
}

function CircularGallery({ items }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const activeIndex = modulo(active, count);

  useEffect(() => {
    setActive((value) => modulo(value, count));
    if (paused || count < 2) return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return undefined;
    const timer = window.setInterval(() => setActive((value) => modulo(value + 1, count)), 4400);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) {
    return <p className="restaurant-empty-state">매장 사진을 CMS에서 추가해 주세요.</p>;
  }

  const move = (delta) => setActive((value) => modulo(value + delta, count));

  return (
    <div
      className={`restaurant-orbit ${paused ? "is-paused" : ""}`}
      aria-roledescription="carousel"
      aria-label="매장 사진 순환 갤러리"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setPaused(false)}
    >
      <div className="restaurant-orbit-stage">
        {items.map((item, index) => {
          const offset = circularOffset(index, activeIndex, count);
          return (
            <figure
              key={`${item.image || "gallery"}-${index}`}
              className={`restaurant-orbit-card ${offset === 0 ? "is-active" : ""}`}
              style={{ "--orbit-offset": offset, "--orbit-distance": Math.abs(offset), ...focusStyle(item) }}
              aria-hidden={offset !== 0}
            >
              <img data-parallax data-parallax-strength="18" src={asset(item.image)} alt={offset === 0 ? (item.alt || "프랜차이즈 매장") : ""} loading={offset === 0 ? "eager" : "lazy"} />
              <figcaption><small>{String(index + 1).padStart(2, "0")}</small><span>{item.alt || "BRAND STORE"}</span></figcaption>
            </figure>
          );
        })}
      </div>
      <div className="restaurant-orbit-controls">
        <div aria-live={paused ? "polite" : "off"}><b>{String(activeIndex + 1).padStart(2, "0")}</b><span>/ {String(count).padStart(2, "0")}</span></div>
        <div className="restaurant-orbit-progress" aria-hidden="true"><i key={activeIndex} /></div>
        <button type="button" onClick={() => move(-1)} aria-label="이전 이미지">←</button>
        <button type="button" onClick={() => move(1)} aria-label="다음 이미지">→</button>
      </div>
    </div>
  );
}

export function RestaurantTemplate({ site = {}, preview = false }) {
  const rootRef = useRef(null);
  const [mobileCtaVisible, setMobileCtaVisible] = useState(false);
  const isFranchise = site.category === "franchise" || site.template === "franchise-brand-01";
  const hero = site.hero || {};
  const service = site.service || {};
  const franchise = site.franchise || {};
  const inquiry = site.inquiry || site.contact || {};
  const contentModel = isFranchise ? site.offerings : site.menu;
  const offeringItems = useMemo(() => list(contentModel?.items), [contentModel?.items]);
  const galleryItems = useMemo(() => list(site.gallery?.images), [site.gallery?.images]);
  const locationItems = useMemo(() => {
    if (isFranchise) return list(site.locations?.items);
    const cover = list(site.gallery?.images)[0] || {};
    return site.visit ? [{
      name: site.name || "레스토랑",
      status: service.statusLabel || "예약 가능",
      address: site.visit.address,
      hours: service.todayHours || site.visit.transit,
      image: cover.image,
      alt: cover.alt,
      focusDesktop: cover.focusDesktop,
      focusMobile: cover.focusMobile,
    }] : [];
  }, [isFranchise, service.statusLabel, service.todayHours, site.gallery?.images, site.locations?.items, site.name, site.visit]);
  const heroTitle = lines(hero.title);
  const heroDescription = lines(hero.description).join(" ");
  const inquiryTitle = lines(inquiry.title);
  const kakaoUrl = inquiry.kakaoUrl || "#restaurant-inquiry";

  useEffect(() => {
    if (preview) return;
    document.title = site.seo?.title || `${site.name || (isFranchise ? "Franchise" : "Restaurant")} | Official`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", site.seo?.description || heroDescription);
  }, [heroDescription, isFranchise, preview, site.name, site.seo?.description, site.seo?.title]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const targets = [...root.querySelectorAll("[data-reveal]")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.16, rootMargin: "0px 0px -8%" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [site]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const targets = [...root.querySelectorAll("[data-parallax]")];
    let frame = 0;
    const updateParallax = () => {
      frame = 0;
      const viewportCenter = window.innerHeight / 2;
      targets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
        const strength = Number(target.dataset.parallaxStrength || 24);
        const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - viewportCenter) / window.innerHeight));
        target.style.setProperty("--parallax-y", `${progress * -strength}px`);
      });
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateParallax);
    };
    updateParallax();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [site]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    const updateMobileCta = () => {
      frame = 0;
      if (window.innerWidth > 767) {
        setMobileCtaVisible(false);
        return;
      }
      const heroRect = root.querySelector("#restaurant-home")?.getBoundingClientRect();
      const inquiryRect = root.querySelector("#restaurant-inquiry")?.getBoundingClientRect();
      const interactiveSectionVisible = ["#restaurant-story", "#restaurant-offerings", "#restaurant-gallery"].some((selector) => {
        const rect = root.querySelector(selector)?.getBoundingClientRect();
        return Boolean(rect && rect.top < window.innerHeight * .85 && rect.bottom > window.innerHeight * .25);
      });
      const shouldShow = Boolean(heroRect && inquiryRect && heroRect.bottom < window.innerHeight * .38 && inquiryRect.top > window.innerHeight * .62 && !interactiveSectionVisible);
      setMobileCtaVisible((current) => current === shouldShow ? current : shouldShow);
    };
    const requestMobileCtaUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateMobileCta);
    };
    updateMobileCta();
    window.addEventListener("scroll", requestMobileCtaUpdate, { passive: true });
    window.addEventListener("resize", requestMobileCtaUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestMobileCtaUpdate);
      window.removeEventListener("resize", requestMobileCtaUpdate);
    };
  }, [site]);

  return (
    <div
      ref={rootRef}
      className={`restaurant-site ${isFranchise ? "is-franchise" : "is-restaurant"} ${preview ? "cms-preview-page" : ""}`}
      style={{
        "--restaurant-accent": site.theme?.primary || "#275dff",
        "--restaurant-paper": site.theme?.background || "#f5f3ed",
        "--restaurant-ink": site.theme?.text || "#111111",
      }}
    >
      <a className="skip-link" href="#restaurant-main">본문으로 이동</a>
      <RestaurantHeader wordmark={site.wordmark || site.name || "MORROW / TABLE"} statusLabel={service.statusLabel} todayHours={service.todayHours} isFranchise={isFranchise} />

      <main id="restaurant-main">
        <section className="restaurant-hero" id="restaurant-home">
          <HeroMedia media={hero.media} />
          <div className="restaurant-hero-shade" />
          <div className="restaurant-hero-copy">
            <p className="restaurant-eyebrow"><span>{hero.kicker || (isFranchise ? "SMALL STORE · SMART OPERATION" : "SEOUL · SEASONAL TABLE")}</span><b>SCROLL TO EXPLORE ↓</b></p>
            <h1>{heroTitle.map((line, index) => <span key={`${line}-${index}`} style={{ "--line-index": index }}>{line}</span>)}</h1>
            <div className="restaurant-hero-bottom">
              <p>{heroDescription}</p>
              <a href={kakaoUrl} target={kakaoUrl.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{hero.cta || "상담 문의"}<span>↗</span></a>
            </div>
          </div>
          <aside className="restaurant-service-rail">
            <span><small>STATUS</small><b>{service.statusLabel || "상담 접수 중"}</b></span>
            <span><small>HOURS</small><b>{service.todayHours || "10:00 — 18:00"}</b></span>
            <span><small>NOTE</small><b>{service.breakTime || "예약 우선"}</b></span>
          </aside>
        </section>

        {!isFranchise && (
          <div className="restaurant-marquee" aria-hidden="true">
            <div><span>SEASONAL FOOD</span><i>✦</i><span>INTIMATE TABLE</span><i>✦</i><span>STRONG BRAND</span><i>✦</i><span>SEOUL 2026</span><i>✦</i></div>
            <div><span>SEASONAL FOOD</span><i>✦</i><span>INTIMATE TABLE</span><i>✦</i><span>STRONG BRAND</span><i>✦</i><span>SEOUL 2026</span><i>✦</i></div>
          </div>
        )}

        <section className="restaurant-story" id="restaurant-story">
          <header className="restaurant-section-head" data-reveal>
            <p><small>01</small><span>WHY MORROW</span></p>
            <h2>{franchise.title || "작게 시작해, 단단하게 운영합니다."}</h2>
            <div><span>THE IDEA</span><p>{franchise.description || (isFranchise ? "작은 공간과 반복 가능한 운영을 함께 설계하는 프랜차이즈 브랜드입니다." : "제철의 감각과 조용한 환대를 함께 설계하는 작은 레스토랑입니다.")}</p></div>
          </header>
          <div className="restaurant-advantage-grid">
            {list(franchise.advantages).map((item, index) => (
              <article key={`${item.title}-${index}`} data-reveal>
                <small>{String(index + 1).padStart(2, "0")} / {item.metric}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <i aria-hidden="true">✦</i>
              </article>
            ))}
          </div>
        </section>

        <section className="restaurant-menu" id="restaurant-offerings">
          <header className="restaurant-section-head restaurant-section-head-light" data-reveal>
            <p><small>02</small><span>{isFranchise ? "OPERATION SYSTEM" : "SIGNATURE MENU"}</span></p>
            <h2>{contentModel?.title || (isFranchise ? "본사가 제공하는 운영 기반" : "오늘 가장 좋은 재료로 만듭니다.")}</h2>
            <div><span>{isFranchise ? "THE SYSTEM" : "THE MENU"}</span><p>{contentModel?.description}</p></div>
          </header>
          {isFranchise
            ? <HotspotScene scene={site.offerings?.scene} items={offeringItems} />
            : <OfferingIndex items={offeringItems} isFranchise={false} />}
        </section>

        <section className="restaurant-locations" id="restaurant-locations">
          <header className="restaurant-section-head" data-reveal>
            <p><small>03</small><span>{isFranchise ? "OUR LOCATIONS" : "VISIT THE ORIGINAL"}</span></p>
            <h2>{isFranchise ? (site.locations?.title || "가까운 지점을 확인하세요") : "브랜드를 먼저 경험하세요."}</h2>
            <div><span>{isFranchise ? "FIND A STORE" : "LOCATION"}</span><p>{isFranchise ? site.locations?.description : `${site.visit?.transit || ""} · ${site.visit?.parking || ""}`}</p></div>
          </header>
          <div className="restaurant-location-grid">
            {locationItems.map((location, index) => (
              <article key={`${location.name}-${index}`} data-reveal>
                <figure>
                  <img data-parallax data-parallax-strength="20" src={asset(location.image)} style={focusStyle(location)} alt={location.alt || `${location.name} 매장`} loading="lazy" />
                  <small>{location.status}</small>
                </figure>
                <div><span>{String(index + 1).padStart(2, "0")}</span><h3>{location.name}</h3><p>{location.address}</p><b>{location.hours}</b></div>
              </article>
            ))}
          </div>
        </section>

        <section className="restaurant-gallery" id="restaurant-gallery">
          <header className="restaurant-section-head" data-reveal>
            <p><small>04</small><span>{isFranchise ? "STORE & SCENE" : "SPACE & SCENE"}</span></p>
            <h2>{site.gallery?.title || "머무는 순간까지 브랜드가 됩니다."}</h2>
            <div><span>{isFranchise ? "STORE MOMENTS" : "SPACE MOMENTS"}</span><p>{isFranchise ? "고객이 방문 전 매장 분위기와 운영 형태를 사진으로 확인할 수 있습니다." : "공간의 빛과 테이블, 머무는 분위기를 사진으로 먼저 확인할 수 있습니다."}</p></div>
          </header>
          <CircularGallery items={galleryItems} />
        </section>

        <section className="restaurant-process" id="restaurant-process">
          <header data-reveal><small>{isFranchise ? "FRANCHISE / PROCESS" : "RESERVATION / PROCESS"}</small><h2>{isFranchise ? <>FROM HELLO<br />TO OPEN.</> : <>FROM BOOKING<br />TO TABLE.</>}</h2></header>
          <ol>
            {list(franchise.steps).map((step, index) => (
              <li key={`${step.title}-${index}`} data-reveal>
                <small>{String(index + 1).padStart(2, "0")}</small><h3>{step.title}</h3><p>{step.description}</p><i aria-hidden="true">→</i>
              </li>
            ))}
          </ol>
        </section>

        <section className="restaurant-inquiry" id="restaurant-inquiry">
          <div className="restaurant-inquiry-copy" data-reveal>
            <small>05 / {inquiry.label || "INQUIRY"}</small>
            <h2>{inquiryTitle.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</h2>
            <p>{inquiry.description}</p>
          </div>
          <div className="restaurant-inquiry-actions" data-reveal>
            <a className="restaurant-inquiry-primary" href={kakaoUrl} target={kakaoUrl.startsWith("http") ? "_blank" : undefined} rel="noreferrer"><span>{isFranchise ? "카카오톡으로 상담 시작" : "카카오톡으로 예약 문의"}</span><b>↗</b></a>
            {inquiry.phone && <a href={`tel:${inquiry.phone}`}><span>전화 상담</span><b>{inquiry.phone}</b></a>}
          </div>
        </section>
      </main>

      <footer className="restaurant-footer"><b>{site.wordmark || site.name}</b><span>{inquiry.phone && <>{inquiry.phone}<br /></>}© 2026 {site.name}</span><a href="#restaurant-home">BACK TO TOP ↑</a></footer>
      <a className={`restaurant-mobile-cta ${mobileCtaVisible ? "is-visible" : ""}`} href="#restaurant-inquiry" aria-hidden={!mobileCtaVisible} tabIndex={mobileCtaVisible ? undefined : -1}><span>{isFranchise ? "가맹 상담 시작하기" : "예약 문의하기"}</span><b>↗</b></a>
    </div>
  );
}
