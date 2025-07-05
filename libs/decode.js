// libs/decode.js

import { initEmscriptenModule } from './utils.js';
import avif_dec from './avif_dec.js'; // 경로 수정

let emscriptenModule;

export async function init(module, moduleOptionOverrides) {
    let actualModule = module;
    let actualOptions = moduleOptionOverrides;
    // If only one argument is provided and it's not a WebAssembly.Module
    if (arguments.length === 1 && !(module instanceof WebAssembly.Module)) {
        actualModule = undefined;
        actualOptions = module;
    }
    emscriptenModule = initEmscriptenModule(avif_dec, actualModule, actualOptions);
}
export default async function decode(buffer, options) {
    var _a;
    if (!emscriptenModule) {
        init();
    }
    const module = await emscriptenModule;
    const bitDepth = (_a = options === null || options === void 0 ? void 0 : options.bitDepth) !== null && _a !== void 0 ? _a : 8;
    const result = module.decode(buffer, bitDepth);
    if (!result)
        throw new Error('Decoding error');
    return result;
}