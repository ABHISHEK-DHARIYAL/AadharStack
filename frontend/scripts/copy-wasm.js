// web-ifc needs its WASM file served from the site root.
import fs from 'fs'
const src = 'node_modules/web-ifc/web-ifc.wasm'
if (fs.existsSync(src)) {
  fs.mkdirSync('public', { recursive: true })
  fs.copyFileSync(src, 'public/web-ifc.wasm')
  console.log('web-ifc.wasm copied to public/')
}
