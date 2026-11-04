// @vitest-environment node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root: string = process.cwd();
const script: string = path.join(root, 'scripts', 'dead-code.mjs');
const probe: string = fs.mkdtempSync(path.join(os.tmpdir(), 'dead-code-'));

function runDeadCode(cwd: string): { output: string; status: number | null; } {
    const result = spawnSync('node', [script], { cwd, encoding: 'utf8' });
    return { output: `${result.stdout}${result.stderr}`, status: result.status };
}

function write(file: string, body: string): void {
    fs.mkdirSync(path.dirname(path.join(probe, file)), { recursive: true });
    fs.writeFileSync(path.join(probe, file), body);
}

function linksOf(text: string): string[] {
    return [...text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)].map((match) => match[1]!).filter((target) => !/^[a-z]+:/.test(target));
}

describe('dead code check', () => {
    afterAll(() => fs.rmSync(probe, { force: true, recursive: true }));

    it('keeps the repository free of dead code', () => {
        expect(runDeadCode(root)).toMatchObject({ status: 0 });
    });

    it('reports unused exports, test-only code, orphan files and unused CSS classes', () => {
        write(
            'src/lib/a.ts',
            'export const used = 1;\nexport const nobody = 2;\nexport function onlyTests(): number {\n    return 3;\n}\n'
        );
        write('src/lib/b.ts', "import { used } from './a';\n\nconsole.info(used);\n");
        write('src/styles.css', '.ghost { color: blue; }\n');
        write('tests/a.spec.ts', "import { onlyTests } from '../src/lib/a';\n\nonlyTests();\n");
        const { output, status } = runDeadCode(probe);
        expect(status).toBe(1);
        expect(output).toContain('unused export: src/lib/a.ts :: nobody');
        expect(output).toContain('code only tests use (delete it or use it in production): src/lib/a.ts :: onlyTests');
        expect(output).toContain('orphan file nobody imports: src/lib/b.ts');
        expect(output).toContain('CSS class no component uses: ghost (src/styles.css)');
    });
});

describe('agent documentation', () => {
    const docs: string[] = fs.readdirSync(path.join(root, 'docs')).filter((file) => file.endsWith('.md')).sort();
    const agents: string = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');

    it('keeps AGENTS.md short and links every docs file from it', () => {
        expect(agents.length).toBeLessThan(6000);
        expect(agents).toContain('No dead code');
        for (const file of docs) {
            expect(agents, `AGENTS.md links docs/${file}`).toContain(`(docs/${file})`);
        }
    });

    it('resolves every relative link', () => {
        for (const file of ['AGENTS.md', ...docs.map((name) => `docs/${name}`)]) {
            const text: string = fs.readFileSync(path.join(root, file), 'utf8');
            for (const target of linksOf(text)) {
                expect(fs.existsSync(path.join(root, path.dirname(file), target)), `${file} -> ${target}`).toBe(true);
            }
        }
    });
});
