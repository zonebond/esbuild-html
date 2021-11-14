/*
 * Created on Thu Oct 28 2021
 * Authored by zonebond
 * @github - github.com/zonebond
 * @e-mail - zonebond@126.com
 */

import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_HTML_FILTERED = /^\?.+\.html$/;

const ROOT = (...args) => path.join(process.cwd(), ...args);

export default function esbuildHTML({ parameters }) {
  parameters = parameters || {};

  const setup = async build => {
    const { entryPoints, outdir, publicPath } = build.initialOptions;
    
    const ENTRY_NAMES = entryPoints.map(ep => path.parse(ep).name);
    const HTML_FILTER = new RegExp(`(${ENTRY_NAMES.map(ht => `${ht}`).join('|')})\\.js$`);

    build.onResolve({ filter: DEFAULT_HTML_FILTERED, namespace: 'file' }, ({ path: importPath, importer, resolveDir }) => {
      const templatePath = ROOT(importPath.slice(1));
      const { name } = path.parse(importer);

      return ({
        path: `${name}.html`, external: false,
        namespace: 'esbuild-html::template',
        pluginData: { moduleName: name, templatePath: templatePath },
      })
    });

    build.onLoad({ filter: /.*/, namespace: 'esbuild-html::template' }, async ({ path: htmlName, pluginData }) => {
      const { moduleName, templatePath } = pluginData;
      const template = await fs.readFile(templatePath);

      const PUBLIC_PATH = publicPath || '';
      const contents = BUILD_IMPORTER_HTML(template.toString(), PUBLIC_PATH, {
        ...parameters, moduleName, PUBLIC_PATH,
      });

      return { contents, loader: 'file' };
    });
  }

  return { name: 'esbuild-html', setup };
}

function BUILD_IMPORTER_HTML(template, PUBLIC_PATH, { moduleName, ...others }) {

  const contents = ARGUMENT_TMP_MATCHOR(template, {
    ...others,
    styles: `<link rel="stylesheet" href="${path.join('./', PUBLIC_PATH, moduleName + '.css')}" />`,
    script: `<script src="${path.join('./', PUBLIC_PATH, moduleName + '.js')}"></script>`,
  });

  return contents;
}

function ARGUMENT_TMP_MATCHOR(chunk, env_args) {
  if(!chunk || !chunk.trim() || !env_args) return chunk;
  const content = chunk;

  return Object.keys(env_args).reduce((acc, key) => {
    const regexr = new RegExp(`<%= ${key} %>`, 'g');
    const next = acc.replace(regexr, env_args[key]);
    return next;
  }, content);
}