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
    const printPdfBtn = document.getElementById('printPdfBtn');

    // Marca de Agua
    const enableWm = document.getElementById('enableWm');
    const wmControlsContainer = document.getElementById('watermark-controls');
    const wmPreviewCanvas = document.getElementById('wmPreview');
    const wmControls = ['wmSize', 'wmColor', 'wmAlpha', 'wmFont', 'wmPos'];

    // Salida ZIP
    const outWidthInput = document.getElementById('outWidth');
    const outHeightInput = document.getElementById('outHeight');

    // Salida PDF
    const outWidthMmInput = document.getElementById('outWidthMm');
    const outHeightMmInput = document.getElementById('outHeightMm');
    const pdfLayoutPreviewCanvas = document.getElementById('pdfLayoutPreview');
    const pdfLayoutControls = ['paperSize', 'printLayout', 'printMargin', 'printSpacing', 'outWidthMm', 'outHeightMm'];

    // --- Estado de la Aplicación ---
    let images = [];
    window.processedImages = [];

    // --- Constantes ---
    const PAPER_SIZES = {
        a4: { width: 210, height: 297 },
        a3: { width: 297, height: 420 }
    };

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

    function updatePdfLayoutPreview() {
        const ctx = pdfLayoutPreviewCanvas.getContext('2d');
        const canvasW = pdfLayoutPreviewCanvas.width;

        const paper = PAPER_SIZES[document.getElementById('paperSize').value];
        const orientation = document.getElementById('printLayout').value;
        const paperW_mm = orientation === 'landscape' ? paper.height : paper.width;
        const paperH_mm = orientation === 'landscape' ? paper.width : paper.height;

        pdfLayoutPreviewCanvas.height = canvasW * (paperH_mm / paperW_mm);
        ctx.clearRect(0, 0, canvasW, pdfLayoutPreviewCanvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasW, pdfLayoutPreviewCanvas.height);
        ctx.strokeStyle = '#CCCCCC';
        ctx.strokeRect(0, 0, canvasW, pdfLayoutPreviewCanvas.height);

        const imageWidth_mm = parseFloat(outWidthMmInput.value);
        const imageHeight_mm = parseFloat(outHeightMmInput.value);

        if (isNaN(imageWidth_mm) || isNaN(imageHeight_mm) || imageWidth_mm <= 0 || imageHeight_mm <= 0) {
            return;
        }

        const margin_mm = parseInt(document.getElementById('printMargin').value, 10);
        const spacing_mm = parseInt(document.getElementById('printSpacing').value, 10);
        const layout = calculateLayout(imageWidth_mm, imageHeight_mm, paper, orientation, margin_mm, spacing_mm);

        if (layout.imagesPerPage === 0) {
            ctx.fillStyle = '#D35400';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No caben', canvasW / 2, pdfLayoutPreviewCanvas.height / 2);
            return;
        }

        const scale = canvasW / paperW_mm;
        const margin_px = margin_mm * scale;
        const spacing_px = spacing_mm * scale;
        const imgW_px = imageWidth_mm * scale;
        const imgH_px = imageHeight_mm * scale;

        ctx.fillStyle = '#A9CCE3';
        ctx.strokeStyle = '#5499C7';
        for (let i = 0; i < layout.imagesPerPage; i++) {
            const col = i % layout.imagesPerRow;
            const row = Math.floor(i / layout.imagesPerRow);
            const x = margin_px + col * (imgW_px + spacing_px);
            const y = margin_px + row * (imgH_px + spacing_px);
            ctx.fillRect(x, y, imgW_px, imgH_px);
            ctx.strokeRect(x, y, imgW_px, imgH_px);
        }

        ctx.fillStyle = '#17202A';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${layout.imagesPerPage} img/pág`, canvasW / 2, 15);
    }

    function updateLinkedDimensions(source) {
        const aspectValue = aspectRatioSelect.value;
        const [aspectW, aspectH] = aspectValue.split(':').map(Number);
        const ratio = aspectW / aspectH;

        if (source === 'px') {
            const widthVal = parseFloat(outWidthInput.value);
            if (!isNaN(widthVal)) outHeightInput.value = Math.round(widthVal / ratio);
        } else if (source === 'mm') {
            const widthVal = parseFloat(outWidthMmInput.value);
            if (!isNaN(widthVal)) outHeightMmInput.value = (widthVal / ratio).toFixed(1);
        }
    }

    // --- Lógica de Negocio ---

    function calculateLayout(imageWidth, imageHeight, paperConfig, orientation, margin, spacing) {
        if (!imageWidth || imageWidth <= 0 || !imageHeight || imageHeight <= 0) {
            return { imagesPerPage: 0, imagesPerRow: 0, imagesPerCol: 0 };
        }
        const pageWidth = orientation === 'landscape' ? paperConfig.height : paperConfig.width;
        const pageHeight = orientation === 'landscape' ? paperConfig.width : paperConfig.height;
        const usableWidth = pageWidth - (margin * 2);
        const usableHeight = pageHeight - (margin * 2);

        if (imageWidth > usableWidth || imageHeight > usableHeight) {
            return { imagesPerPage: 0, imagesPerRow: 0, imagesPerCol: 0 };
        }
        const imagesPerRow = Math.floor((usableWidth + spacing) / (imageWidth + spacing));
        const imagesPerCol = Math.floor((usableHeight + spacing) / (imageHeight + spacing));
        return {
            imagesPerPage: imagesPerRow * imagesPerCol,
            imagesPerRow,
            imagesPerCol,
        };
    }

    async function generatePDF() {
        if (!window.processedImages || window.processedImages.length === 0) {
            alert('Primero debes procesar las imágenes.');
            return;
        }

        const imageWidth = parseFloat(outWidthMmInput.value);
        const imageHeight = parseFloat(outHeightMmInput.value);

        if (isNaN(imageWidth) || isNaN(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
            alert('Por favor, introduce un ancho y alto válidos en mm para el PDF.');
            return;
        }

        const paperSize = document.getElementById('paperSize').value;
        const printLayout = document.getElementById('printLayout').value;
        const margin = parseInt(document.getElementById('printMargin').value, 10);
        const spacing = parseInt(document.getElementById('printSpacing').value, 10);

        const paperConfig = PAPER_SIZES[paperSize];
        const layout = calculateLayout(imageWidth, imageHeight, paperConfig, printLayout, margin, spacing);

        if (layout.imagesPerPage === 0) {
            alert("Las imágenes con las dimensiones especificadas no caben en la página. Intenta con un tamaño de imagen más pequeño, o reduce los márgenes/espaciado.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: printLayout, unit: 'mm', format: paperSize });

        for (let i = 0; i < window.processedImages.length; i++) {
            const imageOnPageIndex = i % layout.imagesPerPage;
            const col = imageOnPageIndex % layout.imagesPerRow;
            const row = Math.floor(imageOnPageIndex / layout.imagesPerRow);

            if (i > 0 && imageOnPageIndex === 0) doc.addPage();

            const x = margin + col * (imageWidth + spacing);
            const y = margin + row * (imageHeight + spacing);

            const imgData = window.processedImages[i];
            doc.addImage(imgData, 'PNG', x, y, imageWidth, imageHeight);
        }
        doc.save('golem_de_papel_impresion.pdf');
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
          updateLinkedDimensions('mm'); // Actualizar mm por si acaso

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
          printPdfBtn.disabled = false;
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

    printPdfBtn.addEventListener('click', generatePDF);

    enableWm.addEventListener('change', () => {
        wmControlsContainer.style.display = enableWm.checked ? 'block' : 'none';
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

    pdfLayoutControls.forEach(id => {
        document.getElementById(id).addEventListener('input', updatePdfLayoutPreview);
        document.getElementById(id).addEventListener('change', updatePdfLayoutPreview);
    });

    outWidthInput.addEventListener('input', () => updateLinkedDimensions('px'));
    outHeightInput.addEventListener('input', () => { /* no-op to prevent loops */ });
    outWidthMmInput.addEventListener('input', () => updateLinkedDimensions('mm'));
    outHeightMmInput.addEventListener('input', () => { /* no-op to prevent loops */ });

    aspectRatioSelect.addEventListener('change', () => {
        updateLinkedDimensions('px');
        updateLinkedDimensions('mm');
    });

    // --- Inicialización ---
    updateWatermarkPreview();
    updatePdfLayoutPreview();
    wmControlsContainer.style.display = enableWm.checked ? 'block' : 'none';
});
