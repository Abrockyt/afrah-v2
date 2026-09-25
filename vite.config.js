import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {enquiries} from './server/enquiries.mjs';

export default defineConfig({plugins:[react(),{name:'afrah-enquiries',configureServer(server){server.middlewares.use(enquiries)}}],server:{port:4174,host:'127.0.0.1',watch:{ignored:['**/private/**','**/qa/**','**/research/**']}},build:{rollupOptions:{output:{onlyExplicitManualChunks:true,manualChunks(id){const normalized=id.replaceAll('\\','/');if(/\/node_modules\/(react|react-dom|scheduler)\//.test(normalized))return 'react-vendor';if(normalized.includes('/node_modules/three/examples/'))return 'three-addons';if(normalized.includes('/node_modules/three/'))return 'three-engine';if(/\/node_modules\/@react-three\//.test(normalized))return 'three-react';}}}}});
