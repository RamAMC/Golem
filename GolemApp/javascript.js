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
  const fileInput = document.getElementById('fileInput');
  const previewContainer = document.getElementById('previewContainer');
  const processBtn = document.getElementById('processBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const printPdfBtn = document.getElementById('printPdfBtn');

  let images = [];
  window.processedImages = [];

  fileInput.addEventListener('change', (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    images = [];
    previewContainer.innerHTML = '';

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = file.name;
        img.className = 'preview-img';
        previewContainer.appendChild(img);
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

    const aspectRatioSelect = document.getElementById('aspectRatio');
    const aspectValue = aspectRatioSelect.value;
    const [aspectW, aspectH] = aspectValue.split(':').map(Number);
    const targetAspect = aspectW / aspectH;

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

      document.getElementById('outWidth').value = width;
      document.getElementById('outHeight').value = height;
      document.getElementById('outUnit').value = 'px';

      for (let i = 0; i < croppedImages.length; i++) {
        const imgTop = croppedImages[i];
        const imgBottom = croppedImages[(i + 1) % croppedImages.length];
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgTop, 0, 0, width, halfHeight, 0, 0, width, halfHeight);
        ctx.drawImage(imgBottom, 0, halfHeight, width, height - halfHeight, 0, halfHeight, width, height - halfHeight);

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

        const resultImg = document.createElement('img');
        resultImg.src = canvas.toDataURL('image/png');
        resultImg.className = 'preview-img';
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
    });
  });

  downloadBtn.addEventListener('click', async () => {
    if (!window.processedImages || window.processedImages.length === 0) return;

    const unit = document.getElementById('outUnit').value;
    if (unit !== 'px') {
      alert('Para descargar imágenes en un ZIP, por favor establece las dimensiones de salida en píxeles (px).');
      return;
    }

    const outWidth = parseInt(document.getElementById('outWidth').value, 10);
    const outHeight = parseInt(document.getElementById('outHeight').value, 10);
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

  document.getElementById('wmSize').addEventListener('input', (e) => {
    document.getElementById('wmSizeVal').textContent = e.target.value;
  });
  document.getElementById('wmAlpha').addEventListener('input', (e) => {
    document.getElementById('wmAlphaVal').textContent = e.target.value;
  });

  function updateLinkedDimensions(changed) {
    const aspectValue = document.getElementById('aspectRatio').value;
    const [aspectW, aspectH] = aspectValue.split(':').map(Number);
    const ratio = aspectW / aspectH;
    const outWidthInput = document.getElementById('outWidth');
    const outHeightInput = document.getElementById('outHeight');
    let widthVal = parseFloat(outWidthInput.value);
    let heightVal = parseFloat(outHeightInput.value);

    if (changed === 'width' && !isNaN(widthVal)) {
      outHeightInput.value = (widthVal / ratio).toFixed(1);
    } else if (changed === 'height' && !isNaN(heightVal)) {
      outWidthInput.value = (heightVal * ratio).toFixed(1);
    }
  }

  document.getElementById('outWidth').addEventListener('input', () => updateLinkedDimensions('width'));
  document.getElementById('outHeight').addEventListener('input', () => updateLinkedDimensions('height'));
  document.getElementById('aspectRatio').addEventListener('change', () => updateLinkedDimensions('width'));

  document.getElementById('outUnit').addEventListener('change', function() {
    const unit = this.value;
    const outWidthInput = document.getElementById('outWidth');
    const outHeightInput = document.getElementById('outHeight');
    let widthVal = parseFloat(outWidthInput.value);
    let heightVal = parseFloat(outHeightInput.value);

    // Sugerir valores por defecto al cambiar de unidad
    if (unit === 'mm' && !isNaN(widthVal)) {
        outWidthInput.value = (widthVal / 37.8).toFixed(1); // 37.8 px/cm a 96 DPI
        outHeightInput.value = (heightVal / 37.8).toFixed(1);
    } else if (unit === 'px' && !isNaN(widthVal)) {
        outWidthInput.value = Math.round(widthVal * 37.8);
        outHeightInput.value = Math.round(heightVal * 37.8);
    }
  });

  const PAPER_SIZES = {
    a4: { width: 210, height: 297 },
    a3: { width: 297, height: 420 }
  };

  function calculateLayout(imageWidth, imageHeight, paperConfig, orientation, margin, spacing) {
    if (!imageWidth || imageWidth <= 0 || !imageHeight || imageHeight <= 0) {
        throw new Error('Las dimensiones de la imagen no son válidas.');
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
    const unit = document.getElementById('outUnit').value;
    if (unit !== 'mm') {
        alert('Para generar un PDF, por favor establece las dimensiones de salida en milímetros (mm).');
        return;
    }
    const imageWidth = parseFloat(document.getElementById('outWidth').value);
    const imageHeight = parseFloat(document.getElementById('outHeight').value);

    if (isNaN(imageWidth) || isNaN(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
        alert('Por favor, introduce un ancho y alto válidos en mm.');
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
        
        if (i > 0 && imageOnPageIndex === 0) {
            doc.addPage();
        }

        const x = margin + col * (imageWidth + spacing);
        const y = margin + row * (imageHeight + spacing);

        const imgData = window.processedImages[i];
        doc.addImage(imgData, 'PNG', x, y, imageWidth, imageHeight);
    }
    doc.save('golem_de_papel_impresion.pdf');
  }

  printPdfBtn.addEventListener('click', generatePDF);
});
