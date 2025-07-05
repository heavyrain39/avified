// libs/encode.js

import { defaultOptions } from './meta.js';
import { initEmscriptenModule } from './utils.js';
import avifEncoder from './avif_enc.js'; // 경로 수정

let emscriptenModule;

export async function init(module, moduleOptionOverrides) {
    let actualModule = module;
    let actualOptions = moduleOptionOverrides;
    // If only one argument is provided and it's not a WebAssembly.Module
    if (arguments.length === 1 && !(module instanceof WebAssembly.Module)) {
        actualModule = undefined;
        actualOptions = module;
    }
    
    emscriptenModule = initEmscriptenModule(avifEncoder, actualModule, actualOptions);
    return emscriptenModule;
}
export default async function encode(data, options = {}) {
    if (!emscriptenModule)
        emscriptenModule = init();
    const _options = { ...defaultOptions, ...options };
    if (_options.bitDepth !== 8 &&
        _options.bitDepth !== 10 &&
        _options.bitDepth !== 12) {
        throw new Error('Invalid bit depth. Supported values are 8, 10, or 12.');
    }
    if (!(data.data instanceof Uint16Array) && _options.bitDepth !== 8) {
        throw new Error('Invalid image data for bit depth. Must use Uint16Array for bit depths greater than 8.');
    }
    if (_options.lossless) {
        if (options.quality !== undefined && options.quality !== 100) {
            console.warn('AVIF lossless: Quality setting is ignored when lossless is enabled (quality must be 100).');
        }
        if (options.qualityAlpha !== undefined &&
            options.qualityAlpha !== 100 &&
            options.qualityAlpha !== -1) {
            console.warn('AVIF lossless: QualityAlpha setting is ignored when lossless is enabled (qualityAlpha must be 100 or -1).');
        }
        if (options.subsample !== undefined && options.subsample !== 3) {
            console.warn('AVIF lossless: Subsample setting is ignored when lossless is enabled (subsample must be 3 for YUV444).');
        }
        _options.quality = 100;
        _options.qualityAlpha = -1;
        _options.subsample = 3;
    }
    const module = await emscriptenModule;
    const output = module.encode(new Uint8Array(data.data.buffer), data.width, data.height, _options);
    if (!output) {
        throw new Error('Encoding error.');
    }
    return output.buffer;
}