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
        // (Implementación sin cambios)
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
            ctx.fillText('Las imágenes no caben', canvasW / 2, pdfLayoutPreviewCanvas.height / 2);
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
        ctx.fillText(`${layout.imagesPerPage} imágenes/página`, canvasW / 2, 15);
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
        // (Implementación sin cambios)
    }

    async function generatePDF() {
        // (Implementación casi sin cambios, solo usa los nuevos IDs)
    }

    // --- Event Listeners ---
    fileInput.addEventListener('change', (event) => { /* ... */ });
    processBtn.addEventListener('click', () => { /* ... */ });
    downloadBtn.addEventListener('click', async () => { /* ... */ });
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
    outHeightInput.addEventListener('input', () => { /* no hace nada para evitar bucles */ });
    outWidthMmInput.addEventListener('input', () => updateLinkedDimensions('mm'));
    outHeightMmInput.addEventListener('input', () => { /* no hace nada para evitar bucles */ });
    aspectRatioSelect.addEventListener('change', () => {
        updateLinkedDimensions('px');
        updateLinkedDimensions('mm');
    });

    // --- Inicialización ---
    updateWatermarkPreview();
    updatePdfLayoutPreview();
    wmControlsContainer.style.display = enableWm.checked ? 'block' : 'none';
});
