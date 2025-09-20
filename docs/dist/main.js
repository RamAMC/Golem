(function () {
  'use strict';

  // From docs/js/constants.js
  const PAPER_SIZES = {
    a4: { width: 210, height: 297 },
    a3: { width: 297, height: 420 },
    Sa3: { width: 329, height: 483 }
  };
  const DOM = {
    toggleDark: document.getElementById('toggleDark'),
    warningMessage: document.getElementById('warningMessage'),
    initialPreviewContainer: document.getElementById('initialPreviewContainer'),
    resultsSection: document.getElementById('resultsSection'),
    previewContainer: document.getElementById('previewContainer'),
    fileInput: document.getElementById('fileInput'),
    aspectRatioSelect: document.getElementById('aspectRatio'),
    processBtn: document.getElementById('processBtn'),
    videoContainer: document.getElementById('videoContainer'),
    videoControls: document.getElementById('videoControls'),
    video: document.getElementById('video'),
    playBtn: document.getElementById('playBtn'),
    startSlider: document.getElementById('startSlider'),
    endSlider: document.getElementById('endSlider'),
    startLabel: document.getElementById('startLabel'),
    endLabel: document.getElementById('endLabel'),
    frameCount: document.getElementById('frameCount'),
    extractBtn: document.getElementById('extractBtn'),
    downloadFramesBtn: document.getElementById('downloadFramesBtn'),
    rangeDuration: document.getElementById('rangeDuration'),
    actualTime: document.getElementById('actualTime'),
    timelineRuler: document.getElementById('timelineRuler'),
    timelineTicks: document.getElementById('timelineTicks'),
    timelineRange: document.getElementById('timelineRange'),
    enableWm: document.getElementById('enableWm'),
    wmControlsContainer: document.getElementById('watermarkControls'),
    wmPreviewCanvas: document.getElementById('wmPreview'),
    wmSize: document.getElementById('wmSize'),
    wmSizeVal: document.getElementById('wmSizeVal'),
    wmAlpha: document.getElementById('wmAlpha'),
    wmAlphaVal: document.getElementById('wmAlphaVal'),
    wmColor: document.getElementById('wmColor'),
    savedWmColor: document.getElementById('wmColor').value,
    wmFont: document.getElementById('wmFont'),
    wmPos: document.getElementById('wmPos'),
    downloadBtn: document.getElementById('downloadBtn'),
    printPdfBtn: document.getElementById('printPdfBtn'),
    outFormat: document.getElementById('outFormat'),
    outWidthInput: document.getElementById('outWidth'),
    outHeightInput: document.getElementById('outHeight'),
    outWidthMmInput: document.getElementById('outWidthMm'),
    outHeightMmInput: document.getElementById('outHeightMm'),
    pdfLayoutPreviewCanvas: document.getElementById('pdfLayoutPreview'),
    pdfPaperSizeLabel: document.getElementById('pdfPaperSizeLabel'),
    pdfWidthLabel: document.getElementById('pdfWidthLabel'),
    pdfHeightLabel: document.getElementById('pdfHeightLabel'),
    paperSize: document.getElementById('paperSize'),
    printLayout: document.getElementById('printLayout'),
    printMargin: document.getElementById('printMargin'),
    printSpacing: document.getElementById('printSpacing'),
    bleedCheckbox: document.getElementById('bleedCheckbox'),
  };

  // From docs/js/utils.js
  function calculateLayout(imageWidth, imageHeight, paperConfig, orientation, margin, spacing) {
    if (!imageWidth || imageWidth <= 0 || !imageHeight || imageHeight <= 0) {
      return { imagesPerPage: 0, imagesPerRow: 0, imagesPerCol: 0, margin, spacing };
    }
    const pageWidth = orientation === 'landscape' ? paperConfig.height : paperConfig.width;
    const pageHeight = orientation === 'landscape' ? paperConfig.width : paperConfig.height;
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);
    if (imageWidth > usableWidth || imageHeight > usableHeight) {
      return { imagesPerPage: 0, imagesPerRow: 0, imagesPerCol: 0, margin, spacing };
    }
    const imagesPerRow = Math.floor((usableWidth + spacing) / (imageWidth + spacing));
    const imagesPerCol = Math.floor((usableHeight + spacing) / (imageHeight + spacing));
    return {
      imagesPerPage: imagesPerRow * imagesPerCol,
      imagesPerRow,
      imagesPerCol,
      margin,
      spacing
    };
  }
  function getBleedConfig(imageWidth, imageHeight, printSpacing, bleedEnabled) {
    if (isNaN(imageWidth) || isNaN(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
      return { bleed: 0, minSpacing: 1 };
    }
    const desiredBleed = 2;
    const minSpacing = desiredBleed * 2 + 1;
    const spaceBleed = Math.max(0, (printSpacing / 2) - 0.5);
    const bleed = bleedEnabled ? Math.min(desiredBleed, spaceBleed) : 0;
    return { bleed, minSpacing };
  }
  function getWatermarkStyles(settings, width, height) {
    const { wmSize, wmColor, wmAlpha, wmFont, wmPos } = settings;
    const fontSize = Math.floor(height * (wmSize / 100));
    let x, y, align, baseline;
    const padding = width < 100 ? 5 : 15;
    switch (wmPos) {
      case 'br': x = width - padding; y = height - padding; align = 'right'; baseline = 'bottom'; break;
      case 'bl': x = padding; y = height - padding; align = 'left'; baseline = 'bottom'; break;
      case 'tr': x = width - padding; y = padding; align = 'right'; baseline = 'top'; break;
      case 'tl': x = padding; y = padding; align = 'left'; baseline = 'top'; break;
    }
    return {
      font: `${fontSize}px ${wmFont}`,
      textAlign: align,
      textBaseline: baseline,
      globalAlpha: wmAlpha / 100,
      fillStyle: wmColor,
      x,
      y
    };
  }

  // From docs/js/state.js
  const state = {
    sourceFiles: [],
    processedImages: [],
    processedAspectRatio: null,
    videoState: {
      isPlaying: false,
      startTime: 0,
      endTime: 0,
      duration: 0,
    },
  };
  function setSourceFiles(files) {
    state.sourceFiles = files;
  }
  function clearSourceFiles() {
    state.sourceFiles.forEach(file => {
      if (file.src && file.src.startsWith('blob:')) {
        URL.revokeObjectURL(file.src);
      }
    });
    state.sourceFiles = [];
  }
  function setProcessedImages(images) {
    state.processedImages = images;
  }
  function clearProcessedImages() {
    state.processedImages = [];
  }
  function setProcessedAspectRatio(aspectRatio) {
    state.processedAspectRatio = aspectRatio;
  }
  function setVideoState(newState) {
    Object.assign(state.videoState, newState);
  }
  function resetVideoState() {
    state.videoState = {
      isPlaying: false,
      startTime: 0,
      endTime: 0,
      duration: 0,
    };
  }

  // From docs/js/dark-mode.js
  function applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
  function initializeDarkMode(onThemeChange) {
    const toggle = document.getElementById('toggleDark');
    if (!toggle) return;
    const userTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isInitiallyDark = userTheme === 'dark' || (!userTheme && systemPrefersDark);
    applyTheme(isInitiallyDark);
    toggle.checked = isInitiallyDark;
    toggle.addEventListener('change', (e) => {
      applyTheme(e.target.checked);
      if (onThemeChange) {
        onThemeChange();
      }
    });
  }

  // From docs/js/i18n.js (Modified)
  const i18n_resources = {
    es: {
      translation: {
        "header": {
          "tagline": "Convierte tus videos e imágenes en un folioscopio!"
        },
        "howItWorks": {
          "title": "¿Cómo funciona?",
          "step1_title": "Carga tus archivos:",
          "step1_li1": "Imágenes:",
          "step1_li1_detail": "Carga todas las que necesites. Se ordenarán automáticamente por nombre.",
          "step1_li2": "Vídeo:",
          "step1_li2_detail": "Selecciona un fragmento y extrae los fotogramas que desees.",
          "step1_li3": "Puedes descargar las imágenes extraídas en un ZIP antes de seguir.",
          "step2_title": "Define el recorte:",
          "step2_detail": "Elige una relación de aspecto para asegurar que todas las imágenes tengan un formato consistente.",
          "step3_title": "Agrega numeración (Opcional):",
          "step3_detail": "Activa la marca de agua para añadir un número a cada imagen. Personaliza tamaño, opacidad, color, fuente y posición.",
          "step4_title": "Procesa las imágenes:",
          "step4_detail": "Haz clic en \"Procesar\" para aplicar los cambios. Verás el resultado en la galería inferior.",
          "step5_title": "Exporta los archivos:",
          "step5_li1": "ZIP:",
          "step5_li1_detail": "Elige el formato (JPG, PNG, WebP) y el tamaño en píxeles (px) y descarga.",
          "step5_li2": "PDF:",
          "step5_li2_detail": "Elige el tamaño en milímetros (mm) que tendrán las imágenes en el papel.",
          "step5_li3": "Elige el tamaño del papel, la orientación y los márgenes. Podrás ver el resultado en la vista previa del layout."
        },
        "footer": {
          "copyright": "&copy; 2025 Golem de Papel. Todos los derechos reservados.",
          "madeWith": "Hecho con ❤️ ",
          "supportMe": " - Si te gusta, considera apoyarnos"
        },
        "step1": {
          "title": "Carga y Configuración",
          "upload_label": "Carga tus imágenes o video:",
          "aspect_ratio_label": "Define la relación de aspecto:",
          "aspect_ratio_tooltip": "Todas las imágenes se recortarán a esta proporción para mantener un formato consistente. El recorte se hace desde el centro.",
          "aspect_ratio_square": "1:1 (Cuadrado)",
          "aspect_ratio_classic": "4:3 (Clásico)",
          "aspect_ratio_photo": "3:2 (Foto)",
          "aspect_ratio_panoramic": "16:9 (Panorámico)",
          "warning_message_line1": "La relación de aspecto actual es distinta a la usada en las imágenes procesadas.",
          "warning_message_line2": "Reprocesa o ajusta la relación para habilitar la descarga.",
          "video_unsupported": "Tu navegador no soporta la reproducción de video.",
          "range_label": "Rango de extracción:",
          "current_time_label": "Tiempo Actual:",
          "start_label": "Inicio:",
          "end_label": "Fin:",
          "play_range_button": "Reproducir rango",
          "extract_count_label": "Imágenes a extraer:",
          "extract_button": "Extraer imágenes",
          "extract_progress": "(0%)",
          "download_frames_tooltip": "Descarga las imágenes extraídas sin procesar"
        },
        "step2": {
          "title": "Numeración",
          "enable_label": "Habilitar secuencia numérica (Opcional)",
          "size_label": "Tamaño (% altura):",
          "opacity_label": "Opacidad:",
          "color_label": "Color:",
          "font_label": "Fuente:",
          "position_label": "Posición:",
          "pos_br": "Inferior dcha.",
          "pos_bl": "Inferior izq.",
          "pos_tr": "Superior dcha.",
          "pos_tl": "Superior izq."
        },
        "process": {
          "button": "Procesar Imágenes",
          "loader": "Procesando..."
        },
        "results": {
          "title": "Resultados"
        },
        "export": {
          "title": "Exportar",
          "zip_title": "Descargar como ZIP",
          "format_label": "Formato:",
          "size_px_label": "Tamaño (px):",
          "zip_button": "Descargar ZIP",
          "zip_loader": "Descargando...",
          "pdf_title": "Generar PDF para Imprimir",
          "size_mm_label": "Tamaño (mm):",
          "paper_label": "Papel:",
          "layout_label": "Disposición:",
          "layout_portrait": "Vertical",
          "layout_landscape": "Horizontal",
          "margin_label": "Margen (mm):",
          "spacing_label": "Espacio (mm):",
          "spacing_tooltip": "Define el espacio en milímetros que habrá entre cada imagen en la hoja del PDF.",
          "pdf_button": "Generar PDF",
          "pdf_loader": "Generando...",
          "bleed_label": "Sangrado",
          "bleed_tooltip": "Añade un borde extra a las imágenes para evitar filos blancos al cortar. Si el sangrado está activado el espaciado tendrá un mínimo que permita verlo."
        }
      }
    },
    en: {
      translation: {
        "header": {
          "tagline": "Turn your videos and images into a flipbook!"
        },
        "howItWorks": {
          "title": "How does it work?",
          "step1_title": "Upload your files:",
          "step1_li1": "Images:",
          "step1_li1_detail": "Upload as many as you need. They will be automatically sorted by name.",
          "step1_li2": "Video:",
          "step1_li2_detail": "Select a fragment and extract the frames you want.",
          "step1_li3": "You can download the extracted images in a ZIP before continuing.",
          "step2_title": "Define the crop:",
          "step2_detail": "Choose an aspect ratio to ensure all images have a consistent format.",
          "step3_title": "Add numbering (Optional):",
          "step3_detail": "Enable the watermark to add a number to each image. Customize size, opacity, color, font, and position.",
          "step4_title": "Process the images:",
          "step4_detail": "Click \"Process\" to apply the changes. You will see the result in the gallery below.",
          "step5_title": "Export the files:",
          "step5_li1": "ZIP:",
          "step5_li1_detail": "Choose the format (JPG, PNG, WebP) and size in pixels (px) and download.",
          "step5_li2": "PDF:",
          "step5_li2_detail": "Choose the size in millimeters (mm) that the images will have on paper.",
          "step5_li3": "Choose the paper size, orientation, and margins. You will be able to see the result in the layout preview."
        },
        "footer": {
          "copyright": "&copy; 2025 Golem de Papel. All rights reserved.",
          "madeWith": "Made with ❤️ ",
          "supportMe": " - If you like it, consider supporting us"
        },
        "step1": {
          "title": "Upload and Configuration",
          "upload_label": "Upload your images or video:",
          "aspect_ratio_label": "Define the aspect ratio:",
          "aspect_ratio_tooltip": "All images will be cropped to this ratio to maintain a consistent format. Cropping is done from the center.",
          "aspect_ratio_square": "1:1 (Square)",
          "aspect_ratio_classic": "4:3 (Classic)",
          "aspect_ratio_photo": "3:2 (Photo)",
          "aspect_ratio_panoramic": "16:9 (Widescreen)",
          "warning_message_line1": "The current aspect ratio is different from the one used in the processed images.",
          "warning_message_line2": "Reprocess or adjust the ratio to enable download.",
          "video_unsupported": "Your browser does not support the video tag.",
          "range_label": "Extraction range:",
          "current_time_label": "Current Time:",
          "start_label": "Start:",
          "end_label": "End:",
          "play_range_button": "Play range",
          "extract_count_label": "Images to extract:",
          "extract_button": "Extract images",
          "extract_progress": "(0%)",
          "download_frames_tooltip": "Download the extracted raw frames"
        },
        "step2": {
          "title": "Numbering",
          "enable_label": "Enable numeric sequence (Optional)",
          "size_label": "Size (% height):",
          "opacity_label": "Opacity:",
          "color_label": "Color:",
          "font_label": "Font:",
          "position_label": "Position:",
          "pos_br": "Bottom right",
          "pos_bl": "Bottom left",
          "pos_tr": "Top right",
          "pos_tl": "Top left"
        },
        "process": {
          "button": "Process Images",
          "loader": "Processing..."
        },
        "results": {
          "title": "Results"
        },
        "export": {
          "title": "Export",
          "zip_title": "Download as ZIP",
          "format_label": "Format:",
          "size_px_label": "Size (px):",
          "zip_button": "Download ZIP",
          "zip_loader": "Downloading...",
          "pdf_title": "Generate PDF for Printing",
          "size_mm_label": "Size (mm):",
          "paper_label": "Paper:",
          "layout_label": "Layout:",
          "layout_portrait": "Portrait",
          "layout_landscape": "Landscape",
          "margin_label": "Margin (mm):",
          "spacing_label": "Spacing (mm):",
          "spacing_tooltip": "Defines the space in millimeters between each image on the PDF sheet.",
          "pdf_button": "Generate PDF",
          "pdf_loader": "Generating...",
          "bleed_label": "Bleed",
          "bleed_tooltip": "Adds an extra border to the images to avoid white edges when cutting. If bleed is enabled, the spacing will have a minimum that allows you to see it."
        }
      }
    }
  };
  function updateContent() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.innerHTML = i18next.t(key);
    });
    document.documentElement.lang = i18next.language;
  }
  const languageDetectorOptions = {
    order: ['localStorage', 'navigator'],
    lookupLocalStorage: 'i18nextLng',
    caches: ['localStorage'],
  };
  async function initializeI18n() {
    const languageDetector = new window.i18nextBrowserLanguageDetector(null, languageDetectorOptions);
    await i18next
      .use(languageDetector)
      .init({
        debug: true,
        supportedLngs: ['es', 'en'],
        fallbackLng: 'es',
        resources: i18n_resources,
        detection: languageDetectorOptions,
      });
    const langEs = document.getElementById('lang-es');
    const langEn = document.getElementById('lang-en');
    const updateActiveLanguageUI = () => {
      const currentLang = i18next.language;
      if (currentLang.startsWith('es')) {
        langEs.classList.add('lang-active');
        langEn.classList.remove('lang-active');
      } else {
        langEn.classList.add('lang-active');
        langEs.classList.remove('lang-active');
      }
    };
    updateContent();
    updateActiveLanguageUI();
    langEs.addEventListener('click', () => {
      if (!i18next.language.startsWith('es')) {
        i18next.changeLanguage('es');
      }
    });
    langEn.addEventListener('click', () => {
      if (!i18next.language.startsWith('en')) {
        i18next.changeLanguage('en');
      }
    });
    i18next.on('languageChanged', () => {
      updateContent();
      updateActiveLanguageUI();
    });
  }

  // From docs/js/image-processor.js
  function applyWatermark(ctx, width, height, text) {
    const settings = {
      wmSize: parseInt(DOM.wmSize.value, 10),
      wmColor: DOM.wmColor.value,
      wmAlpha: parseInt(DOM.wmAlpha.value, 10),
      wmFont: DOM.wmFont.value,
      wmPos: DOM.wmPos.value,
    };
    const styles = getWatermarkStyles(settings, width, height);
    ctx.save();
    Object.assign(ctx, styles);
    ctx.fillText(text, styles.x, styles.y);
    ctx.restore();
  }
  function loadImages(sourceFiles) {
    return Promise.all(sourceFiles.map(imgObj => {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imgObj.src;
      });
    }));
  }
  function determineCropDimensions(imgElements, targetAspect) {
    const minWidth = Math.min(...imgElements.map(img => img.naturalWidth));
    const minHeight = Math.min(...imgElements.map(img => img.naturalHeight));
    let cropWidth = minWidth;
    let cropHeight = Math.round(cropWidth / targetAspect);
    if (cropHeight > minHeight) {
      cropHeight = minHeight;
      cropWidth = Math.round(cropHeight * targetAspect);
    }
    return { cropWidth, cropHeight };
  }
  function cropImages(imgElements, cropWidth, cropHeight) {
    return imgElements.map(img => {
      const sx = Math.floor((img.naturalWidth - cropWidth) / 2);
      const sy = Math.floor((img.naturalHeight - cropHeight) / 2);
      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      return canvas;
    });
  }
  function combineAndWatermark(croppedCanvases, cropWidth, cropHeight) {
    const finalImagesDataUrls = [];
    const halfHeight = Math.floor(cropHeight / 2);
    for (let i = 0; i < croppedCanvases.length; i++) {
      const imgTopCanvas = croppedCanvases[i];
      const imgBottomCanvas = croppedCanvases[(i + 1) % croppedCanvases.length];
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = cropWidth;
      finalCanvas.height = cropHeight;
      const ctx = finalCanvas.getContext('2d');
      ctx.drawImage(imgTopCanvas, 0, 0, cropWidth, halfHeight, 0, 0, cropWidth, halfHeight);
      ctx.drawImage(imgBottomCanvas, 0, halfHeight, cropWidth, cropHeight - halfHeight, 0, halfHeight, cropWidth, cropHeight - halfHeight);
      if (DOM.enableWm.checked) {
        applyWatermark(ctx, cropWidth, cropHeight, (i + 1).toString());
      }
      finalImagesDataUrls.push(finalCanvas.toDataURL('image/png'));
    }
    return finalImagesDataUrls;
  }
  async function processImages() {
    const sourceImages = state.sourceFiles;
    if (sourceImages.length === 0) return [];
    const [aspectW, aspectH] = DOM.aspectRatioSelect.value.split(':').map(Number);
    const targetAspect = aspectW / aspectH;
    const imgElements = await loadImages(sourceImages);
    const { cropWidth, cropHeight } = determineCropDimensions(imgElements, targetAspect);
    const croppedCanvases = cropImages(imgElements, cropWidth, cropHeight);
    const finalImagesDataUrls = combineAndWatermark(croppedCanvases, cropWidth, cropHeight);
    return finalImagesDataUrls;
  }
  async function createBleedImage(imageSrc, imgWidth, imgHeight, bleed) {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageSrc;
    });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const originalWidth = img.width;
    const originalHeight = img.height;
    const targetPdfRectWidth = imgWidth + bleed * 2;
    const targetPdfRectHeight = imgHeight + bleed * 2;
    const targetAspectRatio = targetPdfRectWidth / targetPdfRectHeight;
    const bleedX = Math.round((bleed / imgWidth) * originalWidth);
    const canvasWidth = originalWidth + bleedX * 2;
    const canvasHeight = Math.round(canvasWidth / targetAspectRatio);
    const bleedY = Math.round((canvasHeight - originalHeight) / 2);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.drawImage(img, bleedX, bleedY, originalWidth, originalHeight);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(img, 0, 0, originalWidth, 1, bleedX, 0, originalWidth, bleedY);
    ctx.drawImage(img, 0, originalHeight - 1, originalWidth, 1, bleedX, originalHeight + bleedY, originalWidth, bleedY);
    ctx.drawImage(img, 0, 0, 1, originalHeight, 0, bleedY, bleedX, originalHeight);
    ctx.drawImage(img, originalWidth - 1, 0, 1, originalHeight, originalWidth + bleedX, bleedY, bleedX, originalHeight);
    ctx.drawImage(img, 0, 0, 1, 1, 0, 0, bleedX, bleedY);
    ctx.drawImage(img, originalWidth - 1, 0, 1, 1, originalWidth + bleedX, 0, bleedX, bleedY);
    ctx.drawImage(img, 0, originalHeight - 1, 1, 1, 0, originalHeight + bleedY, bleedX, bleedY);
    ctx.drawImage(img, originalWidth - 1, originalHeight - 1, 1, 1, originalWidth + bleedX, originalHeight + bleedY, bleedX, bleedY);
    ctx.globalAlpha = 1.0;
    return canvas.toDataURL('image/png');
  }

  // From docs/js/ui.js
  function showLoader(button) {
    const textElement = button.querySelector('.button-text');
    const loaderElement = button.querySelector('.button-loader');
    if (textElement) textElement.classList.add('hidden');
    if (loaderElement) loaderElement.classList.remove('hidden');
    button.disabled = true;
  }
  function hideLoader(button) {
    const textElement = button.querySelector('.button-text');
    const loaderElement = button.querySelector('.button-loader');
    if (textElement) textElement.classList.remove('hidden');
    if (loaderElement) loaderElement.classList.add('hidden');
    button.disabled = false;
  }
  function drawWatermark(ctx, text, styles) {
    ctx.save();
    Object.assign(ctx, styles);
    ctx.fillText(text, styles.x, styles.y);
    ctx.restore();
  }
  function drawPreviewBackground(ctx, width, height) {
    const isDarkMode = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDarkMode ? '#44403c' : '#d6d3d1';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = isDarkMode ? '#a8a29e' : '#78716c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '18px Shadows Into Light, cursive';
    ctx.fillText('Preview', width / 2, height / 2);
  }
  function updateWatermarkPreview() {
    const [aspectW, aspectH] = DOM.aspectRatioSelect.value.split(':').map(Number);
    const canvasH = 150;
    const canvasW = Math.round(canvasH * (aspectW / aspectH));
    DOM.wmPreviewCanvas.width = canvasW;
    DOM.wmPreviewCanvas.height = canvasH;
    const ctx = DOM.wmPreviewCanvas.getContext('2d');
    drawPreviewBackground(ctx, canvasW, canvasH);
    if (!DOM.enableWm.checked) return;
    const settings = {
      wmSize: parseInt(DOM.wmSize.value, 10),
      wmColor: DOM.wmColor.value,
      wmAlpha: parseInt(DOM.wmAlpha.value, 10),
      wmFont: DOM.wmFont.value,
      wmPos: DOM.wmPos.value,
    };
    const styles = getWatermarkStyles(settings, canvasW, canvasH);
    drawWatermark(ctx, '1', styles);
  }
  const MAX_PREVIEW_DIMENSION = 170;
  function getPdfPreviewDimensions(paper, orientation) {
    const paperW_mm = orientation === 'landscape' ? paper.height : paper.width;
    const paperH_mm = orientation === 'landscape' ? paper.width : paper.height;
    const aspectRatio = paperW_mm / paperH_mm;
    let canvasW, canvasH;
    if (aspectRatio > 1) {
      canvasW = MAX_PREVIEW_DIMENSION;
      canvasH = canvasW / aspectRatio;
    } else {
      canvasH = MAX_PREVIEW_DIMENSION;
      canvasW = canvasH * aspectRatio;
    }
    return { canvasW, canvasH, paperW_mm, paperH_mm };
  }
  function drawPdfPaper(ctx, width, height) {
    const isDarkMode = document.documentElement.classList.contains('dark');
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = isDarkMode ? '#9c9a96ff' : '#d4d4d4ff';
    ctx.strokeStyle = isDarkMode ? '#636262ff' : '#8f8e8eff';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
    ctx.fillRect(0, 0, width, height);
  }
  function drawPdfImagePlaceholders(ctx, layout, paperW_mm, canvasW) {
    const scale = canvasW / paperW_mm;
    const margin_px = layout.margin * scale;
    const spacing_px = layout.spacing * scale;
    const imgW_px = layout.imageWidth * scale;
    const imgH_px = layout.imageHeight * scale;
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
  }
  function drawPdfInfoText(ctx, text, width) {
    ctx.fillStyle = '#17202A';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, 15);
  }
  function updatePdfLayoutPreview() {
    const paper = PAPER_SIZES[DOM.paperSize.value];
    const orientation = DOM.printLayout.value;
    const { canvasW, canvasH, paperW_mm, paperH_mm } = getPdfPreviewDimensions(paper, orientation);
    DOM.pdfLayoutPreviewCanvas.width = canvasW;
    DOM.pdfLayoutPreviewCanvas.height = canvasH;
    DOM.pdfPaperSizeLabel.textContent = DOM.paperSize.value.toUpperCase();
    DOM.pdfWidthLabel.textContent = `${paperW_mm.toFixed(0)}mm`;
    DOM.pdfHeightLabel.textContent = `${paperH_mm.toFixed(0)}mm`;
    const ctx = DOM.pdfLayoutPreviewCanvas.getContext('2d');
    drawPdfPaper(ctx, canvasW, canvasH);
    const imageWidth_mm = parseFloat(DOM.outWidthMmInput.value);
    const imageHeight_mm = parseFloat(DOM.outHeightMmInput.value);
    if (isNaN(imageWidth_mm) || isNaN(imageHeight_mm) || imageWidth_mm <= 0 || imageHeight_mm <= 0) {
      return;
    }
    const layout = calculateLayout(
      imageWidth_mm, imageHeight_mm, paper, orientation,
      parseInt(DOM.printMargin.value, 10), parseInt(DOM.printSpacing.value, 10)
    );
    if (layout.imagesPerPage === 0) {
      drawPdfInfoText(ctx, 'No caben', canvasW);
      return;
    }
    layout.imageWidth = imageWidth_mm;
    layout.imageHeight = imageHeight_mm;
    drawPdfImagePlaceholders(ctx, layout, paperW_mm, canvasW);
    drawPdfInfoText(ctx, `${layout.imagesPerPage} img/pág`, canvasW);
  }
  function setResultsEnabled(enabled) {
    const section = DOM.resultsSection;
    const controls = section.querySelectorAll('input, select, button');
    const labels = section.querySelectorAll('label, span');
    section.classList.toggle('opacity-50', !enabled);
    controls.forEach(control => {
      control.disabled = !enabled;
    });
    labels.forEach(label => {
      label.classList.toggle('controls-disabled', !enabled);
    });
    if (enabled) {
      setTimeout(() => {
        section.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }
  function renderProcessedImages() {
    DOM.previewContainer.innerHTML = '';
    state.processedImages.forEach(imgDataUrl => {
      const resultImg = document.createElement('img');
      resultImg.src = imgDataUrl;
      resultImg.className = 'w-full h-full object-cover rounded-md cursor-pointer';
      resultImg.addEventListener('click', () => {
        const win = window.open();
        win.document.write(`<img src="${resultImg.src}" style="max-width:100vw;max-height:100vh;display:block;margin:auto;">`);
      });
      DOM.previewContainer.appendChild(resultImg);
    });
  }
  function renderInitialPreviews() {
    DOM.initialPreviewContainer.innerHTML = '';
    state.sourceFiles.forEach(file => {
      const img = document.createElement('img');
      img.src = file.src;
      img.alt = file.name;
      img.className = "rounded-lg shadow";
      DOM.initialPreviewContainer.appendChild(img);
    });
    DOM.initialPreviewContainer.classList.toggle('hidden', state.sourceFiles.length === 0);
  }
  function checkAspectRatioMatch() {
    if (!state.processedAspectRatio) return;
    const mismatch = DOM.aspectRatioSelect.value !== state.processedAspectRatio;
    DOM.downloadBtn.disabled = mismatch;
    DOM.printPdfBtn.disabled = mismatch;
    if (mismatch) {
      DOM.warningMessage.classList.remove('hidden');
      setTimeout(() => DOM.warningMessage.classList.remove('opacity-0'), 20);
    } else {
      DOM.warningMessage.classList.add('opacity-0');
      setTimeout(() => DOM.warningMessage.classList.add('hidden'), 300);
    }
  }
  function resetUIToDefaults() {
    DOM.outFormat.value = 'png';
    DOM.outWidthInput.value = 800;
    DOM.outHeightInput.value = 800;
    DOM.outWidthMmInput.value = 80;
    DOM.outHeightMmInput.value = 80;
    DOM.paperSize.value = 'a4';
    DOM.printLayout.value = 'portrait';
    DOM.printMargin.value = 10;
    DOM.printSpacing.value = 5;
    DOM.warningMessage.classList.add('hidden', 'opacity-0');
    updateWatermarkPreview();
    updatePdfLayoutPreview();
  }
  function resetWatermarkControls() {
    DOM.enableWm.checked = true;
    DOM.wmSize.value = 8;
    DOM.wmSizeVal.textContent = 8;
    DOM.wmAlpha.value = 70;
    DOM.wmAlphaVal.textContent = 70;
    DOM.savedWmColor = '#f7f304';
    DOM.wmFont.value = 'Arial';
    DOM.wmPos.value = 'br';
  }
  function toggleWatermarkControls(enabled) {
    const controls = DOM.wmControlsContainer.querySelectorAll('input, select, button');
    const labels = DOM.wmControlsContainer.querySelectorAll('label, span');
    controls.forEach(control => {
      control.disabled = !enabled;
    });
    labels.forEach(label => {
      label.classList.toggle('controls-disabled', !enabled);
    });
    if (enabled) {
      DOM.wmColor.value = DOM.savedWmColor;
    } else {
      DOM.savedWmColor = DOM.wmColor.value;
      DOM.wmColor.value = '#999999';
    }
  }

  // From docs/js/exporters.js
  function drawCropMarks(doc, x, y, width, height, lengths) {
    const { topLen, bottomLen, leftLen, rightLen, gap } = lengths;
    const gray = 80;
    const lineWidth = 0.5 / 2.83465;
    doc.setDrawColor(gray);
    doc.setLineWidth(lineWidth);
    doc.line(x, y - gap, x, y - gap - topLen);
    doc.line(x - gap, y, x - gap - leftLen, y);
    doc.line(x + width, y - gap, x + width, y - gap - topLen);
    doc.line(x + width + gap, y, x + width + gap + rightLen, y);
    doc.line(x, y + height + gap, x, y + height + gap + bottomLen);
    doc.line(x - gap, y + height, x - gap - leftLen, y + height);
    doc.line(x + width, y + height + gap, x + width, y + height + gap + bottomLen);
    doc.line(x + width + gap, y + height, x + width + gap + rightLen, y + height);
  }
  async function generatePDF() {
    if (!state.processedImages || state.processedImages.length === 0) {
      alert('Primero debes procesar las imágenes.');
      return;
    }
    showLoader(DOM.printPdfBtn);
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      const imageWidth = parseFloat(DOM.outWidthMmInput.value);
      const imageHeight = parseFloat(DOM.outHeightMmInput.value);
      if (isNaN(imageWidth) || isNaN(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
        alert('Por favor, introduce un ancho y alto válidos en mm para el PDF.');
        return;
      }
      const paperConfig = PAPER_SIZES[DOM.paperSize.value];
      const layout = calculateLayout(
        imageWidth, imageHeight, paperConfig, DOM.printLayout.value,
        parseInt(DOM.printMargin.value, 10), parseInt(DOM.printSpacing.value, 10)
      );
      if (layout.imagesPerPage === 0) {
        alert("Las imágenes no caben en la página. Intenta con un tamaño más pequeño o reduce los márgenes.");
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: DOM.printLayout.value, unit: 'mm', format: [paperConfig.width, paperConfig.height] });
      const printMargin = parseInt(DOM.printMargin.value, 10);
      const printSpacing = parseInt(DOM.printSpacing.value, 10);
      const bleedEnabled = DOM.bleedCheckbox.checked;
      const { bleed } = getBleedConfig(imageWidth, imageHeight, printSpacing, bleedEnabled);
      const imagesToProcess = state.processedImages;
      let finalImages = imagesToProcess;
      if (bleedEnabled && bleed > 0) {
        const bleedPromises = imagesToProcess.map(src =>
          createBleedImage(src, imageWidth, imageHeight, bleed)
        );
        finalImages = await Promise.all(bleedPromises);
      }
      const gap = 2;
      const outerLength = Math.min(printMargin / 2, 4);
      const innerLength = Math.min(Math.max(0, (printSpacing / 2) - gap), 4);
      for (let i = 0; i < finalImages.length; i++) {
        const imageOnPageIndex = i % layout.imagesPerPage;
        const col = imageOnPageIndex % layout.imagesPerRow;
        const row = Math.floor(imageOnPageIndex / layout.imagesPerRow);
        const pageNumber = Math.floor(i / layout.imagesPerPage);
        const imagesOnThisPage = Math.min(layout.imagesPerPage, finalImages.length - (pageNumber * layout.imagesPerPage));
        const hasRightNeighbor = (col < layout.imagesPerRow - 1) && (imageOnPageIndex + 1 < imagesOnThisPage);
        const hasBottomNeighbor = (row < layout.imagesPerCol - 1) && (imageOnPageIndex + layout.imagesPerRow < imagesOnThisPage);
        const cropMarkLengths = {
          gap: gap,
          leftLen: col === 0 ? outerLength : innerLength,
          rightLen: hasRightNeighbor ? innerLength : outerLength,
          topLen: row === 0 ? outerLength : innerLength,
          bottomLen: hasBottomNeighbor ? innerLength : outerLength,
        };
        if (i > 0 && imageOnPageIndex === 0) doc.addPage();
        const x = layout.margin + col * (imageWidth + layout.spacing);
        const y = layout.margin + row * (imageHeight + layout.spacing);
        const imgData = finalImages[i];
        if (bleedEnabled) {
          doc.addImage(imgData, 'PNG', x - bleed, y - bleed, imageWidth + bleed * 2, imageHeight + bleed * 2);
        } else {
          doc.addImage(imgData, 'PNG', x, y, imageWidth, imageHeight);
        }
        drawCropMarks(doc, x, y, imageWidth, imageHeight, cropMarkLengths);
      }
      doc.save('golem_de_papel_impresion.pdf');
    } finally {
      hideLoader(DOM.printPdfBtn);
    }
  }
  async function downloadZip() {
    if (!state.processedImages || state.processedImages.length === 0) return;
    showLoader(DOM.downloadBtn);
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      const outWidth = parseInt(DOM.outWidthInput.value, 10);
      const outHeight = parseInt(DOM.outHeightInput.value, 10);
      const outFormat = DOM.outFormat.value;
      if (typeof JSZip === 'undefined') {
        alert('La librería JSZip no está cargada.');
        throw new Error('JSZip not loaded');
      }
      const zip = new JSZip();
      for (let idx = 0; idx < state.processedImages.length; idx++) {
        const dataUrl = state.processedImages[idx];
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
        let origName = state.sourceFiles[idx]?.name || `imagen_${idx + 1}`;
        origName = origName.replace(/\.[^.]+$/, '');
        const finalName = `${origName}_${idx + 1}.${ext}`;
        const res = await fetch(outDataUrl);
        const blob = await res.blob();
        zip.file(finalName, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = 'imagenes_procesadas.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (error) {
      console.error("Error al generar el ZIP:", error);
      alert("Hubo un problema al generar el archivo ZIP.");
    } finally {
      hideLoader(DOM.downloadBtn);
    }
  }

  // From docs/js/video-handler.js
  let videoEventListeners = [];
  function addVideoEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    videoEventListeners.push({ element, event, handler });
  }
  function cleanupVideoEventListeners() {
    videoEventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    videoEventListeners = [];
  }
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const centisecs = Math.round((seconds - Math.floor(seconds)) * 100);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}.${centisecs < 10 ? '0' : ''}${centisecs}`;
  }
  function updateRangeDuration() {
    const duration = state.videoState.endTime - state.videoState.startTime;
    DOM.rangeDuration.textContent = `${duration.toFixed(2)}s`;
  }
  function updateTimelineOverlay() {
    const { startTime, endTime, duration } = state.videoState;
    if (duration > 0) {
      const left = (startTime / duration) * 100;
      const width = ((endTime - startTime) / duration) * 100;
      DOM.timelineRange.style.left = `${left}%`;
      DOM.timelineRange.style.width = `${width}%`;
    }
  }
  function createTimelineRuler(duration) {
    DOM.timelineTicks.innerHTML = '';
    const interval = duration > 60 ? 5 : 1;
    for (let i = 0; i <= duration; i++) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      if (i % interval === 0) {
        tick.classList.add('major');
        const label = document.createElement('span');
        label.className = 'tick-label';
        label.textContent = `${i}s`;
        tick.appendChild(label);
      }
      const pos = (i / duration) * 100;
      tick.style.position = 'absolute';
      tick.style.left = `${pos}%`;
      DOM.timelineTicks.appendChild(tick);
    }
  }
  function updateActualTime() {
    if (DOM.video && !isNaN(DOM.video.currentTime)) {
      DOM.actualTime.textContent = formatTime(DOM.video.currentTime);
    }
    requestAnimationFrame(updateActualTime);
  }
  updateActualTime();
  async function captureFrame(time, canvas, ctx) {
    return new Promise((resolve) => {
      const onSeeked = () => {
        DOM.video.removeEventListener('seeked', onSeeked);
        canvas.width = DOM.video.videoWidth;
        canvas.height = DOM.video.videoHeight;
        ctx.drawImage(DOM.video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      DOM.video.addEventListener('seeked', onSeeked);
      DOM.video.currentTime = time;
    });
  }
  async function extractFrames() {
    DOM.initialPreviewContainer.classList.remove('hidden');
    if (state.videoState.isPlaying) {
      DOM.video.pause();
      DOM.playBtn.textContent = "Reproducir rango";
      setVideoState({ isPlaying: false });
    }
    const numFrames = parseInt(DOM.frameCount.value, 10);
    if (!numFrames || numFrames <= 0) {
      alert('Por favor, ingrese un número válido de frames (mínimo 1).');
      return;
    } else if (numFrames > DOM.frameCount.max) {
      alert('El número máximo de frames permitido es 500 para evitar sobrecargar el navegador.');
      return;
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const extractedFrames = [];
    DOM.extractBtn.disabled = true;
    const originalBtnText = DOM.extractBtn.querySelector('span').textContent;
    const progressSpan = DOM.extractBtn.querySelector('#extractProgress');
    try {
      for (let i = 0; i < numFrames; i++) {
        const progress = (numFrames === 1) ? 0 : i / (numFrames - 1);
        const time = state.videoState.startTime + (progress * (state.videoState.endTime - state.videoState.startTime));
        const dataUrl = await captureFrame(time, canvas, ctx);
        extractedFrames.push({ name: `frame_${i + 1}.png`, src: dataUrl });
        progressSpan.textContent = `(${(Math.round((i + 1) * 100 / numFrames))}%)`;
        progressSpan.classList.remove('hidden');
      }
      setSourceFiles(extractedFrames);
      renderInitialPreviews();
      DOM.processBtn.disabled = false;
      DOM.downloadFramesBtn.disabled = false;
    } catch (error) {
      console.error('Error extrayendo frames:', error);
      alert('Hubo un error al extraer los frames del video.');
    } finally {
      DOM.extractBtn.disabled = false;
      DOM.extractBtn.querySelector('span').textContent = originalBtnText;
      progressSpan.classList.add('hidden');
    }
  }
  async function downloadRawFrames() {
    if (state.sourceFiles.length === 0 || !state.sourceFiles[0].name.startsWith('frame_')) {
      return;
    }
    const zip = new JSZip();
    const button = DOM.downloadFramesBtn;
    const originalContent = button.innerHTML;
    button.disabled = true;
    try {
      for (const img of state.sourceFiles) {
        const imgData = img.src.split(',')[1];
        zip.file(img.name, imgData, { base64: true });
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'frames_extraidos.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creando el zip de frames:', error);
    } finally {
      button.disabled = false;
      button.innerHTML = originalContent;
    }
  }
  function initializeVideoHandler(videoFile) {
    DOM.videoContainer.classList.remove('hidden');
    setTimeout(() => {
      DOM.videoControls.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 20);
    const videoUrl = URL.createObjectURL(videoFile);
    DOM.video.src = videoUrl;
    let fpsInput = 30;
    addVideoEventListener(DOM.video, 'loadedmetadata', () => {
      const duration = DOM.video.duration;
      setVideoState({ duration, endTime: duration });
      DOM.startSlider.max = duration;
      DOM.endSlider.max = duration;
      DOM.startSlider.value = 0;
      DOM.startSlider.step = (1 / fpsInput).toFixed(2);
      DOM.endSlider.step = (1 / fpsInput).toFixed(2);
      DOM.endSlider.value = duration;
      DOM.startLabel.textContent = `${formatTime(0)}`;
      DOM.endLabel.textContent = `${formatTime(duration)}`;
      updateRangeDuration();
      createTimelineRuler(duration);
      updateTimelineOverlay();
    });
    addVideoEventListener(DOM.video, 'timeupdate', () => {
      if (state.videoState.isPlaying && DOM.video.currentTime >= state.videoState.endTime) {
        DOM.video.currentTime = state.videoState.startTime;
        DOM.video.play();
      }
    });
    addVideoEventListener(DOM.playBtn, 'click', () => {
      setVideoState({ isPlaying: !state.videoState.isPlaying });
      if (state.videoState.isPlaying) {
        if (DOM.video.currentTime < state.videoState.startTime || DOM.video.currentTime >= state.videoState.endTime) {
          DOM.video.currentTime = state.videoState.startTime;
        }
        DOM.video.play();
        DOM.playBtn.textContent = "Pausar";
      } else {
        DOM.video.pause();
        DOM.playBtn.textContent = "Reproducir rango";
      }
    });
    addVideoEventListener(DOM.startSlider, 'input', () => {
      let start = parseFloat(DOM.startSlider.value);
      let end = parseFloat(DOM.endSlider.value);
      if (start > end) {
        DOM.endSlider.value = start;
        end = start;
      }
      setVideoState({ startTime: start, endTime: end });
      DOM.startLabel.textContent = `${formatTime(start)}`;
      DOM.endLabel.textContent = `${formatTime(end)}`;
      updateRangeDuration();
      updateTimelineOverlay();
    });
    addVideoEventListener(DOM.endSlider, 'input', () => {
      let start = parseFloat(DOM.startSlider.value);
      let end = parseFloat(DOM.endSlider.value);
      if (end < start) {
        DOM.startSlider.value = end;
        start = end;
      }
      setVideoState({ startTime: start, endTime: end });
      DOM.startLabel.textContent = `${formatTime(start)}`;
      DOM.endLabel.textContent = `${formatTime(end)}`;
      updateRangeDuration();
      updateTimelineOverlay();
    });
    addVideoEventListener(DOM.timelineRange, 'mousedown', (e) => {
      e.preventDefault();
      const initialMouseX = e.clientX;
      const initialStartTime = state.videoState.startTime;
      const rangeDuration = state.videoState.endTime - state.videoState.startTime;
      const timelineWidth = DOM.timelineRuler.offsetWidth;
      const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - initialMouseX;
        const timeDelta = (deltaX / timelineWidth) * state.videoState.duration;
        let newStartTime = initialStartTime + timeDelta;
        let newEndTime = newStartTime + rangeDuration;
        if (newStartTime < 0) {
          newStartTime = 0;
          newEndTime = rangeDuration;
        }
        if (newEndTime > state.videoState.duration) {
          newEndTime = state.videoState.duration;
          newStartTime = newEndTime - rangeDuration;
        }
        DOM.startSlider.value = newStartTime;
        DOM.endSlider.value = newEndTime;
        setVideoState({ startTime: newStartTime, endTime: newEndTime });
        DOM.startLabel.textContent = `${formatTime(newStartTime)}`;
        DOM.endLabel.textContent = `${formatTime(newEndTime)}`;
        updateRangeDuration();
        updateTimelineOverlay();
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
    addVideoEventListener(DOM.extractBtn, 'click', extractFrames);
    addVideoEventListener(DOM.downloadFramesBtn, 'click', downloadRawFrames);
  }
  function resetVideoHandler() {
    if (DOM.video.src) {
      URL.revokeObjectURL(DOM.video.src);
      DOM.video.src = '';
    }
    DOM.videoContainer.classList.add('hidden');
    DOM.processBtn.disabled = true;
    DOM.downloadFramesBtn.disabled = true;
    cleanupVideoEventListeners();
    resetVideoState();
  }

  // From docs/js/main.js
  function resetStateAndUI() {
    clearSourceFiles();
    clearProcessedImages();
    DOM.previewContainer.innerHTML = '';
    resetVideoHandler();
    renderInitialPreviews();
    setResultsEnabled(false);
    DOM.processBtn.disabled = true;
    resetUIToDefaults();
    state.processedAspectRatio = null;
  }
  async function handleImageFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name));
    const sortedFiles = imageFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    const fileData = await Promise.all(sortedFiles.map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve({ file, src: reader.result, name: file.name });
        reader.readAsDataURL(file);
      });
    }));
    setSourceFiles(fileData);
    renderInitialPreviews();
    updateOutputDimensions();
    updatePdfLayoutPreview();
    DOM.processBtn.disabled = false;
  }
  function handleVideoFile(file) {
    initializeVideoHandler(file);
  }
  async function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    resetStateAndUI();
    if (files.length === 0) {
      return;
    }
    const firstFile = files[0];
    const isVideo = (file) => file.type.startsWith('video/') || /\.(mp4|mov|webm|avi)$/i.test(file.name);
    const isImage = (file) => file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name);
    if (isVideo(firstFile)) {
      handleVideoFile(firstFile);
    } else if (isImage(firstFile)) {
      await handleImageFiles(files);
    } else {
      alert('Formato de archivo no soportado. Por favor, sube imágenes (jpg, png, etc.) o un video (mp4, mov, etc.).');
    }
  }
  async function handleProcessClick() {
    if (state.sourceFiles.length === 0) return;
    showLoader(DOM.processBtn);
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      const processedDataUrls = await processImages();
      setProcessedImages(processedDataUrls);
      setProcessedAspectRatio(DOM.aspectRatioSelect.value);
      renderProcessedImages();
      setResultsEnabled(true);
      if (processedDataUrls.length > 0) {
        const tempImg = new Image();
        tempImg.onload = () => {
          DOM.outWidthInput.value = tempImg.width;
          DOM.outHeightInput.value = tempImg.height;
        };
        tempImg.src = processedDataUrls[0];
      }
      updateOutputDimensions();
      checkAspectRatioMatch();
      updatePdfLayoutPreview();
    } catch (error) {
      console.error("Error durante el procesamiento de imágenes:", error);
      alert("Ocurrió un error al procesar las imágenes.");
    } finally {
      hideLoader(DOM.processBtn);
    }
  }
  function updateOutputDimensions() {
    const [aspectW, aspectH] = DOM.aspectRatioSelect.value.split(':').map(Number);
    const widthPxVal = parseFloat(DOM.outWidthInput.value);
    const widthMmVal = parseFloat(DOM.outWidthMmInput.value);
    DOM.outHeightInput.value = Math.round(widthPxVal / (aspectW / aspectH));
    DOM.outHeightMmInput.value = (widthMmVal / (aspectW / aspectH)).toFixed(1);
  }
  function adjustPrintSpacing() {
    const imageWidth = parseFloat(DOM.outWidthMmInput.value);
    const imageHeight = parseFloat(DOM.outHeightMmInput.value);
    const printSpacing = parseFloat(DOM.printSpacing.value);
    const bleedEnabled = DOM.bleedCheckbox.checked;
    DOM.printSpacing.min = 1;
    if (!bleedEnabled) return;
    const { minSpacing } = getBleedConfig(imageWidth, imageHeight, printSpacing, bleedEnabled);
    if (printSpacing < minSpacing) {
      DOM.printSpacing.value = Math.ceil(minSpacing);
      DOM.printSpacing.min = Math.ceil(minSpacing);
      DOM.printSpacing.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  function setupEventListeners() {
    const addListener = (element, event, handler) => element.addEventListener(event, handler);
    const addMultipleListeners = (ids, event, handler) => {
      ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) addListener(element, event, handler);
      });
    };
    addListener(DOM.fileInput, 'change', handleFileSelection);
    addListener(DOM.processBtn, 'click', handleProcessClick);
    addListener(DOM.downloadBtn, 'click', downloadZip);
    addListener(DOM.printPdfBtn, 'click', generatePDF);
    addListener(DOM.enableWm, 'change', (e) => {
      toggleWatermarkControls(e.target.checked);
      updateWatermarkPreview();
    });
    addMultipleListeners(['wmSize', 'wmColor', 'wmAlpha', 'wmFont', 'wmPos'], 'input', updateWatermarkPreview);
    addListener(DOM.wmSize, 'input', (e) => DOM.wmSizeVal.textContent = e.target.value);
    addListener(DOM.wmAlpha, 'input', (e) => DOM.wmAlphaVal.textContent = e.target.value);
    addMultipleListeners(['paperSize', 'printLayout', 'printMargin', 'bleedCheckbox', 'printSpacing'], 'input', updatePdfLayoutPreview);
    addListener(DOM.printSpacing, 'change', adjustPrintSpacing);
    addListener(DOM.bleedCheckbox, 'input', adjustPrintSpacing);
    addListener(DOM.aspectRatioSelect, 'change', () => {
      updateOutputDimensions();
      checkAspectRatioMatch();
      updateWatermarkPreview();
      updatePdfLayoutPreview();
    });
    addListener(DOM.outWidthInput, 'input', () => updateOutputDimensions('px'));
    addListener(DOM.outWidthMmInput, 'input', () => {
      updateOutputDimensions('mm');
      adjustPrintSpacing();
      updatePdfLayoutPreview();
    });
    addListener(DOM.outHeightMmInput, 'input', () => {
      adjustPrintSpacing();
      updatePdfLayoutPreview();
    });
  }
  async function init() {
    await initializeI18n();
    initializeDarkMode(() => {
      updateWatermarkPreview();
      updatePdfLayoutPreview();
    });
    DOM.enableWm.checked = true;
    resetWatermarkControls();
    toggleWatermarkControls(true);
    setupEventListeners();
    updateWatermarkPreview();
    updatePdfLayoutPreview();
    adjustPrintSpacing();
    setResultsEnabled(false);
    DOM.processBtn.disabled = true;
  }

  // App Initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
