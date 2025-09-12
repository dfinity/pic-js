import fs from 'node:fs/promises';
import path from 'node:path';

import { DOCS_DIR, TMP_DIR } from './utils/constants.ts';
import { processMarkdown } from './utils/markdown.ts';
import { generateApiDocs } from './utils/typedoc.ts';

const additionalFiles = ['../CHANGELOG.md'];

async function main() {
  const apiSrcDir = path.resolve(TMP_DIR, 'api');
  const apiOutDir = path.resolve(DOCS_DIR, 'api');
  const clean = true;

  if (clean) {
    await fs.rm(apiOutDir, { recursive: true, maxRetries: 3, force: true });
    await fs.rm(TMP_DIR, { recursive: true, maxRetries: 3, force: true });
  }

  await generateApiDocs({
    outDir: TMP_DIR,
    typedocOptions: {
      projectDocuments: additionalFiles,
    },
  });

  const files = await fs.readdir(apiSrcDir, {
    withFileTypes: true,
    recursive: true,
  });
  for (const file of files) {
    if (file.isFile() && file.name.endsWith('.md')) {
      const prefix = path.relative(apiSrcDir, file.parentPath);
      const inputFileName = file.name;
      const isReadme = inputFileName.endsWith('README.md');
      const outputFileName = isReadme ? 'index.md' : inputFileName;

      await processMarkdown({
        inputPath: path.resolve(apiSrcDir, prefix, inputFileName),
        outputPath: path.resolve(apiOutDir, prefix, outputFileName),
      });
    }
  }

  const additionalDocumentsDir = path.resolve(TMP_DIR, 'documents');
  const additionalDocuments = await fs.readdir(additionalDocumentsDir, {
    withFileTypes: true,
    recursive: true,
  });
  for (const { name, parentPath } of additionalDocuments) {
    const inputPath = path.resolve(parentPath, name);
    const outputPath = path.resolve(DOCS_DIR, name.toLowerCase());

    await processMarkdown({
      inputPath,
      outputPath,
    });
  }
}

main();
