import { uploadToCloudinary } from "./cloudinary.js";

const MAX_DIM = 1600;
const PIXEL_BLOCK = 14;

/* 캔버스에 그려서 올리기 때문에 리사이즈와 동시에 EXIF(위치정보 등)가 함께 지워진다. */
export function editAndUploadPhotos(fileList) {
  return new Promise((resolve) => {
    const queue = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const total = queue.length;
    const results = [];

    const modal = document.getElementById("photoEditorModal");
    const wrap = document.getElementById("photoEditorCanvasWrap");
    const canvas = document.getElementById("photoEditorCanvas");
    const selectionEl = document.getElementById("photoEditorSelection");
    const ctx = canvas.getContext("2d");
    const captionInput = document.getElementById("photoEditorCaption");
    const progressEl = document.getElementById("photoEditorProgress");
    const addBtn = document.getElementById("photoEditorAdd");
    const skipBtn = document.getElementById("photoEditorSkip");
    const undoBtn = document.getElementById("photoEditorUndo");

    let historyStack = [];
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragRect = null;
    let currentFile = null;

    if (!total) {
      resolve(results);
      return;
    }

    function finish() {
      modal.hidden = true;
      cleanup();
      resolve(results);
    }

    function cleanup() {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      addBtn.removeEventListener("click", onAdd);
      skipBtn.removeEventListener("click", onSkip);
      undoBtn.removeEventListener("click", onUndo);
    }

    async function loadNext() {
      if (!queue.length) {
        finish();
        return;
      }
      const file = queue.shift();
      currentFile = file;
      progressEl.textContent = `(${total - queue.length}/${total})`;
      captionInput.value = "";
      historyStack = [];

      const bitmap = await createImageBitmap(file).catch(() => null);
      if (!bitmap) {
        await loadNext();
        return;
      }
      const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    }

    function clientToCanvasRect(x0, y0, x1, y1) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (Math.min(x0, x1) - rect.left) * scaleX;
      const y = (Math.min(y0, y1) - rect.top) * scaleY;
      const w = Math.abs(x1 - x0) * scaleX;
      const h = Math.abs(y1 - y0) * scaleY;
      return { x, y, w, h };
    }

    function onDown(e) {
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragRect = wrap.getBoundingClientRect();
      selectionEl.hidden = false;
      paintSelection(e.clientX, e.clientY);
    }

    function paintSelection(clientX, clientY) {
      const left = Math.min(dragStartX, clientX) - dragRect.left;
      const top = Math.min(dragStartY, clientY) - dragRect.top;
      selectionEl.style.left = left + "px";
      selectionEl.style.top = top + "px";
      selectionEl.style.width = Math.abs(clientX - dragStartX) + "px";
      selectionEl.style.height = Math.abs(clientY - dragStartY) + "px";
    }

    function onMove(e) {
      if (!dragging) return;
      paintSelection(e.clientX, e.clientY);
    }

    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      selectionEl.hidden = true;
      const { x, y, w, h } = clientToCanvasRect(dragStartX, dragStartY, e.clientX, e.clientY);
      if (w > 6 && h > 6) {
        historyStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        pixelateRegion(ctx, x, y, w, h);
      }
    }

    function onUndo() {
      const prev = historyStack.pop();
      if (prev) ctx.putImageData(prev, 0, 0);
    }

    async function onAdd() {
      addBtn.disabled = true;
      try {
        const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
        const url = await uploadToCloudinary(blob, currentFile.name);
        results.push({ url, caption: captionInput.value.trim() });
        await loadNext();
      } catch (err) {
        alert("사진 업로드 실패: " + err.message);
      } finally {
        addBtn.disabled = false;
      }
    }

    function onSkip() {
      loadNext();
    }

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    addBtn.addEventListener("click", onAdd);
    skipBtn.addEventListener("click", onSkip);
    undoBtn.addEventListener("click", onUndo);

    modal.hidden = false;
    loadNext();
  });
}

function pixelateRegion(ctx, x, y, w, h) {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  const imgData = ctx.getImageData(x, y, w, h);
  const data = imgData.data;

  for (let by = 0; by < h; by += PIXEL_BLOCK) {
    for (let bx = 0; bx < w; bx += PIXEL_BLOCK) {
      const bw = Math.min(PIXEL_BLOCK, w - bx);
      const bh = Math.min(PIXEL_BLOCK, h - by);
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let yy = 0; yy < bh; yy++) {
        for (let xx = 0; xx < bw; xx++) {
          const idx = ((by + yy) * w + (bx + xx)) * 4;
          r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; a += data[idx + 3];
          count++;
        }
      }
      r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count); a = Math.round(a / count);
      for (let yy = 0; yy < bh; yy++) {
        for (let xx = 0; xx < bw; xx++) {
          const idx = ((by + yy) * w + (bx + xx)) * 4;
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
        }
      }
    }
  }
  ctx.putImageData(imgData, x, y);
}
