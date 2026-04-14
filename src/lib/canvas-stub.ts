// Stub for @napi-rs/canvas (Worker-only module, not used in frontend)
export default {}
export const createCanvas = () => { throw new Error('@napi-rs/canvas is not available in browser') }
export const GlobalFonts = { registerFromPath: () => {} }
export const Image = class {}
