const fs = require('fs');
const path = require('path');
const fontkit = require('fontkit');
const yargs = require('yargs');
const jschardet = require('jschardet');
const CharsetDetector = require('charset-detector');
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
                let en = CharsetDetector.detect(value);
                value = iconv.decode(Buffer.from(value), encoding);
            }
            value = value.replace(/\0+$/g, ''); // I don't know what the fuck am I doing actually...
            if (value.includes('\0')) { // If there's Null Byte, this string might be from UTF-16
                value = iconv.decode(Buffer.from(value), 'utf-16');
            }
            // if (value.includes('\0')) {
            //     value = iconv.decode(value, 'utf32');
            // }
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
            if (fs.statSync(file).size > 1 * 1024 * 1024 * 1024) {
                throw `File size too large.`;
            }
            let font = fontkit.openSync(file);
            if (font.fonts) {
                font = font.fonts[0]; // Font Collection
            }

            if (!font.name) {
                throw `No Name.`;
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
                console.log(`Failed: ${file}`);
                console.log(err);
            }
        }
    }
    console.log('Done.');
})();