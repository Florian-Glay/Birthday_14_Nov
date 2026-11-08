(() => {
  "use strict";

  const allMedia = Array.isArray(window.BIRTHDAY_MEDIA) ? window.BIRTHDAY_MEDIA : [];
  const orbitScene = document.querySelector("#orbitScene");
  const orbitTrack = document.querySelector("#orbitTrack");
  const confettiCanvas = document.querySelector("#confettiCanvas");
  const confettiContext = confettiCanvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const visibleCount = Math.min(30, allMedia.length);
  const depthSpacingBias = 0.9;
  const cards = [];
  let offset = 0;
  let rotation = 0;
  let lastFrame = performance.now();
  let isDraggingOrbit = false;
  let activePointerId = null;
  let lastPointerX = 0;
  let celebrationStarted = false;
  let canvasWidth = 0;
  let canvasHeight = 0;
  const particles = [];
  const celebrationColors = ["#ff6fac", "#ffd3e5", "#ff1f7a", "#fff8f2"];
  const celebrationSymbols = ["♥", "✦", "●", "♡"];

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
    for (let index = 0; index < visibleCount; index += 1) {
      const card = document.createElement("figure");
      card.className = "media-card";
      card.style.margin = "0";
      setCardMedia(card, index);
      orbitTrack.append(card);
      cards.push(card);
    }
  }

  function layoutOrbit(now) {
    const elapsed = Math.min(48, now - lastFrame);
    lastFrame = now;
    const speed = 0.00005;
    if (!isDraggingOrbit) {
      rotation -= elapsed * (reduceMotion ? speed * 0.15 : speed);
    }

    const width = orbitTrack.clientWidth;
    const height = orbitTrack.clientHeight;
    const radiusX = width * 0.48;
    const radiusY = height * 0.46;

    cards.forEach((card, index) => {
      const uniformAngle = rotation + (index / visibleCount) * Math.PI * 2;
      const angle = uniformAngle - depthSpacingBias * Math.cos(uniformAngle);
      const sine = Math.sin(angle);
      const cosine = Math.cos(angle);
      const x = cosine * radiusX;
      const y = sine * radiusY;
      const depth = (sine + 1) / 2;
      const scale = 0.3 + depth * 1.2;
      const tilt = cosine * -7;

      card.style.zIndex = String(Math.round(depth * 100));
      card.style.opacity = String(0.54 + depth * 0.46);
      card.style.filter = `saturate(${0.7 + depth * 0.45}) brightness(${0.54 + depth * 0.56})`;
      card.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale}) rotate(${tilt}deg)`;
    });

    drawCelebration(elapsed, now);
    requestAnimationFrame(layoutOrbit);
  }

  function advanceCollection() {
    if (isDraggingOrbit || allMedia.length <= visibleCount) return;
    offset = (offset + visibleCount) % allMedia.length;
    cards.forEach((card, index) => setCardMedia(card, offset + index));
  }

  function beginOrbitDrag(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    isDraggingOrbit = true;
    activePointerId = event.pointerId;
    lastPointerX = event.clientX;
    orbitScene.classList.add("is-dragging");
    orbitScene.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveOrbit(event) {
    if (!isDraggingOrbit || event.pointerId !== activePointerId) return;

    const horizontalMovement = event.clientX - lastPointerX;
    lastPointerX = event.clientX;
    rotation -= horizontalMovement * 0.006;
    event.preventDefault();
  }

  function endOrbitDrag(event) {
    if (!isDraggingOrbit || event.pointerId !== activePointerId) return;

    isDraggingOrbit = false;
    activePointerId = null;
    orbitScene.classList.remove("is-dragging");
    if (orbitScene.hasPointerCapture(event.pointerId)) {
      orbitScene.releasePointerCapture(event.pointerId);
    }
  }

  function resetParticle(particle, fillScreen = false) {
    particle.x = Math.random() * canvasWidth;
    particle.y = fillScreen ? Math.random() * canvasHeight : -30 - Math.random() * 100;
    particle.size = 7 + Math.random() * 12;
    particle.speed = 18 + Math.random() * 28;
    particle.drift = -10 + Math.random() * 20;
    particle.rotation = Math.random() * Math.PI * 2;
    particle.spin = -0.8 + Math.random() * 1.6;
    particle.phase = Math.random() * Math.PI * 2;
    particle.opacity = 0.2 + Math.random() * 0.36;
    particle.symbol = celebrationSymbols[Math.floor(Math.random() * celebrationSymbols.length)];
    particle.color = celebrationColors[Math.floor(Math.random() * celebrationColors.length)];
  }

  function resizeCelebration() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    confettiCanvas.width = Math.round(canvasWidth * pixelRatio);
    confettiCanvas.height = Math.round(canvasHeight * pixelRatio);
    confettiContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const targetCount = reduceMotion ? 30 : canvasWidth < 720 ? 35 : 60;
    while (particles.length < targetCount) {
      const particle = {};
      resetParticle(particle, true);
      particles.push(particle);
    }
    particles.length = targetCount;
  }

  function drawCelebration(elapsed, now) {
    if (!celebrationStarted || document.hidden) return;
    const delta = elapsed / 1000;
    const boost = 1.75;
    const motion = reduceMotion ? 0.22 : 1;

    confettiContext.clearRect(0, 0, canvasWidth, canvasHeight);
    confettiContext.textAlign = "center";
    confettiContext.textBaseline = "middle";

    particles.forEach((particle) => {
      particle.y += particle.speed * delta * boost * motion;
      particle.x += (particle.drift + Math.sin(now * 0.001 + particle.phase) * 8) * delta * motion;
      particle.rotation += particle.spin * delta * motion;

      if (particle.y > canvasHeight + 30 || particle.x < -50 || particle.x > canvasWidth + 50) {
        resetParticle(particle);
      }

      confettiContext.save();
      confettiContext.translate(particle.x, particle.y);
      confettiContext.rotate(particle.rotation);
      confettiContext.globalAlpha = Math.min(0.72, particle.opacity * boost);
      confettiContext.fillStyle = particle.color;
      confettiContext.font = `700 ${particle.size}px Georgia, serif`;
      confettiContext.fillText(particle.symbol, 0, 0);
      confettiContext.restore();
    });
  }

  function celebrate({ boost = false } = {}) {
    if (!celebrationStarted) {
      celebrationStarted = true;
      resizeCelebration();
    }
  }

  buildOrbit();
  celebrate();
  requestAnimationFrame(layoutOrbit);
  //window.setInterval(advanceCollection, reduceMotion ? 15_000 : 8_000);
  window.addEventListener("resize", resizeCelebration, { passive: true });
  orbitScene.addEventListener("pointerdown", beginOrbitDrag);
  orbitScene.addEventListener("pointermove", moveOrbit);
  orbitScene.addEventListener("pointerup", endOrbitDrag);
  orbitScene.addEventListener("pointercancel", endOrbitDrag);
  orbitScene.addEventListener("lostpointercapture", endOrbitDrag);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      document.querySelectorAll("video").forEach((video) => video.play().catch(() => {}));
    }
  });
})();
