/* eslint-disable @typescript-eslint/no-var-requires */
const outerFs = require('fs').promises;
const path = require('path');
const taxiosGenerate = require('./dist/index').default;

const generatedDir = path.resolve('./generated');

const removeGeneratedDir = () => {
  return outerFs
    .stat(generatedDir) // exists
    .catch(() => {
      return null;
    })
    .then((stats) => {
      if (!stats) return;
      return outerFs.rmdir(generatedDir, { recursive: true });
    });
};

beforeAll(removeGeneratedDir);
afterAll(removeGeneratedDir);

describe('Taxios Generate (without CLI)', () => {
  describe('Generate without output path', () => {
    test('When minimal config passed and inputPath is external link, then result contains "PetstoreAPI"', async () => {
      const result = await taxiosGenerate({
        exportName: 'PetstoreAPI',
        inputPath: 'https://petstore.swagger.io/v2/swagger.json',
      });

      expect(result).toContain('PetstoreAPI');
    });

    test('When full config passed and inputPath is external link, then result contains "PetstoreAPI"', async () => {
      const result = await taxiosGenerate({
        exportName: 'PetstoreAPI',
        inputPath: 'https://petstore.swagger.io/v2/swagger.json',
        skipValidate: true,
        sortFields: true,
        unionEnums: true,
        keepAdditionalProperties: true,
      });

      expect(result).toContain('PetstoreAPI');
    });
  });

  describe('Generate with output path', () => {
    const outputPath = path.resolve(generatedDir, './PetstoreAPI.ts');

    test(`When minimal config passed and inputPath is external link, then result emits in ${outputPath} file`, async () => {
      await taxiosGenerate({
        exportName: 'PetstoreAPI',
        inputPath: 'https://petstore.swagger.io/v2/swagger.json',
        outputPath,
      });

      const stats = await outerFs.stat(outputPath);

      expect(stats).not.toBeNull();
    });

    test(`When minimal config passed and inputPath is external link, then emitted result in ${outputPath} file contains "PetstoreAPI"`, async () => {
      await taxiosGenerate({
        exportName: 'PetstoreAPI',
        inputPath: 'https://petstore.swagger.io/v2/swagger.json',
        outputPath,
      });

      const result = await outerFs.readFile(outputPath, { encoding: 'utf8' });

      expect(result).toContain('PetstoreAPI');
    });
  });
});
