// converter.worker.js

// libs 폴더에 있는 로컬 파일을 import 합니다.
import { encode, init as initEncode } from './libs/encode.js';
import { decode, init as initDecode } from './libs/decode.js';

// WASM 모듈 초기화 Promise.
// 모든 추가 설정을 제거하여, 라이브러리가 기본 방식대로 작동하게 합니다.
// 이 방식은 .js 파일과 동일한 위치에서 .wasm 파일을 자동으로 찾습니다.
const wasmReady = Promise.all([
    initEncode(),
    initDecode()
]).catch(err => {
    // 초기화 실패 시, 메인 스레드로 오류를 보내기 전에 워커의 콘솔에도 기록합니다.
    console.error('WASM module initialization failed in worker:', err);
    throw new Error(`WASM initialization failed: ${err.message}`);
});

// 메인 변환 함수
async function convertImage(fileData) {
    const { file, qualitySetting, fileId, originalName, originalSize, targetOutputFormat } = fileData;

    let convertedBlob;
    const inputType = file.type;

    if (inputType === 'image/avif') { // 디코딩: AVIF -> PNG/JPG
        const arrayBuffer = await file.arrayBuffer();
        const imageData = await decode(arrayBuffer);
        
        if (!imageData) throw new Error('AVIF decoding failed.');

        const offscreenCanvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = offscreenCanvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);

        const quality = qualitySetting / 100;
        const mimeType = targetOutputFormat === 'png' ? 'image/png' : 'image/jpeg';
        convertedBlob = await offscreenCanvas.convertToBlob({ type: mimeType, quality: mimeType === 'image/jpeg' ? quality : undefined });

    } else if (inputType === 'image/png' || inputType === 'image/jpeg') { // 인코딩: PNG/JPG -> AVIF
        const imageBitmap = await createImageBitmap(file);
        const offscreenCanvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        const ctx = offscreenCanvas.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        
        const encodeOptions = {
            quality: Math.round(63 * (1 - qualitySetting / 100)), // 0-63, 낮을수록 고품질
            speed: 4, // 0(느림,고품질) - 10(빠름,저품질)
        };
        
        const avifData = await encode(imageData, encodeOptions);
        if (!avifData) throw new Error('AVIF encoding returned null data.');

        convertedBlob = new Blob([avifData], { type: 'image/avif' });
        imageBitmap.close();
        
    } else {
        throw new Error(`Unsupported input file type: ${inputType}`);
    }

    if (!convertedBlob) {
        throw new Error(`Failed to create blob for target format ${targetOutputFormat}.`);
    }

    self.postMessage({
        status: 'success', fileId, originalName, originalSize, convertedBlob,
    });
}

// 메인 스레드로부터 메시지를 받는 리스너
self.onmessage = async (e) => {
    const fileData = e.data;
    try {
        // WASM 모듈이 준비될 때까지 기다립니다.
        await wasmReady;

        // 변환할 파일 데이터가 있을 때만 convertImage 함수를 호출합니다.
        if (fileData && fileData.file) {
            await convertImage(fileData);
        }
    } catch (error) {
        // 오류 발생 시, 메인 스레드로 상세 정보를 보냅니다.
        self.postMessage({
            status: 'error',
            fileId: fileData ? fileData.fileId : null,
            originalName: fileData ? fileData.originalName : 'Unknown file',
            error: error.message || 'An unknown error occurred inside the worker.',
            stack: error.stack
        });
    }
};