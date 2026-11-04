// Fails when the repository keeps code nobody uses: exports without a user, files nobody imports and CSS classes no component names.
// `tsc` (noUnusedLocals, noUnusedParameters) covers unused locals; this covers what the compiler cannot see across files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Project-specific: directories never scanned, files nobody imports on purpose (the framework loads them) and exports it reads by name.
const skipped = new Set(['node_modules', 'dist', '.git', 'coverage']);
const entryFiles = /(^|\/)main\.ts$/;
const frameworkExports = new Set();

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skipped.has(entry.name)) {
            continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, out);
        } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
            out.push(full);
        }
    }
    return out;
}

const word = (name) => new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`, 'g');
const count = (text, name) => (text.match(word(name)) ?? []).length;

/** Returns human-readable findings; an empty list means the tree is clean. */
export function analyze(root) {
    const rel = (file) => path.relative(root, file).split(path.sep).join('/');
    const files = ['src', 'tests'].flatMap((dir) => (fs.existsSync(path.join(root, dir)) ? walk(path.join(root, dir)) : []));
    const text = new Map(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));
    const code = files.filter((file) => /\.tsx?$/.test(file));
    const source = code.filter((file) => rel(file).startsWith('src/'));
    const findings = [];

    for (const file of source) {
        const body = text.get(file);
        for (const match of body.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/gm)) {
            const name = match[1];
            if (entryFiles.test(rel(file)) && frameworkExports.has(name)) {
                continue;
            }
            const own = count(body, name) - 1;
            let productionUses = 0;
            let testUses = 0;
            for (const other of code) {
                if (other === file) {
                    continue;
                }
                const uses = count(text.get(other), name);
                if (rel(other).startsWith('src/')) {
                    productionUses += uses;
                } else {
                    testUses += uses;
                }
            }
            if (productionUses > 0) {
                continue;
            }
            if (testUses === 0 && own === 0) {
                findings.push(`unused export: ${rel(file)} :: ${name}`);
            } else if (testUses === 0) {
                findings.push(`export used only inside its file (drop the export): ${rel(file)} :: ${name}`);
            } else if (own === 0) {
                findings.push(`code only tests use (delete it or use it in production): ${rel(file)} :: ${name}`);
            }
        }
    }

    const specifiers = [...code].flatMap((file) =>
        [...text.get(file).matchAll(/from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2])
    );
    for (const file of source) {
        const name = rel(file);
        if (entryFiles.test(name)) {
            continue;
        }
        const stem = path.basename(name).replace(/\.tsx?$/, '');
        const folder = path.basename(path.dirname(name));
        if (
            !specifiers.some((spec) =>
                spec.endsWith(`/${stem}`) || (stem === 'index' && spec.endsWith(`/${folder}`)) || spec === `./${stem}`
            )
        ) {
            findings.push(`orphan file nobody imports: ${name}`);
        }
    }

    const sheets = files.filter((file) => file.endsWith('.css'));
    const usage = source.map((file) => text.get(file)).join('\n');
    const seen = new Set();
    for (const sheet of sheets) {
        for (const match of text.get(sheet).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.([a-zA-Z][\w-]*)/g)) {
            const name = match[1];
            if (seen.has(name) || usage.includes(name)) {
                continue;
            }
            seen.add(name);
            const prefixes = [...name.matchAll(/[-_]+/g)].map((hit) => name.slice(0, hit.index + hit[0].length));
            if (!prefixes.some((prefix) => usage.includes(`${prefix}\${`))) {
                findings.push(`CSS class no component uses: ${name} (${rel(sheet)})`);
            }
        }
    }
    return findings;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const findings = analyze(process.cwd());
    if (findings.length > 0) {
        console.error(
            `Dead code found (${findings.length}):\n${
                findings.map((line) => `  - ${line}`).join('\n')
            }\nDelete it: this repository keeps no unused code.`
        );
        process.exit(1);
    }
    console.log('No dead code: every export, file and CSS class has a user.');
}
