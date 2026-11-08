(() => {
  "use strict";

  const allMedia = Array.isArray(window.BIRTHDAY_MEDIA) ? window.BIRTHDAY_MEDIA : [];
  const orbitTrack = document.querySelector("#orbitTrack");
  const mediaCounter = document.querySelector("#mediaCounter");
  const celebrateButton = document.querySelector("#celebrateButton");
  const confettiLayer = document.querySelector("#confettiLayer");
  const countdown = document.querySelector("#countdown");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const visibleCount = Math.min(14, allMedia.length);
  const cards = [];
  let offset = 0;
  let rotation = 0;
  let lastFrame = performance.now();
  let partyBoostUntil = 0;

  function createMediaElement(item) {
    const element = document.createElement(item.type === "video" ? "video" : "img");
    element.src = item.src;
    element.alt = "";
    element.draggable = false;

    if (item.type === "video") {
      element.autoplay = true;
      element.loop = true;
      element.muted = true;
      element.defaultMuted = true;
      element.playsInline = true;
      element.preload = "metadata";
      element.disablePictureInPicture = true;
      element.setAttribute("aria-hidden", "true");
      element.addEventListener("canplay", () => element.play().catch(() => {}), { once: true });
    } else {
      element.loading = "lazy";
      element.decoding = "async";
    }

    return element;
  }

  function setCardMedia(card, mediaIndex) {
    if (!allMedia.length) return;
    const safeIndex = ((mediaIndex % allMedia.length) + allMedia.length) % allMedia.length;
    if (card.dataset.mediaIndex === String(safeIndex)) return;

    const item = allMedia[safeIndex];
    const nextElement = createMediaElement(item);
    card.replaceChildren(nextElement);
    card.dataset.mediaIndex = String(safeIndex);
    card.dataset.kind = item.type;
  }

  function buildOrbit() {
    if (!allMedia.length) {
      mediaCounter.textContent = "Ajoute tes souvenirs dans /media";
      return;
    }

    for (let index = 0; index < visibleCount; index += 1) {
      const card = document.createElement("figure");
      card.className = "media-card";
      card.style.margin = "0";
      setCardMedia(card, index);
      orbitTrack.append(card);
      cards.push(card);
    }

    mediaCounter.textContent = `${allMedia.length} SOUVENIRS · EN BOUCLE`;
  }

  function layoutOrbit(now) {
    const elapsed = Math.min(48, now - lastFrame);
    lastFrame = now;
    const speed = now < partyBoostUntil ? 0.00012 : 0.000035;
    rotation += elapsed * (reduceMotion ? speed * 0.15 : speed);

    const width = orbitTrack.clientWidth;
    const height = orbitTrack.clientHeight;
    const radiusX = width * 0.48;
    const radiusY = height * 0.46;

    cards.forEach((card, index) => {
      const angle = rotation + (index / visibleCount) * Math.PI * 2;
      const sine = Math.sin(angle);
      const cosine = Math.cos(angle);
      const x = cosine * radiusX;
      const y = sine * radiusY;
      const depth = (sine + 1) / 2;
      const scale = 0.56 + depth * 0.66;
      const tilt = cosine * -7;

      card.style.zIndex = String(Math.round(depth * 100));
      card.style.opacity = String(0.34 + depth * 0.66);
      card.style.filter = `saturate(${0.7 + depth * 0.45}) brightness(${0.54 + depth * 0.56})`;
      card.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale}) rotate(${tilt}deg)`;
    });

    requestAnimationFrame(layoutOrbit);
  }

  function advanceCollection() {
    if (allMedia.length <= visibleCount) return;
    offset = (offset + visibleCount) % allMedia.length;
    cards.forEach((card, index) => setCardMedia(card, offset + index));
  }

  function updateCountdown() {
    const target = new Date("2026-11-14T00:00:00+01:00");
    const now = new Date();
    const distance = target.getTime() - now.getTime();

    if (distance <= 0) {
      countdown.textContent = "Ce disque est à toi, aujourd’hui et pour toujours ♡";
      return;
    }

    const days = Math.floor(distance / 86_400_000);
    const hours = Math.floor((distance % 86_400_000) / 3_600_000);
    const minutes = Math.floor((distance % 3_600_000) / 60_000);
    countdown.textContent = `Encore ${days} j · ${hours} h · ${minutes} min avant tes 21 ans`;
  }

  function celebrate() {
    partyBoostUntil = performance.now() + 4500;
    const symbols = ["♥", "✦", "●", "♡"];
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 44; index += 1) {
      const particle = document.createElement("span");
      particle.className = "confetti";
      particle.textContent = symbols[index % symbols.length];
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.setProperty("--size", `${9 + Math.random() * 14}px`);
      particle.style.setProperty("--duration", `${2.7 + Math.random() * 2.2}s`);
      particle.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
      particle.style.setProperty("--rotation", `${-260 + Math.random() * 720}deg`);
      particle.style.animationDelay = `${Math.random() * 0.65}s`;
      fragment.append(particle);
      setTimeout(() => particle.remove(), 5600);
    }

    confettiLayer.append(fragment);
  }

  buildOrbit();
  updateCountdown();
  requestAnimationFrame(layoutOrbit);
  window.setInterval(advanceCollection, reduceMotion ? 15_000 : 8_000);
  window.setInterval(updateCountdown, 30_000);
  celebrateButton.addEventListener("click", celebrate);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      document.querySelectorAll("video").forEach((video) => video.play().catch(() => {}));
    }
  });
})();
