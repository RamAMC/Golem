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

  let images = [];

  fileInput.addEventListener('change', (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Ordenar archivos por nombre
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    images = [];
    previewContainer.innerHTML = '';

    files.forEach((file, idx) => {
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

  // Los siguientes botones se habilitarán y tendrán lógica en los siguientes pasos
  processBtn.addEventListener('click', () => {
    if (images.length === 0) return;
    const processedImages = [];
    const tempCanvases = [];
    previewContainer.innerHTML = '';

    // Obtener relación de aspecto seleccionada
    const aspectRatioSelect = document.getElementById('aspectRatio');
    const aspectValue = aspectRatioSelect.value;
    const [aspectW, aspectH] = aspectValue.split(':').map(Number);
    const targetAspect = aspectW / aspectH;

    // Primero, cargar todas las imágenes en objetos Image
    const imgElements = images.map(imgObj => {
      const img = new window.Image();
      img.src = imgObj.src;
      return img;
    });

    Promise.all(imgElements.map(img => new Promise(res => {
      img.onload = () => res();
    }))).then(() => {
      // Determinar tamaño base: el menor ancho y alto posibles para todas las imágenes
      let minWidth = Math.min(...imgElements.map(img => img.naturalWidth));
      let minHeight = Math.min(...imgElements.map(img => img.naturalHeight));
      // Ajustar a la relación de aspecto elegida
      let cropWidth = minWidth;
      let cropHeight = Math.round(cropWidth / targetAspect);
      if (cropHeight > minHeight) {
        cropHeight = minHeight;
        cropWidth = Math.round(cropHeight * targetAspect);
      }

      // Recortar todas las imágenes a la relación de aspecto seleccionada
      const croppedImages = imgElements.map(img => {
        // Centrar el recorte
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

      // Actualizar los valores de los inputs de salida
      document.getElementById('outWidth').value = width;
      document.getElementById('outHeight').value = height;

      // Cortar mitades y recombinar
      for (let i = 0; i < croppedImages.length; i++) {
        // Mitad superior de la imagen i
        // Mitad inferior de la imagen (i+1)%N
        const imgTop = croppedImages[i];
        const imgBottom = croppedImages[(i + 1) % croppedImages.length];

        // Crear canvas para la nueva imagen
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Dibujar mitad superior
        ctx.drawImage(imgTop, 0, 0, width, halfHeight, 0, 0, width, halfHeight);
        // Dibujar mitad inferior
        ctx.drawImage(imgBottom, 0, halfHeight, width, height - halfHeight, 0, halfHeight, width, height - halfHeight);

        // Agregar número de secuencia como marca de agua (personalizable)
        const numero = (i + 1).toString();
        // Obtener opciones de marca de agua
        const wmSize = parseInt(document.getElementById('wmSize').value, 10); // % altura
        const wmColor = document.getElementById('wmColor').value;
        const wmAlphaSlider = document.getElementById('wmAlpha');
        // Invertir el valor: 100% = opaco, 10% = transparente
        const wmAlpha = (parseInt(wmAlphaSlider.value, 10)) / 100;
        const wmFont = document.getElementById('wmFont').value;
        const wmPos = document.getElementById('wmPos').value;
        // Calcular posición
        const fontSize = Math.floor(height * (wmSize / 100));
        let x, y, align, baseline;
        switch (wmPos) {
          case 'br': // inferior derecha
            x = width - 15; y = height - 15; align = 'right'; baseline = 'bottom'; break;
          case 'bl': // inferior izquierda
            x = 15; y = height - 15; align = 'left'; baseline = 'bottom'; break;
          case 'tr': // superior derecha
            x = width - 15; y = 15 + fontSize; align = 'right'; baseline = 'top'; break;
          case 'tl': // superior izquierda
            x = 15; y = 15 + fontSize; align = 'left'; baseline = 'top'; break;
        }
        ctx.save();
        ctx.font = `${fontSize}px ${wmFont}`;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;
        ctx.globalAlpha = wmAlpha;
        ctx.fillStyle = wmColor;
        ctx.fillText(numero, x, y);
        ctx.globalAlpha = 1;
        // ctx.strokeStyle = '#fff';
        // ctx.lineWidth = 2;
        // ctx.strokeText(numero, x, y);
        ctx.restore();

        // Mostrar la imagen resultante
        const resultImg = document.createElement('img');
        resultImg.src = canvas.toDataURL('image/png');
        resultImg.className = 'preview-img';
        // Al hacer click, abrir la imagen en tamaño completo en una nueva ventana
        resultImg.addEventListener('click', () => {
          const win = window.open();
          win.document.write('<img src="' + resultImg.src + '" style="max-width:100vw;max-height:100vh;display:block;margin:auto;">');
        });
        previewContainer.appendChild(resultImg);
        processedImages.push(canvas.toDataURL('image/png'));
        tempCanvases.push(canvas);
      }
      // Habilitar descarga y generación de PDF
      downloadBtn.disabled = false;
      document.getElementById('printPdfBtn').disabled = false;
      // Guardar las imágenes procesadas para descarga
      window.processedImages = processedImages;
    });
  });

  downloadBtn.addEventListener('click', async () => {
    if (!window.processedImages || window.processedImages.length === 0) return;
    // Obtener opciones de salida
    const outWidth = parseInt(document.getElementById('outWidth').value, 10);
    const outHeight = parseInt(document.getElementById('outHeight').value, 10);
    const outFormat = document.getElementById('outFormat').value;
    // Verificar si JSZip está disponible
    if (typeof JSZip === 'undefined') {
      alert('Para descargar como ZIP, primero incluye JSZip en tu proyecto.');
      return;
    }
    const zip = new JSZip();
    for (let idx = 0; idx < window.processedImages.length; idx++) {
      const dataUrl = window.processedImages[idx];
      // Crear imagen temporal
      const img = new window.Image();
      img.src = dataUrl;
      await new Promise(res => { img.onload = res; });
      // Redimensionar a tamaño final
      const canvas = document.createElement('canvas');
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, outWidth, outHeight);
      // Exportar en formato seleccionado
      let ext = outFormat;
      let mime = 'image/png';
      if (outFormat === 'jpeg') { mime = 'image/jpeg'; ext = 'jpg'; }
      if (outFormat === 'webp') { mime = 'image/webp'; ext = 'webp'; }
      const outDataUrl = canvas.toDataURL(mime);
      // Obtener nombre original de la imagen superior usada en la recombinación
      let origName = images[idx]?.name || `imagen_${idx+1}`;
      origName = origName.replace(/\.[^.]+$/, ''); // quitar extensión
      const finalName = `${origName}_${idx+1}.${ext}`;
      // Convertir dataURL a blob
      const arr = outDataUrl.split(',');
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--){
        u8arr[n] = bstr.charCodeAt(n);
      }
      zip.file(finalName, new Blob([u8arr], {type: mime}));
    }
    const content = await zip.generateAsync({type: 'blob'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `imagenes_procesadas.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // Actualizar valores de sliders en tiempo real
  document.getElementById('wmSize').addEventListener('input', function() {
    document.getElementById('wmSizeVal').textContent = this.value;
  });
  document.getElementById('wmAlpha').addEventListener('input', function() {
    document.getElementById('wmAlphaVal').textContent = this.value;
  });

  // Vincular ancho y alto final a la relación de aspecto seleccionada
  function updateLinkedDimensions(changed) {
    const aspectValue = document.getElementById('aspectRatio').value;
    const [aspectW, aspectH] = aspectValue.split(':').map(Number);
    const ratio = aspectW / aspectH;
    const outWidthInput = document.getElementById('outWidth');
    const outHeightInput = document.getElementById('outHeight');
    if (changed === 'width') {
      outHeightInput.value = Math.round(outWidthInput.value / ratio);
    } else if (changed === 'height') {
      outWidthInput.value = Math.round(outHeightInput.value * ratio);
    }
  }
  document.getElementById('outWidth').addEventListener('input', function() {
    updateLinkedDimensions('width');
  });
  document.getElementById('outHeight').addEventListener('input', function() {
    updateLinkedDimensions('height');
  });
  document.getElementById('aspectRatio').addEventListener('change', function() {
    // Al cambiar la relación de aspecto, recalcular el alto en base al ancho actual
    updateLinkedDimensions('width');
  });

  // Constantes para tamaños de papel en mm
const PAPER_SIZES = {
    a4: { width: 210, height: 297 },
    a3: { width: 297, height: 420 }
};

// Función para calcular la distribución de imágenes en la página
function calculateLayout(images, paperSize, orientation, margin, spacing) {
    if (!images || images.length === 0) {
        throw new Error('No hay imágenes para calcular el layout');
    }

    const paper = PAPER_SIZES[paperSize];
    const pageWidth = orientation === 'landscape' ? paper.height : paper.width;
    const pageHeight = orientation === 'landscape' ? paper.width : paper.height;
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);

    // Obtener dimensiones de la primera imagen como referencia
    const aspectRatio = images[0].width / images[0].height;
    
    // Calcular cuántas imágenes caben por fila y columna
    let imagesPerRow = 1;
    let imagesPerCol = 1;
    let imageWidth = usableWidth;
    let imageHeight = imageWidth / aspectRatio;

    // Ajustar tamaño para que quepan más imágenes si es posible
    while ((imageWidth - spacing) / 2 >= imageHeight) {
        imagesPerRow++;
        imageWidth = (usableWidth - (spacing * (imagesPerRow - 1))) / imagesPerRow;
        imageHeight = imageWidth / aspectRatio;
    }

    while ((imageHeight - spacing) / 2 >= imageHeight) {
        imagesPerCol++;
        imageHeight = (usableHeight - (spacing * (imagesPerCol - 1))) / imagesPerCol;
        imageWidth = imageHeight * aspectRatio;
    }

    return {
        imagesPerPage: imagesPerRow * imagesPerCol,
        imagesPerRow,
        imagesPerCol,
        imageWidth,
        imageHeight,
        totalPages: Math.ceil(images.length / (imagesPerRow * imagesPerCol))
    };
}

// Función para generar el PDF
async function generatePDF() {
    if (!window.processedImages || window.processedImages.length === 0) {
        console.error('No hay imágenes procesadas');
        return;
    }

    const paperSize = document.getElementById('paperSize').value;
    const printLayout = document.getElementById('printLayout').value;
    const margin = parseInt(document.getElementById('printMargin').value);
    const spacing = parseInt(document.getElementById('printSpacing').value);
    
    // Crear el PDF con el tamaño y orientación correctos
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: printLayout,
        unit: 'mm',
        format: paperSize.toUpperCase()
    });

    // Obtener las dimensiones de la primera imagen
    const img = new Image();
    await new Promise((resolve) => {
        img.onload = resolve;
        img.src = window.processedImages[0];
    });
    
    // Crear array de imágenes con las dimensiones correctas
    const images = window.processedImages.map(() => ({
        width: img.width,
        height: img.height
    }));
    const layout = calculateLayout(images, paperSize, printLayout, margin, spacing);

    let currentPage = 0;
    for (let i = 0; i < window.processedImages.length; i++) {
        const pageX = i % layout.imagesPerRow;
        const pageY = Math.floor((i % layout.imagesPerPage) / layout.imagesPerRow);
        
        if (i > 0 && i % layout.imagesPerPage === 0) {
            doc.addPage();
            currentPage++;
        }

        const x = margin + (pageX * (layout.imageWidth + spacing));
        const y = margin + (pageY * (layout.imageHeight + spacing));

        // Usar la imagen procesada directamente
        const imgData = window.processedImages[i];
        doc.addImage(imgData, 'JPEG', x, y, layout.imageWidth, layout.imageHeight);
    }

    // Guardar el PDF
    doc.save('golem_de_papel_impresion.pdf');
}

// Agregar event listener para el nuevo botón
document.getElementById('printPdfBtn').addEventListener('click', generatePDF);

// Actualizar el estado del botón de PDF cuando se procesen las imágenes
function updatePrintButton() {
    const printPdfBtn = document.getElementById('printPdfBtn');
    const previewContainer = document.getElementById('previewContainer');
    printPdfBtn.disabled = !previewContainer.hasChildNodes();
}

// Agregar la actualización del botón de PDF a la función existente de procesamiento
async function processImages() {
    // ... código existente de processImages ...
    
    updatePrintButton(); // Agregar esta línea al final de la función
}
  /*
  // Botón de modo oscuro/claro
  const toggleDark = document.getElementById('toggleDark');
  toggleDark.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    console.log('Estado actual:', isDark ? 'oscuro' : 'claro');
    setDarkMode(!isDark);
    console.log('Nuevo estado:', !isDark ? 'oscuro' : 'claro');
  });
  */
});
