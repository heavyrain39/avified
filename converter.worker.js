// converter.worker.js

// libs 폴더에 있는 로컬 파일을 import 합니다.
import avifEncoder from './libs/avif_enc.js';
import avifDecoder from './libs/avif_dec.js';

let encoderModule;
let decoderModule;

// 워커의 현재 위치를 기준으로 libs 폴더의 절대 경로를 생성합니다.
const baseDir = self.location.href.substring(0, self.location.href.lastIndexOf('/') + 1);
const libsDir = `${baseDir}libs/`;

// ----- ENCODE LOGIC -----
const defaultEncodeOptions = {
    quality: 75, // 기본 품질을 75로 설정
    qualityAlpha: -1, denoiseLevel: 0, tileColsLog2: 0, tileRowsLog2: 0,
    speed: 6, subsample: 1, chromaDeltaQ: false, sharpness: 0, tune: 0,
    enableSharpYUV: false, bitDepth: 8, lossless: false,
};

async function initEncode() {
    if (encoderModule) return;
    const moduleOptions = {
        locateFile: (path, prefix) => {
            if (path.endsWith('.wasm')) {
                return `${libsDir}${path}`;
            }
            return prefix + path;
        }
    };
    encoderModule = await avifEncoder(moduleOptions);
}

async function encode(data, options = {}) {
    if (!encoderModule) await initEncode();
    const _options = { ...defaultEncodeOptions, ...options };
    
    // ================== 핵심 수정 ==================
    // 불필요한 품질 변환 공식을 제거합니다.
    // 라이브러리는 UI의 0-100 값을 그대로 사용합니다.
    // ===============================================

    if (_options.lossless) {
        _options.quality = 100; // 무손실은 최고 품질
        _options.subsample = 3; // 4:4:4
    }

    const output = encoderModule.encode(new Uint8Array(data.data.buffer), data.width, data.height, _options);
    if (!output) throw new Error('AVIF encoding failed.');
    return output.buffer;
}

// ----- DECODE LOGIC -----
async function initDecode() {
    if (decoderModule) return;
    const moduleOptions = {
        locateFile: (path, prefix) => {
            if (path.endsWith('.wasm')) {
                return `${libsDir}${path}`;
            }
            return prefix + path;
        }
    };
    decoderModule = await avifDecoder(moduleOptions);
}

async function decode(buffer, options) {
    if (!decoderModule) await initDecode();
    const bitDepth = (options && options.bitDepth) ? options.bitDepth : 8;
    const result = decoderModule.decode(new Uint8Array(buffer), bitDepth);
    if (!result) throw new Error('AVIF decoding failed.');
    return result;
}

// ----- WORKER INITIALIZATION AND MAIN LOGIC -----
const wasmReady = Promise.all([initEncode(), initDecode()])
    .catch(err => {
        console.error('WASM module initialization failed in worker:', err);
        self.postMessage({
            status: 'error',
            fileId: null,
            originalName: 'WASM Initialization',
            error: `WASM initialization failed: ${err.message}`,
            stack: err.stack
        });
        throw err;
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
            quality: qualitySetting, // UI에서 받은 0-100 값을 그대로 전달합니다.
            speed: 6,
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
        await wasmReady;
        if (fileData && fileData.file) {
            await convertImage(fileData);
        }
    } catch (error) {
        self.postMessage({
            status: 'error',
            fileId: fileData ? fileData.fileId : null,
            originalName: fileData ? fileData.originalName : 'Unknown file',
            error: error.message || 'An unknown error occurred inside the worker.',
            stack: error.stack
        });
    }
};