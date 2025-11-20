/* === Script pour canvas - cadre agrandissable & image bien positionnée === */

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const input = document.getElementById("photoInput");
const downloadBtn = document.getElementById("downloadBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const resetBtn = document.getElementById("resetBtn");

// Dimensions de référence (utilisées pour le redimensionnement responsive)
const ORIGINAL_WIDTH = 499;
const ORIGINAL_HEIGHT = 605;

// Radius des coins arrondis (en unités de référence) - MODIFIEZ CETTE VALEUR
const BORDER_RADIUS = 20;

// Cadre modifiable (unités "référence" ; on utilisera scaleRatio pour le canvas réel)
let rect = {
  x: 155, // légèrement plus à gauche
  y: 247, // remonté pour centrer verticalement
  width: 170, // augmenté (au lieu de 160)
  height: 207, // augmenté (au lieu de 170)
};
// état
let isDragging = false;
let imgOffsetX = 0; // en pixels canvas
let imgOffsetY = 0; // en pixels canvas
let imgScale = 1.0; // échelle effective en pixels canvas (userImage.width * imgScale = largeur affichée)
let userImage = null;
let lastMouseX = 0;
let lastMouseY = 0;
let scaleRatio = 1; // ratio canvasWidth / ORIGINAL_WIDTH

// background
const background = new Image();
background.src = "cameb.png";
background.onload = () => resizeCanvas();

// --- Resize canvas responsive ---
function resizeCanvas() {
  const container = document.querySelector(".canvas-wrapper") || document.body;
  const containerWidth = container.clientWidth || ORIGINAL_WIDTH;
  const aspectRatio = ORIGINAL_HEIGHT / ORIGINAL_WIDTH;
  const newHeight = containerWidth * aspectRatio;

  canvas.width = containerWidth;
  canvas.height = newHeight;

  scaleRatio = containerWidth / ORIGINAL_WIDTH;

  if (background.complete) {
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  }
  if (userImage) {
    // si l'image est déjà chargée, recalcule imgScale pour s'assurer qu'elle couvre le cadre
    // (on ne modifie pas imgOffsetX/Y pour garder la position actuelle)
    drawCanvas();
  }
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// --- Import image utilisateur ---
input.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    userImage = new Image();
    userImage.onload = () => {
      // Calculer l'échelle initiale pour que l'image couvre le cadre (en pixels canvas)
      const rectWidthCanvas = rect.width * scaleRatio;
      const rectHeightCanvas = rect.height * scaleRatio;
      const scaleToCover = Math.max(
        rectWidthCanvas / userImage.width,
        rectHeightCanvas / userImage.height
      );
      imgScale = scaleToCover; // imgScale exprime maintenant l'échelle en pixels-canvas / image-native
      imgOffsetX = 0;
      imgOffsetY = 0;
      drawCanvas();
    };
    userImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// --- Dessin principal ---
function drawCanvas() {
  // fond
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (background.complete) {
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  }

  if (!userImage) return;

  // cadre en pixels canvas
  const rectX = rect.x * scaleRatio;
  const rectY = rect.y * scaleRatio;
  const rectW = rect.width * scaleRatio;
  const rectH = rect.height * scaleRatio;
  const radius = BORDER_RADIUS * scaleRatio;

  // dimensions de l'image affichée (en pixels canvas)
  const drawW = Math.max(1, userImage.width * imgScale);
  const drawH = Math.max(1, userImage.height * imgScale);

  // Limites d'offset : empêcher que l'image sorte du rectangle (on autorise de "déplacer" l'image à l'intérieur)
  const maxOffsetX = Math.max(0, (drawW - rectW) / 2);
  const maxOffsetY = Math.max(0, (drawH - rectH) / 2);
  // clamp offsets
  imgOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, imgOffsetX));
  imgOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, imgOffsetY));

  // centre du rectangle (en pixels canvas)
  const centerX = rectX + rectW / 2;
  const centerY = rectY + rectH / 2;

  // position de dessin (coin supérieur gauche) : centrer l'image et appliquer offset
  const drawX = centerX - drawW / 2 + imgOffsetX;
  const drawY = centerY - drawH / 2 + imgOffsetY;

  // clip au rectangle avec coins arrondis
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(rectX, rectY, rectW, rectH, radius);
  ctx.closePath();
  ctx.clip();

  // qualité
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // dessiner l'image
  ctx.drawImage(userImage, drawX, drawY, drawW, drawH);

  ctx.restore();

  // contour du cadre avec coins arrondis
  ctx.beginPath();
  ctx.roundRect(rectX, rectY, rectW, rectH, radius);
  ctx.lineWidth = 2 * Math.max(1, scaleRatio);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.stroke();
}

// --- utilitaires coordonnées souris / tactile ---
function getCanvasCoordinates(event) {
  const r = canvas.getBoundingClientRect();
  let clientX, clientY;
  if (event.type.startsWith("mouse")) {
    clientX = event.clientX;
    clientY = event.clientY;
  } else if (event.type.startsWith("touch")) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  }
  return { x: clientX - r.left, y: clientY - r.top };
}

function isPointInRect(x, y, rectX, rectY, w, h) {
  return x >= rectX && x <= rectX + w && y >= rectY && y <= rectY + h;
}

// --- Drag handlers (offsets en pixels canvas) ---
function handleStart(event) {
  if (!userImage) return;
  const coords = getCanvasCoordinates(event);
  lastMouseX = coords.x;
  lastMouseY = coords.y;

  const rectX = rect.x * scaleRatio;
  const rectY = rect.y * scaleRatio;
  const rectW = rect.width * scaleRatio;
  const rectH = rect.height * scaleRatio;

  if (isPointInRect(lastMouseX, lastMouseY, rectX, rectY, rectW, rectH)) {
    isDragging = true;
    canvas.style.cursor = "grabbing";
    event.preventDefault();
  }
}

function handleMove(event) {
  if (!isDragging || !userImage) return;
  const coords = getCanvasCoordinates(event);
  const mouseX = coords.x;
  const mouseY = coords.y;

  // dx/dy en pixels canvas (on stocke imgOffset en pixels canvas)
  const dx = mouseX - lastMouseX;
  const dy = mouseY - lastMouseY;

  imgOffsetX += dx;
  imgOffsetY += dy;

  // Mettre à jour les limites selon taille actuelle de l'image (drawW/drawH)
  const drawW = userImage.width * imgScale;
  const drawH = userImage.height * imgScale;
  const rectW = rect.width * scaleRatio;
  const rectH = rect.height * scaleRatio;

  const maxOffsetX = Math.max(0, (drawW - rectW) / 2);
  const maxOffsetY = Math.max(0, (drawH - rectH) / 2);
  imgOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, imgOffsetX));
  imgOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, imgOffsetY));

  lastMouseX = mouseX;
  lastMouseY = mouseY;

  drawCanvas();
  event.preventDefault();
}

function handleEnd() {
  isDragging = false;
  canvas.style.cursor = "default";
}

canvas.addEventListener("mousedown", handleStart);
canvas.addEventListener("mousemove", handleMove);
canvas.addEventListener("mouseup", handleEnd);
canvas.addEventListener("mouseleave", handleEnd);
canvas.addEventListener("touchstart", handleStart, { passive: false });
canvas.addEventListener("touchmove", handleMove, { passive: false });
canvas.addEventListener("touchend", handleEnd);
canvas.addEventListener("touchcancel", handleEnd);

// cursor hint
canvas.addEventListener("mousemove", (e) => {
  if (isDragging || !userImage) return;
  const coords = getCanvasCoordinates(e);
  const rX = rect.x * scaleRatio;
  const rY = rect.y * scaleRatio;
  const rW = rect.width * scaleRatio;
  const rH = rect.height * scaleRatio;
  canvas.style.cursor = isPointInRect(coords.x, coords.y, rX, rY, rW, rH)
    ? "grab"
    : "default";
});

// --- Zoom (molette & boutons) ---
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (!userImage) return;

  const zoomIntensity = 0.08;
  const delta = e.deltaY > 0 ? -1 : 1;
  // calculer échelle minimale pour couvrir le cadre
  const rectW = rect.width * scaleRatio;
  const rectH = rect.height * scaleRatio;
  const minScale = Math.max(rectW / userImage.width, rectH / userImage.height);
  const maxScale = minScale * 4;

  imgScale = Math.max(
    minScale,
    Math.min(maxScale, imgScale * (1 + delta * zoomIntensity))
  );

  // réajuster offsets si nécessaire
  const drawW = userImage.width * imgScale;
  const drawH = userImage.height * imgScale;
  const maxOffsetX = Math.max(0, (drawW - rectW) / 2);
  const maxOffsetY = Math.max(0, (drawH - rectH) / 2);
  imgOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, imgOffsetX));
  imgOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, imgOffsetY));

  drawCanvas();
});

zoomInBtn.addEventListener("click", () => {
  if (!userImage) return;
  const rectW = rect.width * scaleRatio;
  const rectH = rect.height * scaleRatio;
  const minScale = Math.max(rectW / userImage.width, rectH / userImage.height);
  const maxScale = minScale * 4;
  imgScale = Math.min(maxScale, imgScale * 1.1);
  drawCanvas();
});
zoomOutBtn.addEventListener("click", () => {
  if (!userImage) return;
  const rectW = rect.width * scaleRatio;
  const rectH = rect.height * scaleRatio;
  const minScale = Math.max(rectW / userImage.width, rectH / userImage.height);
  imgScale = Math.max(minScale, imgScale / 1.1);
  drawCanvas();
});

// reset
resetBtn.addEventListener("click", () => {
  if (!userImage) return;
  // remettre l'image à la taille qui couvre le cadre et recentrer
  const rectW = rect.width * scaleRatio;
  const rectH = rect.height * scaleRatio;
  imgScale = Math.max(rectW / userImage.width, rectH / userImage.height);
  imgOffsetX = 0;
  imgOffsetY = 0;
  drawCanvas();
});

// --- Fonctions pour changer la taille du cadre sans déplacer visuellement l'image ---
// expandFrameBy(factor) : agrandit/reduit le cadre en gardant le même centre visuel
function expandFrameBy(factor) {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  rect.width = rect.width * factor;
  rect.height = rect.height * factor;
  rect.x = centerX - rect.width / 2;
  rect.y = centerY - rect.height / 2;

  // après changement de taille, on doit recalculer la "minScale" possible : on garde imgScale si possible,
  // et on clamp les offsets en pixels canvas
  const rectW = rect.width * scaleRatio;
  const rectH = rect.height * scaleRatio;
  const minScale = Math.max(rectW / userImage.width, rectH / userImage.height);
  if (imgScale < minScale) imgScale = minScale;

  // limites offsets recalculées dans drawCanvas, donc appeler draw
  drawCanvas();
}

// setFrameSize(newW, newH) : définit explicitement la taille (en unités de référence)
function setFrameSize(newW, newH) {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  rect.width = newW;
  rect.height = newH;
  rect.x = centerX - rect.width / 2;
  rect.y = centerY - rect.height / 2;

  const rectW = rect.width * scaleRatio;
  const rectH = rect.height * scaleRatio;
  const minScale = Math.max(rectW / userImage.width, rectH / userImage.height);
  if (imgScale < minScale) imgScale = minScale;

  drawCanvas();
}

// Exposer fonctions globalement si utile (par ex. console)
window.expandFrameBy = expandFrameBy;
window.setFrameSize = setFrameSize;

// --- Téléchargement HD ---
downloadBtn.addEventListener("click", () => {
  if (!userImage) return;
  const qualityFactor = 3; // multiplier pour HD

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  // on produit une image en taille de référence * qualityFactor
  tempCanvas.width = ORIGINAL_WIDTH * qualityFactor;
  tempCanvas.height = ORIGINAL_HEIGHT * qualityFactor;

  // dessiner background HD (si background chargé)
  const bgHD = new Image();
  bgHD.onload = () => {
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = "high";

    tempCtx.drawImage(bgHD, 0, 0, tempCanvas.width, tempCanvas.height);

    // calculer le cadre HD en pixels
    const rectX = rect.x * qualityFactor;
    const rectY = rect.y * qualityFactor;
    const rectW = rect.width * qualityFactor;
    const rectH = rect.height * qualityFactor;
    const radiusHD = BORDER_RADIUS * qualityFactor;

    tempCtx.save();
    tempCtx.beginPath();
    tempCtx.roundRect(rectX, rectY, rectW, rectH, radiusHD);
    tempCtx.closePath();
    tempCtx.clip();

    // image HD affichée : userImage.width * (imgScale * qualityFactor/scaleRatio?)
    // mais imgScale est défini en pixels-canvas par rapport au canvas actuel (canvas.width ~ ORIGINAL_WIDTH*scaleRatio)
    // pour convertir proprement : imageDisplayedHD = userImage.width * (imgScale * (qualityFactor/scaleRatio))
    const scaleConvert = qualityFactor / scaleRatio;
    const drawW_HD = userImage.width * imgScale * scaleConvert;
    const drawH_HD = userImage.height * imgScale * scaleConvert;
    const centerX = rectX + rectW / 2;
    const centerY = rectY + rectH / 2;
    const drawX_HD = centerX - drawW_HD / 2 + imgOffsetX * scaleConvert;
    const drawY_HD = centerY - drawH_HD / 2 + imgOffsetY * scaleConvert;

    tempCtx.drawImage(userImage, drawX_HD, drawY_HD, drawW_HD, drawH_HD);
    tempCtx.restore();

    // cadre HD avec coins arrondis
    tempCtx.beginPath();
    tempCtx.roundRect(rectX, rectY, rectW, rectH, radiusHD);
    tempCtx.lineWidth = 2 * qualityFactor;
    tempCtx.strokeStyle = "rgba(255,255,255,0.85)";
    tempCtx.stroke();

    // download
    const link = document.createElement("a");
    link.download = "affiche_hd.png";
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  };

  bgHD.src = background.src;
});
