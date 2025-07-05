// fileHandler.js
import { showToast, getToastMessage } from './ui.js'; // ui.js에서 토스트 관련 함수 가져오기

// --- File Utility Functions ---
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function generateOutputFilename(originalName, rule, prefix, suffix, index, targetExtensionWithoutDot) {
    const originalNameWithoutExtension = originalName.substring(0, originalName.lastIndexOf('.'));
    let finalName = '';
    switch (rule) {
        case 'prefix':
            finalName = (prefix || '') + originalNameWithoutExtension;
            break;
        case 'suffix':
            finalName = originalNameWithoutExtension + (suffix || '');
            break;
        case 'numbering':
            const numberString = String(index + 1).padStart(3, '0');
            finalName = numberString + '_' + originalNameWithoutExtension;
            break;
        case 'original':
        default:
            finalName = originalNameWithoutExtension;
            break;
    }
    return `${finalName}.${targetExtensionWithoutDot}`;
}

// --- File Handling Logic ---
export function handleFiles(selectedFiles, state, domElements, uiCallbacks) {
    console.log(`[HANDLER-LOG] handleFiles called. Current mode before processing: ${state.conversionMode}`);

    const newFilesArray = Array.from(selectedFiles);

    // 변환 결과가 표시된 상태에서 새 파일을 추가하면, 무조건 모든 것을 초기화하고 새 세션을 시작합니다.
    if (state.displayingResults) {
        console.log("[HANDLER-LOG] New files added while results were displayed. Clearing ALL old data for a new session.");

        // 기존 변환 결과와 관련된 썸네일 URL을 모두 폐기해야 합니다.
        // convertedFiles 배열이 별도의 썸네일 URL을 관리하지 않으므로, filesToConvert만 처리합니다.
        state.filesToConvert.forEach(item => {
            if (item.thumbnailUrl) {
                console.log(`[HANDLER-LOG] Revoking old thumbnail URL: ${item.thumbnailUrl}`);
                URL.revokeObjectURL(item.thumbnailUrl);
            }
        });
        
        state.convertedFiles = [];
        console.log("[HANDLER-LOG] state.convertedFiles has been cleared.");

        state.filesToConvert.length = 0;
        console.log("[HANDLER-LOG] state.filesToConvert has been cleared.");

        state.displayingResults = false;
        console.log(`[HANDLER-LOG] state.displayingResults set to false.`);

        uiCallbacks.hideConversionProgress();
    }
    
    // ==============================================================================
    // === 핵심 수정 로직: 목록이 비어있을 때 (초기화 직후 포함), 새 파일 종류에 따라 모드 자동 설정 ===
    // ==============================================================================
    if (newFilesArray.length > 0 && state.filesToConvert.length === 0) {
        const firstFileType = newFilesArray[0].type;
        if (firstFileType === 'image/avif') {
            state.conversionMode = 'fromAvif';
            console.log(`[HANDLER-LOG] Mode auto-switched to 'fromAvif' based on new files.`);
        } else if (['image/png', 'image/jpeg'].includes(firstFileType)) {
            state.conversionMode = 'toAvif';
            console.log(`[HANDLER-LOG] Mode auto-switched to 'toAvif' based on new files.`);
        }
        // UI 업데이트 콜백을 호출하여 변경된 모드를 반영합니다. (main.js의 setConversionMode와 유사한 역할)
        if (domElements.reverseFormatSettingGroup) {
            domElements.reverseFormatSettingGroup.style.display = state.conversionMode === 'fromAvif' ? 'flex' : 'none';
        }
        if (uiCallbacks.updateQualitySliderAndTooltip) {
            uiCallbacks.updateQualitySliderAndTooltip();
        }
    }
    // ==============================================================================

    const filesToActuallyAdd = [];
    const largeFilesForWarning = [];

    for (const file of newFilesArray) {
        if (state.filesToConvert.length + filesToActuallyAdd.length >= 100) {
            showToast(getToastMessage(state.currentLanguage, 'max_files_exceeded_error', { maxFiles: 100 }), 'error');
            break;
        }
        const MAX_SIZE_MB_HARD = 20; const MAX_SIZE_BYTES_HARD = MAX_SIZE_MB_HARD * 1024 * 1024;
        const MAX_SIZE_MB_WARN = 10; const MAX_SIZE_BYTES_WARN = MAX_SIZE_MB_WARN * 1024 * 1024;

        if (file.size > MAX_SIZE_BYTES_HARD) {
            showToast(getToastMessage(state.currentLanguage, 'file_exceeds_limit_error', { fileName: file.name, fileSize: formatFileSize(file.size), maxSize: MAX_SIZE_MB_HARD }), 'error');
            continue;
        }
        
        // 파일 타입 검사는 이제 올바르게 설정된 state.conversionMode를 기준으로 동작합니다.
        if (state.conversionMode === 'toAvif' && !['image/png', 'image/jpeg'].includes(file.type)) {
            showToast(getToastMessage(state.currentLanguage, 'invalid_file_type_to_avif_error', { fileName: file.name }), 'error');
            continue;
        } else if (state.conversionMode === 'fromAvif' && file.type !== 'image/avif') {
            showToast(getToastMessage(state.currentLanguage, 'invalid_file_type_from_avif_error', { fileName: file.name }), 'error');
            continue;
        }

        if (state.filesToConvert.some(f => f.file.name === file.name && f.file.size === file.size) ||
            filesToActuallyAdd.some(f => f.file.name === file.name && f.file.size === file.size)) {
            console.warn(`File ${file.name} is already in the list or being added, and will be skipped.`);
            continue;
        }
        if (file.size > MAX_SIZE_BYTES_WARN && file.size <= MAX_SIZE_BYTES_HARD) {
            largeFilesForWarning.push({ name: file.name, size: file.size });
        }

        const fileId = `file-${state.nextFileId++}`;
        let thumbnailUrl = null;
        if (file.type.startsWith('image/')) {
            try {
                thumbnailUrl = URL.createObjectURL(file);
            } catch (error) { console.error("Error creating object URL for:", file.name, error); }
        }
        filesToActuallyAdd.push({ id: fileId, file: file, thumbnailUrl: thumbnailUrl });
    }

    if (largeFilesForWarning.length > 0) {
        if (largeFilesForWarning.length === 1) {
            showToast(getToastMessage(state.currentLanguage, 'file_too_large_warning_single', { fileName: largeFilesForWarning[0].name, fileSize: formatFileSize(largeFilesForWarning[0].size) }), 'warning', 7000);
        } else {
            showToast(getToastMessage(state.currentLanguage, 'file_too_large_warning_multiple', { fileName: largeFilesForWarning[0].name, count: largeFilesForWarning.length - 1 }), 'warning', 7000);
        }
    }
    if (filesToActuallyAdd.length > 0) {
        state.filesToConvert.push(...filesToActuallyAdd);
        console.log(`[HANDLER-LOG] ${filesToActuallyAdd.length} new files pushed. Total filesToConvert: ${state.filesToConvert.length}`);
        state.displayingResults = false; 
        if (uiCallbacks.renderFilePoolList) uiCallbacks.renderFilePoolList();
    }
}

export function removeFileFromPool(fileIdToRemove, state, uiCallbacks) {
    const itemToRemove = state.filesToConvert.find(item => item.id === fileIdToRemove);
    if (itemToRemove) {
        if (itemToRemove.thumbnailUrl) {
             console.log(`[HANDLER-LOG] Revoking thumbnail URL for removed file: ${itemToRemove.thumbnailUrl}`);
             URL.revokeObjectURL(itemToRemove.thumbnailUrl);
        }
    }
    state.filesToConvert = state.filesToConvert.filter(item => item.id !== fileIdToRemove);
    
    // 마지막 파일이 제거되면 하드 리셋과 유사하게 동작하여 초기 화면으로 돌아감
    if (state.filesToConvert.length === 0) {
        state.displayingResults = false;
        uiCallbacks.renderFilePoolList(); // This will also call updateSectionsVisibility
    } else {
        state.displayingResults = false; 
        if (uiCallbacks.renderFilePoolList) uiCallbacks.renderFilePoolList();
    }
}