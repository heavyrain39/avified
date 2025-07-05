// ui.js
import { translations } from './translations.js';

const toastContainer = document.getElementById('toast-container');

let SvgIcons = { trash: '', download: '', compare: '' };

export function setSvgIcons(icons) {
    SvgIcons = icons;
}

const toastIcons = {
    success: `<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 1em; height: 1em;"><path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06L5.5 10.19l7.02-7.02a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>`,
    info: `<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 1em; height: 1em;"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16ZM7.25 4.25a1 1 0 1 1 2 0a1 1 0 0 1-2 0ZM6.75 7.5a1 1 0 0 1 1-1h.5a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H7.5a1 1 0 0 1-1-1V7.5Z"/></svg>`,
    warning: `<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 1em; height: 1em;"><path fill-rule="evenodd" d="M8.234.689a.75.75 0 0 0-1.468 0l-6.928 13.5a.75.75 0 0 0 .651 1.061h13.856a.75.75 0 0 0 .651-1.061Zm-1.333 9.06a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-1.5 0Zm0-4.5a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-1.5 0Z" clip-rule="evenodd"/></svg>`,
    error: `<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 1em; height: 1em;"><path fill-rule="evenodd" d="M2.22 2.22a.75.75 0 0 1 1.06 0L8 6.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L9.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06L8 9.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L6.94 8 2.22 3.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>`
};

export function showToast(message, type = 'info', duration = 3000) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${toastIcons[type] || toastIcons.info}</span><p class="toast-text">${message}</p><button class="toast-close-btn" aria-label="Close notification">×</button>`;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    const removeToast = () => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };
    toast.querySelector('.toast-close-btn').addEventListener('click', removeToast);
    if (duration > 0) setTimeout(removeToast, duration);
}

export function getToastMessage(currentLanguage, key, replacements = {}) {
    const langSet = translations[currentLanguage] || translations.en;
    let message = langSet[key] || translations.en[key] || key;
    Object.entries(replacements).forEach(([placeholder, value]) => {
        message = message.replace(`{${placeholder}}`, value);
    });
    return message;
}

export function applyTheme(themeName, themes, body, footerThemeButtons, showNotification, currentLanguage) {
    if (!themes.includes(themeName)) themeName = themes[0];
    const oldTheme = body.dataset.activeTheme;
    body.dataset.activeTheme = themeName;
    localStorage.setItem('webpConverterTheme', themeName);
    footerThemeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === themeName));
    if (showNotification && oldTheme !== themeName && oldTheme !== undefined) {
        const themeKey = `theme_name_${themeName.replace('theme-', '').replace(/-/g, '_')}`;
        const translatedThemeName = getToastMessage(currentLanguage, themeKey);
        showToast(getToastMessage(currentLanguage, 'theme_changed_info', { themeName: translatedThemeName }), 'info', 2000);
    }
}

// --- NEWLY ADDED FUNCTION ---
export function loadThemePreference(themes, body, footerThemeButtons) {
    const savedTheme = localStorage.getItem('webpConverterTheme');
    const initialTheme = (savedTheme && themes.includes(savedTheme)) ? savedTheme : themes[0];
    console.log(`[UI-LOG] Applying initial theme: ${initialTheme}`);
    // Apply the theme without showing a notification on initial load
    applyTheme(initialTheme, themes, body, footerThemeButtons, false, null);
}


export function updateTexts(lang, state, domElements, callbacks, showNotification) {
    const oldLanguage = state.currentLanguage;
    state.currentLanguage = lang;
    localStorage.setItem('webpConverterLang', lang);
    document.documentElement.lang = lang;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const text = getToastMessage(lang, key);
        if (["why_security_desc", "why_webplified_conclusion", "why_webplified_intro"].includes(key)) {
            el.innerHTML = text;
        } else if (!key.includes("file-count-pool")) {
            el.textContent = text;
        }
    });

    if (domElements.supportLinkBtn) {
        const supportURL = getToastMessage(lang, 'support_us_url');
        const supportText = getToastMessage(lang, 'support_us_action_btn');
        domElements.supportLinkBtn.href = supportURL;
        domElements.supportLinkBtn.textContent = supportText;
    }

    if (domElements.formatToggleSwitch) {
        const pngButtonTooltip = domElements.formatToggleSwitch.querySelector('button[data-format="png"] .tooltip-text');
        const jpgButtonTooltip = domElements.formatToggleSwitch.querySelector('button[data-format="jpg"] .tooltip-text');
        if (pngButtonTooltip) pngButtonTooltip.textContent = getToastMessage(lang, 'tooltip_format_png');
        if (jpgButtonTooltip) jpgButtonTooltip.textContent = getToastMessage(lang, 'tooltip_format_jpg');
    }

    domElements.langButtons.forEach(button => button.classList.toggle('active', button.dataset.lang === lang));
    
    if (callbacks.updateFilenameInputStates) callbacks.updateFilenameInputStates();
    if (callbacks.updateQualitySliderAndTooltip) callbacks.updateQualitySliderAndTooltip();
    
    if (state.displayingResults) {
        if(callbacks.renderConversionResults) callbacks.renderConversionResults();
    } else {
        if(callbacks.renderFilePoolList) callbacks.renderFilePoolList();
    }

    if (showNotification && oldLanguage !== lang) {
        const langName = getToastMessage(lang, `lang_name_${lang}`);
        showToast(getToastMessage(lang, 'language_changed_info', { langName }), 'info', 2000);
    }
}

export function updateToggleSwitchUI(targetReverseFormat, toggleOptions, toggleSliderElement) {
    if (!toggleOptions || !toggleOptions.length || !toggleSliderElement) return;
    toggleOptions.forEach(opt => opt.classList.toggle('active', opt.dataset.format === targetReverseFormat));
    toggleSliderElement.style.transform = targetReverseFormat === 'jpg' ? 'translateX(calc(100% + 2px))' : 'translateX(0%)';
}

export function updateQualitySliderAndTooltip(conversionMode, targetReverseFormat, qualitySlider, qualityValueDisplay, qualityTooltip, lang) {
    if (!qualitySlider || !qualityValueDisplay || !qualityTooltip) return;
    const isPng = conversionMode === 'fromWebp' && targetReverseFormat === 'png';
    qualitySlider.disabled = isPng;
    qualityValueDisplay.textContent = isPng ? getToastMessage(lang, 'quality_na_text') : `${qualitySlider.value}%`;
    qualityTooltip.textContent = getToastMessage(lang, isPng ? 'quality_tooltip_text_png' : 'quality_tooltip_text');
}

export function showCorrectTitleButtons(displayingResults, clearBtn, downloadBtn, convertedCount, poolCount) {
    if (!clearBtn || !downloadBtn) return;
    const showClear = !displayingResults && poolCount > 0;
    const showDownload = displayingResults && convertedCount > 0;
    clearBtn.style.display = showClear ? 'inline-block' : 'none';
    clearBtn.disabled = !showClear;
    downloadBtn.style.display = showDownload ? 'inline-block' : 'none';
    downloadBtn.disabled = !showDownload;
}

export function updateFilenameInputStates(select, prefix, suffix) {
    if (!select || !prefix || !suffix) return;
    const selected = select.value;
    prefix.disabled = selected !== 'prefix';
    suffix.disabled = selected !== 'suffix';
    if (prefix.disabled) prefix.value = '';
    if (suffix.disabled) suffix.value = '';
}

let draggedElement = null;

function initializeDragAndDropSort(fileListElement, filesToConvert, onOrderChange) {
    const cleanup = () => {
        const indicator = fileListElement.querySelector('.drag-over-indicator');
        if (indicator) indicator.remove();
        if (draggedElement) draggedElement.classList.remove('dragging');
        draggedElement = null;
    };

    fileListElement.addEventListener('dragstart', e => {
        const target = e.target.closest('.file-item');
        if (!target) { e.preventDefault(); return; }
        
        draggedElement = target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', target.dataset.fileId);
        
        setTimeout(() => {
            draggedElement.classList.add('dragging');
        }, 0);
    });

    fileListElement.addEventListener('dragover', e => {
        e.preventDefault();
        const indicator = fileListElement.querySelector('.drag-over-indicator') || document.createElement('li');
        indicator.className = 'drag-over-indicator';

        const target = e.target.closest('.file-item');
        if (target && target !== draggedElement) {
            const rect = target.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (e.clientY < midpoint) {
                target.parentNode.insertBefore(indicator, target);
            } else {
                target.parentNode.insertBefore(indicator, target.nextSibling);
            }
        }
    });

    fileListElement.addEventListener('dragleave', e => {
        if (!fileListElement.contains(e.relatedTarget)) {
            cleanup();
        }
    });

    fileListElement.addEventListener('drop', e => {
        e.preventDefault();
        const indicator = fileListElement.querySelector('.drag-over-indicator');
        if (!indicator || !draggedElement) {
            cleanup();
            return;
        }

        const fromIndex = filesToConvert.findIndex(f => f.id === draggedElement.dataset.fileId);
        
        const children = Array.from(fileListElement.children);
        let toIndex = children.indexOf(indicator);
        
        cleanup();

        if (fromIndex !== -1 && toIndex !== -1) {
            onOrderChange(fromIndex, toIndex);
        }
    });

    fileListElement.addEventListener('dragend', cleanup);
}

export function renderFilePoolList(filesToConvert, fileListElement, listAreaWrapper, formatFileSize, currentLanguage, removeFileFromPoolCallback, onOrderChange) {
    if (!fileListElement || !listAreaWrapper) return;
    
    const isProcessing = listAreaWrapper.classList.contains('processing');
    
    fileListElement.innerHTML = '';

    filesToConvert.forEach(fileItem => {
        const li = document.createElement('li');
        li.className = 'file-item minimal';
        li.dataset.fileId = fileItem.id;
        li.draggable = !isProcessing;

        const thumbnailImg = document.createElement('img');
        thumbnailImg.className = 'thumbnail';
        thumbnailImg.alt = fileItem.file.name;
        
        if (fileItem.thumbnailUrl) {
            thumbnailImg.src = fileItem.thumbnailUrl;
        } else {
            thumbnailImg.src = "";
            thumbnailImg.classList.add('placeholder');
        }
        thumbnailImg.onerror = () => { thumbnailImg.src = ""; thumbnailImg.classList.add('placeholder'); };

        const fileInfoContainer = document.createElement('div');
        fileInfoContainer.className = 'file-info-container';

        const fileNameSpan = document.createElement('span');
        fileNameSpan.className = 'file-name';
        fileNameSpan.textContent = fileItem.file.name;
        fileNameSpan.title = fileItem.file.name;

        const fileSizeSpan = document.createElement('span');
        fileSizeSpan.className = 'file-size';
        fileSizeSpan.textContent = formatFileSize(fileItem.file.size);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file-btn icon-btn';
        removeBtn.type = 'button';
        removeBtn.innerHTML = SvgIcons.trash;
        removeBtn.title = getToastMessage(currentLanguage, 'remove_btn_text');
        removeBtn.disabled = isProcessing;
        removeBtn.onclick = () => {
            if (isProcessing) return;
            removeFileFromPoolCallback(fileItem.id);
        };

        fileInfoContainer.appendChild(fileNameSpan);
        fileInfoContainer.appendChild(fileSizeSpan);
        li.appendChild(thumbnailImg);
        li.appendChild(fileInfoContainer);
        li.appendChild(removeBtn);
        
        fileListElement.appendChild(li);
    });

    if (!isProcessing) {
        initializeDragAndDropSort(fileListElement, filesToConvert, onOrderChange);
    }
}

export function renderConversionResults(convertedFiles, fileListElement, formatFileSize, currentLanguage, openComparisonModalCallback) {
    if (!fileListElement) return;
    fileListElement.innerHTML = '';

    convertedFiles.forEach(resultItem => {
        const li = document.createElement('li');
        li.classList.add('file-item', 'minimal', 'result-item');
        li.dataset.fileId = resultItem.fileId;
        li.draggable = false;

        const thumbnailImg = document.createElement('img');
        thumbnailImg.classList.add('thumbnail');
        thumbnailImg.alt = resultItem.convertedName;
        
        let itemThumbnailUrl = null;
        if (resultItem.convertedBlob && resultItem.convertedBlob.type.startsWith('image/')) {
            try {
                itemThumbnailUrl = URL.createObjectURL(resultItem.convertedBlob);
                thumbnailImg.src = itemThumbnailUrl;
            } catch(e) { console.error("Error creating object URL for result thumbnail:", e); thumbnailImg.src = "";}
        } else {
            thumbnailImg.src = "";
            thumbnailImg.classList.add('placeholder');
        }
        thumbnailImg.onload = () => { if (itemThumbnailUrl) URL.revokeObjectURL(itemThumbnailUrl); };
        thumbnailImg.onerror = () => {
            thumbnailImg.src = "";
            thumbnailImg.classList.add('placeholder');
            if (itemThumbnailUrl) URL.revokeObjectURL(itemThumbnailUrl);
        };

        const fileInfoContainer = document.createElement('div');
        fileInfoContainer.classList.add('file-info-container');

        const fileName = document.createElement('span');
        fileName.classList.add('file-name');
        fileName.textContent = resultItem.convertedName;
        fileName.title = resultItem.convertedName;

        const fileSizeInfo = document.createElement('div');
        fileSizeInfo.classList.add('file-size-info');

        const newSize = document.createElement('span');
        newSize.classList.add('file-size');
        newSize.textContent = formatFileSize(resultItem.convertedBlob.size);

        const reduction = document.createElement('span');
        reduction.classList.add('size-reduction');
        const reductionPc = resultItem.originalSize > 0 ? ((resultItem.originalSize - resultItem.convertedBlob.size) / resultItem.originalSize) * 100 : 0;
        reduction.textContent = `(${reductionPc >= 0 ? '-' : '+'}${Math.abs(reductionPc).toFixed(1)}%)`;
        if (reductionPc < 0) reduction.classList.add('increased');

        fileSizeInfo.appendChild(newSize);
        fileSizeInfo.appendChild(reduction);

        fileInfoContainer.appendChild(fileName);
        fileInfoContainer.appendChild(fileSizeInfo);

        const actionsContainer = document.createElement('div');
        actionsContainer.classList.add('result-actions');

        const compareBtn = document.createElement('button');
        compareBtn.classList.add('compare-btn', 'icon-btn');
        compareBtn.type = 'button';
        compareBtn.innerHTML = SvgIcons.compare;
        compareBtn.title = getToastMessage(currentLanguage, 'compare_btn_text');
        compareBtn.addEventListener('click', () => openComparisonModalCallback(resultItem.fileId));
        actionsContainer.appendChild(compareBtn);

        const downloadBtn = document.createElement('button');
        downloadBtn.classList.add('download-individual-btn', 'icon-btn');
        downloadBtn.type = 'button';
        downloadBtn.innerHTML = SvgIcons.download;
        downloadBtn.title = getToastMessage(currentLanguage, 'download_btn_text');
        downloadBtn.addEventListener('click', () => {
            try {
                const url = URL.createObjectURL(resultItem.convertedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = resultItem.convertedName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error("Error creating download link:", e);
                showToast(getToastMessage(currentLanguage, "error_creating_download_link"), "error");
            }
        });
        actionsContainer.appendChild(downloadBtn);

        li.appendChild(thumbnailImg);
        li.appendChild(fileInfoContainer);
        li.appendChild(actionsContainer);
        fileListElement.appendChild(li);
    });
}

export function updateListTitleAndCount(listTitleElement, displayingResults, filesToConvertCount, convertedFilesCount, currentLanguage) {
    if (!listTitleElement) return;
    const isResultView = displayingResults;
    const count = isResultView ? convertedFilesCount : filesToConvertCount;
    const titleKey = isResultView ? "conversion_results_title_short" : "conversion_candidate_pool_title";
    let rawTitle = getToastMessage(currentLanguage, titleKey);
    const baseTitle = rawTitle.substring(0, rawTitle.indexOf('(')).trim() || rawTitle;
    listTitleElement.innerHTML = `${baseTitle} (<span id='file-count-pool'>${count}</span>)`;
}

let optimisticAnimationFrameId = null;

export function updateProgressBarReal(processed, total, progressBarFill, progressText) {
    if (!progressBarFill || !progressText) return;
    const percentage = total > 0 ? (processed / total) * 100 : 0;
    progressBarFill.style.width = `${percentage}%`;
    progressText.textContent = `${Math.round(percentage)}%`;
}

export function startOptimisticProgress(listAreaWrapper, progressBarFill, progressPercentageText, total, processed) {
    if (optimisticAnimationFrameId) cancelAnimationFrame(optimisticAnimationFrameId);
}

export function stopOptimisticProgress() {
    if (optimisticAnimationFrameId) {
        cancelAnimationFrame(optimisticAnimationFrameId);
        optimisticAnimationFrameId = null;
    }
}

export function showConversionProgressUI(overlay, wrapper, progressBarFill, progressText, clearBtn, convertBtn, fileInput, dragDropArea) {
    if (overlay) overlay.style.display = 'flex';
    
    if (wrapper) wrapper.classList.add('processing');

    updateProgressBarReal(0, 1, progressBarFill, progressText);
    [clearBtn, convertBtn, fileInput].forEach(el => el && (el.disabled = true));
    if(dragDropArea) dragDropArea.classList.add('disabled-while-processing');
}

export function hideConversionProgressUI(overlay, wrapper, clearBtn, convertBtn, fileInput, dragDropArea, fileList, poolCount, isResult, lang) {
    if (overlay) overlay.style.display = 'none';

    if (wrapper) wrapper.classList.remove('processing');

    [convertBtn, fileInput].forEach(el => el && (el.disabled = false));
    if(convertBtn) convertBtn.textContent = getToastMessage(lang, "convert_all_btn_text");
    if(clearBtn) clearBtn.disabled = !(!isResult && poolCount > 0);
    if(dragDropArea) dragDropArea.classList.remove('disabled-while-processing');
}


let currentComparisonOriginalUrl = null; 
let currentComparisonConvertedUrl = null;
let comparisonSliderHandle = null;

function handleComparisonMouseMove(e) {
    e.preventDefault();
    const container = e.currentTarget;
    if (!container || !comparisonSliderHandle) return;
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const percentage = (x / rect.width) * 100;
    
    container.querySelector('.comparison-original').style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
    comparisonSliderHandle.style.left = `${percentage}%`;
}

export function openComparisonModalUI(fileId, convertedFiles, modal, container, lang) {
    const resultItem = convertedFiles.find(item => item.fileId === fileId);
    if (!resultItem || !resultItem.originalFile || !resultItem.convertedBlob) {
        showToast(getToastMessage(lang, "error_opening_comparison_detail"), "error");
        return;
    }

    closeComparisonModalUI(modal, container); 
    container.innerHTML = '';

    try {
        currentComparisonOriginalUrl = URL.createObjectURL(resultItem.originalFile);
        currentComparisonConvertedUrl = URL.createObjectURL(resultItem.convertedBlob);
    } catch (e) {
        console.error("Error creating URLs:", e);
        showToast(getToastMessage(lang, "error_opening_comparison_detail"), "error");
        return;
    }

    const originalImg = new Image();
    const convertedImg = new Image();
    
    let loadedCount = 0;
    const onImageLoad = () => {
        loadedCount++;
        if (loadedCount < 2) return;

        container.appendChild(originalImg);
        container.appendChild(convertedImg);

        comparisonSliderHandle = document.createElement('div');
        comparisonSliderHandle.className = 'comparison-slider-handle';
        comparisonSliderHandle.innerHTML = `<div class="comparison-slider-line"></div><div class="comparison-slider-button"></div>`;
        container.appendChild(comparisonSliderHandle);
        
        const originalLabel = document.createElement('div');
        originalLabel.className = 'comparison-label original-label';
        originalLabel.textContent = getToastMessage(lang, 'comparison_label_original');
        container.appendChild(originalLabel);
        
        const convertedLabel = document.createElement('div');
        convertedLabel.className = 'comparison-label converted-label';
        convertedLabel.textContent = getToastMessage(lang, 'comparison_label_converted');
        container.appendChild(convertedLabel);

        const initialPercentage = 50;
        originalImg.style.clipPath = `inset(0 ${100 - initialPercentage}% 0 0)`;
        if (comparisonSliderHandle) comparisonSliderHandle.style.left = `${initialPercentage}%`;
    };
    
    const onImageError = (label) => {
        console.error(`Failed to load ${label} image.`);
        showToast(getToastMessage(lang, "error_opening_comparison_detail"), "error");
        closeComparisonModalUI(modal, container);
    };

    originalImg.src = currentComparisonOriginalUrl;
    originalImg.className = 'comparison-image comparison-original';
    originalImg.alt = getToastMessage(lang, "original_image_alt");
    originalImg.onload = onImageLoad;
    originalImg.onerror = () => onImageError('original');
    
    convertedImg.src = currentComparisonConvertedUrl;
    convertedImg.className = 'comparison-image comparison-converted';
    convertedImg.alt = getToastMessage(lang, "converted_image_alt");
    convertedImg.onload = onImageLoad;
    convertedImg.onerror = () => onImageError('converted');

    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    modal.style.display = 'flex';
    
    container.addEventListener('mousemove', handleComparisonMouseMove);
    container.addEventListener('touchmove', handleComparisonMouseMove, { passive: false });
}

export function closeComparisonModalUI(modal, container) {
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    if (!modal || !container) return;
    modal.style.display = 'none';
    container.removeEventListener('mousemove', handleComparisonMouseMove);
    container.removeEventListener('touchmove', handleComparisonMouseMove);
    container.innerHTML = '';
    comparisonSliderHandle = null;
    if (currentComparisonOriginalUrl) URL.revokeObjectURL(currentComparisonOriginalUrl);
    if (currentComparisonConvertedUrl) URL.revokeObjectURL(currentComparisonConvertedUrl);
    currentComparisonOriginalUrl = null;
    currentComparisonConvertedUrl = null;
}