/* eslint-disable @typescript-eslint/no-use-before-define, import/no-extraneous-dependencies */
import {
  task, setOption, fs,
} from 'foy';
import { context, build, BuildOptions } from 'esbuild';

const buildContext: BuildOptions = {
  entryPoints: ['./src/content.ts', './src/index.ts'],
  bundle: true,
  platform: 'browser',
  target: 'es2017',
  outdir: 'dist',
  allowOverwrite: true,
  logLevel: 'info',
  minify: false,
  sourcemap: false,
};

setOption({ loading: false });
task('dev', async (ctx) => {
  const esbuild = await context({
    ...buildContext,
    sourcemap: true,
    minify: true,
  });

  await rmDist();

  await Promise.all([
    esbuild.watch(),
    fs.copy('./assets', './dist'),
    fs.copy('./src/html', './dist'),
    fs.copy('./src/styles.css', './dist/styles.css'),
  ]);

  await ctx.spawn('web-ext', [
    'run',
    '--source-dir', './dist/',
    '--target', 'chromium']);
});

task('build', async () => {
  await build(buildContext);
});

async function rmDist() {
  try {
    await fs.rm('./dist', { recursive: true, force: true });
  } catch (e: any) {
    if (e.code === 'ENOENT') return;
    throw e;
  }
}
