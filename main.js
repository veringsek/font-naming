const fs = require('fs');
const path = require('path');
const fontkit = require('fontkit');
const yargs = require('yargs');
const jschardet = require('jschardet');
const iconv = require('iconv-lite');

let argv = yargs.option('from', {
    alias: 'f',
    description: 'Location of source font files.',
    type: 'string'
}).option('to', {
    alias: 't',
    description: 'Location where new font files are copied to.',
    type: 'string'
}).help().argv;

async function* getFiles(dir) {
    let items = fs.readdirSync(dir, {
        withFileTypes: true
    });
    for (let item of items) {
        let p = path.join(dir, item.name);
        if (item.isDirectory()) {
            yield* getFiles(p);
        } else {
            yield p;
        }
    }
}

function i18n(object, locales) {
    for (let l of locales) {
        if (l in object) {
            let value = object[l];
            if (Buffer.isBuffer(value)) {
                let encoding = jschardet.detect(value) ?? 'SHIFT_JIS';
                value = iconv.decode(value, encoding);
            }
            return value;
        }
    }
}

const input = path.resolve(argv.from ?? '.');
const output = path.resolve(argv.to ?? './output');
const locales = ['zh-TW', 'zh', 'zh-CN', 'ja', 'en'];

(async () => {
    for await (let file of getFiles(input)) {
        try {
            let font = fontkit.openSync(file);
            if (font.fonts) {
                font = font.fonts[0]; // Font Collection
            }

            if (!font.name) {
                console.log(font);
            }

            let n = font.name.records;
            const family = i18n(n.fontFamily, locales);
            const subfamily = i18n(n.fontSubfamily, locales);
            const fullname = i18n(n.fullName, locales);
            const postscriptName = i18n(n.postscriptName, locales);

            for (let any of [family, subfamily, fullname, postscriptName]) {
                if (!any) throw `Empty Names.`;
            }

            let ext = path.extname(file);
            let relativePath = path.relative(input, file);
            let newDir = path.dirname(path.join(output, relativePath));
            let newName = `${family} ${subfamily}${ext}`;

            let newPath = path.join(newDir, newName);
            if (!fs.existsSync(newDir)) {
                fs.mkdirSync(newDir, {
                    recursive: true
                });
            }
            fs.copyFile(file, newPath, err => {
                if (err) console.log(err);
            });
            console.log(`Complete: ${newName}`);
        } catch (err) {
            if (err.message === `Unknown font format`) {
                continue;
            } else {
                console.log(err);
            }
        }
    }
    console.log('Done.');
})();