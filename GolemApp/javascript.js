// Modo oscuro/claro con Tailwind
function setDarkMode(enabled) {
  const html = document.documentElement;
  if (enabled) {
    html.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    html.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}

// Inicializar modo oscuro inmediatamente
const userTheme = localStorage.getItem('theme');
if (userTheme === 'dark' || (!userTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  setDarkMode(true);
} else {
  setDarkMode(false);
}

// Actualizar el evento del toggle
document.getElementById('toggleDark').addEventListener('change', function(e) {
    if (e.target.checked) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
});

// Establecer el estado inicial del switch basado en el modo actual
document.getElementById('toggleDark').checked = document.documentElement.classList.contains('dark');

// Lógica para cargar, ordenar y previsualizar imágenes
document.addEventListener('DOMContentLoaded', () => {
    // --- Selectores de Elementos ---
    const fileInput = document.getElementById('fileInput');
    const initialPreviewContainer = document.getElementById('initialPreviewContainer');
    const aspectRatioSelect = document.getElementById('aspectRatio');
    const processBtn = document.getElementById('processBtn');
    const resultsSection = document.getElementById('results-section');
    const previewContainer = document.getElementById('previewContainer');
    const downloadBtn = document.getElementById('downloadBtn');

    // Marca de Agua
    const enableWm = document.getElementById('enableWm');
    const wmControlsContainer = document.getElementById('watermark-controls');
    const wmPreviewCanvas = document.getElementById('wmPreview');
    const wmControls = ['wmSize', 'wmColor', 'wmAlpha', 'wmFont', 'wmPos'];

    // Salida ZIP
    const outWidthInput = document.getElementById('outWidth');
    const outHeightInput = document.getElementById('outHeight');

    // --- Estado de la Aplicación ---
    let images = [];
    window.processedImages = [];

    // --- Lógica de la Interfaz (UI) ---

    function updateWatermarkPreview() {
        const ctx = wmPreviewCanvas.getContext('2d');
        const w = wmPreviewCanvas.width;
        const h = wmPreviewCanvas.height;

        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#44403c' : '#d6d3d1';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#a8a29e' : '#78716c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '14px Arial';
        ctx.fillText('Preview', w / 2, h / 2);

        if (!enableWm.checked) return;

        const numero = '1';
        const wmSize = parseInt(document.getElementById('wmSize').value, 10);
        const wmColor = document.getElementById('wmColor').value;
        const wmAlpha = parseInt(document.getElementById('wmAlpha').value, 10) / 100;
        const wmFont = document.getElementById('wmFont').value;
        const wmPos = document.getElementById('wmPos').value;
        const fontSize = Math.floor(h * (wmSize / 100));
        let x, y, align, baseline;

        switch (wmPos) {
          case 'br': x = w - 5; y = h - 5; align = 'right'; baseline = 'bottom'; break;
          case 'bl': x = 5; y = h - 5; align = 'left'; baseline = 'bottom'; break;
          case 'tr': x = w - 5; y = 5 + fontSize; align = 'right'; baseline = 'top'; break;
          case 'tl': x = 5; y = 5 + fontSize; align = 'left'; baseline = 'top'; break;
        }

        ctx.save();
        ctx.font = `${fontSize}px ${wmFont}`;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;
        ctx.globalAlpha = wmAlpha;
        ctx.fillStyle = wmColor;
        ctx.fillText(numero, x, y);
        ctx.restore();
    }

    function updateLinkedDimensions() {
        const aspectValue = aspectRatioSelect.value;
        const [aspectW, aspectH] = aspectValue.split(':').map(Number);
        const ratio = aspectW / aspectH;
        const widthVal = parseFloat(outWidthInput.value);
        if (!isNaN(widthVal)) outHeightInput.value = Math.round(widthVal / ratio);
    }

    // --- Event Listeners ---
    fileInput.addEventListener('change', (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        images = [];
        initialPreviewContainer.innerHTML = '';

        files.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            img.className = 'w-full h-full object-cover rounded-md';
            initialPreviewContainer.appendChild(img);
            images.push({ file, src: e.target.result, name: file.name });
            if (images.length === files.length) {
              processBtn.disabled = false;
            }
          };
          reader.readAsDataURL(file);
        });
    });

    processBtn.addEventListener('click', () => {
        if (images.length === 0) return;

        const processedImages = [];
        previewContainer.innerHTML = '';
        const targetAspect = (() => {
            const [w, h] = aspectRatioSelect.value.split(':').map(Number);
            return w / h;
        })();

        const imgElements = images.map(imgObj => {
          const img = new window.Image();
          img.src = imgObj.src;
          return img;
        });

        Promise.all(imgElements.map(img => new Promise(res => { if(img.complete) res(); else img.onload = res; }))).then(() => {
          let minWidth = Math.min(...imgElements.map(img => img.naturalWidth));
          let minHeight = Math.min(...imgElements.map(img => img.naturalHeight));

          let cropWidth = minWidth;
          let cropHeight = Math.round(cropWidth / targetAspect);
          if (cropHeight > minHeight) {
            cropHeight = minHeight;
            cropWidth = Math.round(cropHeight * targetAspect);
          }

          const croppedImages = imgElements.map(img => {
            const sx = Math.floor((img.naturalWidth - cropWidth) / 2);
            const sy = Math.floor((img.naturalHeight - cropHeight) / 2);
            const canvas = document.createElement('canvas');
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            return canvas;
          });

          const width = cropWidth;
          const height = cropHeight;
          const halfHeight = Math.floor(height / 2);

          outWidthInput.value = width;
          outHeightInput.value = height;

          for (let i = 0; i < croppedImages.length; i++) {
            const imgTop = croppedImages[i];
            const imgBottom = croppedImages[(i + 1) % croppedImages.length];
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgTop, 0, 0, width, halfHeight, 0, 0, width, halfHeight);
            ctx.drawImage(imgBottom, 0, halfHeight, width, height - halfHeight, 0, halfHeight, width, height - halfHeight);

            if (enableWm.checked) {
                const numero = (i + 1).toString();
                const wmSize = parseInt(document.getElementById('wmSize').value, 10);
                const wmColor = document.getElementById('wmColor').value;
                const wmAlpha = parseInt(document.getElementById('wmAlpha').value, 10) / 100;
                const wmFont = document.getElementById('wmFont').value;
                const wmPos = document.getElementById('wmPos').value;
                const fontSize = Math.floor(height * (wmSize / 100));
                let x, y, align, baseline;

                switch (wmPos) {
                  case 'br': x = width - 15; y = height - 15; align = 'right'; baseline = 'bottom'; break;
                  case 'bl': x = 15; y = height - 15; align = 'left'; baseline = 'bottom'; break;
                  case 'tr': x = width - 15; y = 15 + fontSize; align = 'right'; baseline = 'top'; break;
                  case 'tl': x = 15; y = 15 + fontSize; align = 'left'; baseline = 'top'; break;
                }

                ctx.save();
                ctx.font = `${fontSize}px ${wmFont}`;
                ctx.textAlign = align;
                ctx.textBaseline = baseline;
                ctx.globalAlpha = wmAlpha;
                ctx.fillStyle = wmColor;
                ctx.fillText(numero, x, y);
                ctx.restore();
            }

            const resultImg = document.createElement('img');
            resultImg.src = canvas.toDataURL('image/png');
            resultImg.className = 'w-full h-full object-cover rounded-md';
            resultImg.addEventListener('click', () => {
              const win = window.open();
              win.document.write(`<img src="${resultImg.src}" style="max-width:100vw;max-height:100vh;display:block;margin:auto;">`);
            });
            previewContainer.appendChild(resultImg);
            processedImages.push(canvas.toDataURL('image/png'));
          }

          window.processedImages = processedImages;
          downloadBtn.disabled = false;
          resultsSection.classList.remove('hidden');
          setTimeout(() => resultsSection.classList.remove('opacity-0'), 10);
        });
    });

    downloadBtn.addEventListener('click', async () => {
        if (!window.processedImages || window.processedImages.length === 0) return;

        const outWidth = parseInt(outWidthInput.value, 10);
        const outHeight = parseInt(outHeightInput.value, 10);
        const outFormat = document.getElementById('outFormat').value;

        if (typeof JSZip === 'undefined') {
          alert('JSZip no está cargado.');
          return;
        }
        const zip = new JSZip();

        for (let idx = 0; idx < window.processedImages.length; idx++) {
          const dataUrl = window.processedImages[idx];
          const img = new window.Image();
          img.src = dataUrl;
          await new Promise(res => { img.onload = res; });

          const canvas = document.createElement('canvas');
          canvas.width = outWidth;
          canvas.height = outHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, outWidth, outHeight);

          let ext = outFormat;
          let mime = `image/${outFormat}`;
          if (outFormat === 'jpeg') ext = 'jpg';

          const outDataUrl = canvas.toDataURL(mime);
          let origName = images[idx]?.name || `imagen_${idx+1}`;
          origName = origName.replace(/\.[^.]+$/, '');
          const finalName = `${origName}_${idx+1}.${ext}`;

          const res = await fetch(outDataUrl);
          const blob = await res.blob();
          zip.file(finalName, blob);
        }

        const content = await zip.generateAsync({type: 'blob'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = 'imagenes_procesadas.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    enableWm.addEventListener('change', () => {
        const checked = enableWm.checked;
        const controlsContainer = document.getElementById('watermark-controls');
        if (controlsContainer) {
            controlsContainer.style.display = checked ? 'grid' : 'none';
        }
        wmPreviewCanvas.style.display = checked ? 'block' : 'none';
        updateWatermarkPreview();
    });
    wmControls.forEach(id => {
        document.getElementById(id).addEventListener('input', updateWatermarkPreview);
        document.getElementById(id).addEventListener('change', updateWatermarkPreview);
    });
    document.getElementById('wmSize').addEventListener('input', (e) => {
        document.getElementById('wmSizeVal').textContent = e.target.value;
    });
    document.getElementById('wmAlpha').addEventListener('input', (e) => {
        document.getElementById('wmAlphaVal').textContent = e.target.value;
    });

    outWidthInput.addEventListener('input', () => updateLinkedDimensions());
    outHeightInput.addEventListener('input', () => { /* no-op to prevent loops */ });
    aspectRatioSelect.addEventListener('change', () => updateLinkedDimensions());

    // --- Inicialización ---
    updateWatermarkPreview();
    const isWmEnabled = enableWm.checked;
    wmControlsContainer.style.display = isWmEnabled ? 'grid' : 'none';
    wmPreviewCanvas.style.display = isWmEnabled ? 'block' : 'none';
});
