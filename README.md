# Font Naming

Naming font files by their actual font names.

## Usage

```powershell
node . -f dir/to/inputs -t dir/to/outputs
```

All fonts in `dir/to/inputs` will be copied to `dir/to/outputs` with their new names in format of

```js
${family} ${subfamily}${ext}
```

where `${family}` is the font's actual font name, `${subfamily}` is the font's sub-family name like Regualr, Bold, or Italic, and `${ext}` is the font file's extension.

## Vulnerability

The program rely on fontkit, jschardet and iconv-lite. Errors might occur when reading font file and decoding string. It failed to recognize the encoding (of names' strings) of many font files, and this has been partly "fixed" by giving case-specific testings and workarounds, according only to my use case.

Unless I figure out how to do encoding recognition on font files, instead of charset detection, this problem will be left unsolved because charset detection will always have chance to fail.

You are, however, welcomed to modify the code as you like because this is a liberal project.

## License

[MIT](http://opensource.org/licenses/MIT)

Copyright © ROC 111 (2022), veringsek