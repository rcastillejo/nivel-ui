// Empaqueta las Edge Functions de Supabase con esbuild.
// Cada función se compila a un único archivo JS con sus dependencias incluidas
// (src/core, @supabase/supabase-js, date-fns), por lo que el runtime de Deno no
// necesita resolver imports sin extensión ni descargar paquetes de npm.
import { build } from 'esbuild';

const functions = [{ name: 'bookings', entry: 'src/server/edge/bookings.ts' }];

for (const { name, entry } of functions) {
  const outfile = `supabase/functions/${name}/index.js`;
  const result = await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    target: 'es2022',
    minify: true,
    logLevel: 'info',
    metafile: true,
  });
  const kb = (Object.values(result.metafile.outputs)[0].bytes / 1024).toFixed(0);
  console.log(`✔ ${name}: ${outfile} (${kb} KB)`);
}
