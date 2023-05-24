/* eslint-disable import/no-extraneous-dependencies */
import {
  task, setOption,
} from 'foy';
import { context, build, BuildOptions } from 'esbuild';

const buildContext: BuildOptions = {
  entryPoints: ['./src/content.ts'],
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

  await esbuild.watch();
  await ctx.spawn('web-ext', [
    'run',
    '--source-dir', './dist/',
    '--target', 'chromium']);
});

task('build', async () => {
  await build(buildContext);
});
