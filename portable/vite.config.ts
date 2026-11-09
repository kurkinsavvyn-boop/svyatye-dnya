import{defineConfig}from'vite';
import react from'@vitejs/plugin-react';
import{resolve,dirname}from'node:path';
import{fileURLToPath}from'node:url';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export default defineConfig({base:process.env.SITE_BASE_PATH??'/',root:resolve(project,'portable'),publicDir:resolve(project,'public'),resolve:{alias:{'@':project}},plugins:[react()],build:{outDir:resolve(project,'outputs/standalone/public'),emptyOutDir:true}});
