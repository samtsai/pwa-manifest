import sharp, { PngOptions, WebpOptions, JpegOptions, TiffOptions, ResizeOptions, Sharp } from 'sharp';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { basename, resolve } from 'path';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
export type FormatOptions = {
  png: PngOptions;
  webp?: WebpOptions;
  jpeg?: JpegOptions;
  tiff?: TiffOptions;
};
export type Verifier = (v: unknown) => boolean;
export type IconEntry = {
  src: string;
  sizes: string;
  type: string;
};
// TODO: Improve
export type PWAManifestOptions = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type MetaConfig = {
  resolveDir: string;
  baseURL: string;
}
export type GeneratedIcons = {
  [k: string]: Buffer
}
// TODO: Improve
export type Manifest = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type BrowserConfig = string;
export type HashFunction = (v: string) => string;
export type HashMethod = 'name' | 'content' | 'none';
type Generation = {
  browserConfig: string;
  generatedIcons: GeneratedIcons;
}
export default class PWAManifestGenerator extends EventEmitter {
  private disabled: boolean;
  private insertInto: string[];
  private name: string;
  private shortName: string;
  private desc: string;
  private startURL: string;
  private scope: string;
  private theme: string;
  private intBaseIconName: string;
  private intHashFunction: HashFunction = v => createHash('md5').update(v).digest('hex');
  set hashFunction(v: HashFunction) {
    this.intHashFunction = v;
  }
  get baseIconName() {
    return this.intBaseIconName;
  }
  private baseIcon: Sharp;
  private sizes: number[];
  private formats: FormatOptions;
  private resizeOptions: ResizeOptions;
  private appleTouchIconBG: string;
  private appleTouchIconPadding: number;
  private doGenFavicons: boolean;
  private extraParams: PWAManifestOptions;
  private defaultHashMethod: HashMethod = 'name';
  private icons: IconEntry[] = [];
  set hashMethod(v: HashMethod) {
    this.defaultHashMethod = v;
  }
  generatedIcons: GeneratedIcons = {};
  manifest: Manifest = {};
  html: string;
  private intBrowserConfig: BrowserConfig;
  get browserConfig() {
    return `<?xml version="1.0" encoding="utf-8"?><browserconfig><msapplication><tile>${this.intBrowserConfig}</tile></msapplication></browserconfig>`;
  }
  private meta: MetaConfig;

  // eslint-disable @typescript-eslint/no-explicit-any
  constructor(opts: PWAManifestOptions, meta: MetaConfig, fallback: any) {
    super();
    this.meta = meta;
    const opt = (src: any, keys: string[]): any => {
      for (const k of keys) {
        const v = src[k];
        if (typeof v !== 'undefined')
          return v;
      }
      if (fallback)
        return fallback[keys[0]];
    }
    // eslint-enable @typescript-eslint/no-explicit-any

    // istanbul ignore next
    if (typeof opts !== 'object') {
      if (typeof opts === 'undefined')
        throw 'No PWA Manifest options found in package.json.';
      throw 'The PWA Manifest parameter in package.json must be an object containing the desired parameters.';
    }
    const env = process.env.NODE_ENV;
    if (env && opts[env.toLowerCase()]) {
      const { [env.toLowerCase()]: envOpts, ...otherOpts } = opts;
      // istanbul ignore next
      if (typeof envOpts !== 'object') {
        throw `The specific options for environment "${env}" must be an object containing the desired parameters.`;
      }
      opts = {
        ...otherOpts,
        ...envOpts
      };
    };

    const disabled = opt(opts, ['disable', 'disabled']) || false;
    // istanbul ignore next
    if (typeof disabled !== 'boolean')
      throw 'The disable option in the PWA manifest options must be a boolean.';
    this.disabled = disabled;

    let insertInto = opt(opts, ['insertInto', 'insert-into']);
    // istanbul ignore next
    if (!(insertInto instanceof Array && (insertInto = insertInto.map(str => resolve(meta.resolveDir, str))) && insertInto.every((el: string) => existsSync(el))))
      throw 'The paths to HTML files provided in the PWA manifest options must exist.';
    this.insertInto = insertInto;

    const name = opts.name; // || pkg.name
    // istanbul ignore next
    if (typeof name !== 'string') {
      if (typeof name === 'undefined')
        throw 'No name was found in the options.';
      throw 'The name provided in the options must be a string.';
    }
    this.name = name;

    const shortName = opt(opts, ['shortName', 'short-name', 'short_name']) || name;
    // istanbul ignore next
    if (typeof shortName !== 'string')
      throw 'The short name provided in the options must be a string.';

    this.shortName = shortName;

    const desc = opt(opts, ['desc', 'description']) || ''; // || pkg.description
    // istanbul ignore next
    if (typeof desc !== 'string')
      throw 'The description provided in the options must be a string.';
    this.desc = desc;

    const startURL = opt(opts, ['startURL', 'startUrl', 'start-url', 'start_url']) || meta.baseURL;
    // istanbul ignore next
    if (typeof startURL !== 'string')
      throw 'The start URL provided in the options must be a string.';
    this.startURL = startURL;

    const scope = opt(opts, ['scope']) || meta.baseURL;
    // istanbul ignore next
    if (typeof scope !== 'string')
      throw 'The scope provided in the options must be a string.';
    this.scope = scope;

    const theme = opt(opts, ['themeColor', 'theme-color', 'theme_color', 'theme']) || 'white';
    // istanbul ignore next
    if (typeof theme !== 'string')
      throw 'The theme color provided in the options must be a string representing a valid CSS color.';
    this.theme = theme;

    const genIconOpts = opt(opts, ['genIcon', 'gen-icon', 'iconGen', 'icon-gen', 'genIconOpts', 'gen-icon-opts', 'iconGenOpts', 'icon-gen-opts', 'generateIconOptions', 'generate-icon-options', 'iconGenerationOptions', 'icon-generation-options', 'icons']);
    // istanbul ignore next
    if (typeof genIconOpts !== 'object') {
      if (typeof genIconOpts === 'undefined')
        throw 'No icon generation options found in the PWA manifest options.';
      throw 'The icon generation options in the PWA manifest options must be an object containing the desired parameters.';
    }

    const msTileColor = opts(genIconOpts, ['msTileColor', 'ms-tile-color', 'microsoftTileColor', 'microsoft-tile-color']) || theme;
    // istanbul ignore next
    if (typeof msTileColor !== 'string')
      throw 'The Microsoft tile color provided in the options must be a string representing the theme color for the application.';
    this.intBrowserConfig = `<TileColor>${msTileColor}</TileColor>`;
    const baseIconPath = opt(genIconOpts, ['baseIcon', 'base-icon', 'fromIcon', 'from-icon']);
    // istanbul ignore next
    if (typeof baseIconPath !== 'string') {
      if (typeof baseIconPath === 'undefined')
        throw 'No base icon was found in the icon generation options.';
      throw 'The base icon parameter in the icon generation options must be a string that contains the path to the icon.';
    }

    const baseIconName = basename(
      baseIconPath,
      baseIconPath.slice(baseIconPath.lastIndexOf('.'))
    );
    const baseIconFullPath = resolve(meta.resolveDir, baseIconPath);
    // istanbul ignore next
    if (!existsSync(baseIconFullPath))
      throw 'No icon was found at the base icon path ' + baseIconPath + '.';
    this.intBaseIconName = baseIconName;

    let sizes = [96, 152, 192, 384, 512]; // Common sizes
    const tmpSizes = opt(genIconOpts, ['sizes', 'sizeList', 'size-list']);
    // istanbul ignore next
    if (
      tmpSizes instanceof Array &&
      tmpSizes.every((v: unknown) => typeof v === 'number')
    )
      sizes = [...new Set(tmpSizes.concat(192, 512))] as number[];
    // Needed in all PWAs
    else if (typeof tmpSizes !== 'undefined')
      throw 'The sizes parameter in the icon generation options must be an array of numeric pixel values for sizes of the images.';
    this.sizes = sizes;

    let formats: FormatOptions = {
      webp: {
        quality: 60,
        reductionEffort: 6
      },
      png: {
        compressionLevel: 9
      }
    };
    const tmpFormats = opt(genIconOpts, ['formats', 'formatList', 'format-list']);
    // istanbul ignore next
    if (
      tmpFormats instanceof Object &&
      Object.keys(tmpFormats).every(v =>
        ['png', 'jpeg', 'webp', 'tiff'].includes(v)
      )
    )
      formats = {
        png: formats.png,
        ...tmpFormats
      };
    // PNG needed in all PWAs
    else if (typeof tmpFormats !== 'undefined')
      throw 'The formats parameter in the icon generation options must be an object with each key being a supported file type (png, webp, jpeg, or tiff) for the output images, and each value being the options to pass to sharp.';
    this.formats = formats;
    const resizeMethod = opt(genIconOpts, ['resizeMethod', 'resize-method', 'resize']) || 'cover';
    // istanbul ignore next
    if (!['cover', 'contain', 'fill'].includes(resizeMethod as string))
      throw "The resize method parameter in the icon generation options must be one of 'cover', 'contain', or 'fill'.";
    this.resizeOptions = {
      fit: resizeMethod as 'cover' | 'contain' | 'fill',
      background: 'rgba(0, 0, 0, 0)'
    };
    this.baseIcon = sharp(baseIconFullPath).ensureAlpha();
    this.html = `<meta name="msapplication-config" content="${meta.baseURL}browserconfig.xml"><meta name="theme-color" content="${theme}">`
    const appleTouchIconBG = opt(genIconOpts, ['appleTouchIconBG', 'appleTouchIconBg', 'apple-touch-icon-bg', 'appleTouchIconBackground', 'apple-touch-icon-background', 'atib']) || theme;
    // istanbul ignore next
    if (typeof appleTouchIconBG !== 'string')
      throw 'The Apple Touch Icon background color parameter must be a string representing a valid CSS color.';
    this.appleTouchIconBG = appleTouchIconBG;
    const appleTouchIconPadding = opt(genIconOpts, ['appleTouchIconPadding', 'apple-touch-icon-padding', 'atip']) || 12;
    // istanbul ignore next
    if (typeof appleTouchIconPadding !== 'number')
      throw 'The Apple Touch Icon padding parameter must be a number of pixels to pad the image with on each side.';
    this.appleTouchIconPadding = appleTouchIconPadding;
    const genFavicons = opt(genIconOpts, ['genFavicons', 'gen-favicons', 'generateFavicons', 'generate-favicons']);
    // istanbul ignore next
    if (!['boolean', 'undefined'].includes(typeof genFavicons))
      throw 'The favicon generation option in the icon generation options must be a boolean.';
    this.doGenFavicons = genFavicons;
    // No custom modifications for the rest of the common parameters, so we just do type checking
    const extraParams: PWAManifestOptions = {};
    const extraTypes: [string[], string | Verifier, unknown?][] = [
      [
        [
          'background_color',
          'backgroundColor',
          'background-color',
          'bgColor',
          'bg-color',
          'bg'
        ],
        'string',
        theme
      ],
      [
        ['categories'],
        v => v instanceof Array && v.every(el => typeof el === 'string')
      ],
      [
        ['dir', 'direction', 'textDirection', 'text-direction'],
        v => ['rtl', 'ltr', 'auto'].includes(v as string)
      ],
      [
        ['display', 'displayMode', 'display-mode'],
        v =>
          ['standalone', 'minimal-ui', 'fullscreen', 'browser'].includes(
            v as string
          ),
        'standalone'
      ],
      [
        [
          'iarc_rating_id',
          'iarc',
          'iarcId',
          'iarcID',
          'iarc-id',
          'iarcRatingId',
          'iarcRatingID',
          'iarc-rating-id',
          'iarcRating',
          'iarc-rating'
        ],
        'string'
      ],
      [['lang', 'language'], 'string'],
      [
        ['orientation', 'rotated', 'screenOrientation', 'screen-orientation'],
        v =>
          [
            'any',
            'natural',
            'landscape',
            'landscape-primary',
            'landscape-secondary',
            'portrait',
            'portrait-primary',
            'portrait-secondary'
          ].includes(v as string)
      ],
      [
        [
          'prefer_related_applications',
          'preferRelated',
          'prefer-related',
          'preferRelatedApplications',
          'prefer-related-applications'
        ],
        'boolean'
      ],
      [
        [
          'related_applications',
          'related',
          'relatedApplications',
          'related-applications'
        ],
        v =>
          v instanceof Array && v.every(el => typeof el === 'object' && el.url)
      ],
      [
        ['screenshots', 'screenShots', 'screen-shots'],
        v =>
          v instanceof Array && v.every(el => typeof el === 'object' && el.src)
      ],
      [
        ['serviceworker', 'sw', 'serviceWorker', 'service-worker'],
        v => typeof v === 'object' && !!v && v.hasOwnProperty('src')
      ]
    ];
    for (const type of extraTypes) {
      let val;
      for (const paramName of type[0]) {
        val = opts[paramName];
        if (typeof val !== 'undefined') break;
      }
      if (typeof val === 'undefined') {
        if (type[2])
          // Default
          extraParams[type[0][0]] = type[2];
        continue;
      }
      let checker: Verifier;
      if (typeof type[1] === 'string') checker = v => typeof v === type[1];
      else checker = type[1];
      // istanbul ignore next
      if (!checker(val))
        throw 'Parameter "' + type[0][0] + '" provided in the options is invalid. Please check the official MDN documentation on the Web App Manifest.';
      extraParams[type[0][0]] = val;
    }

    // When this config inevitably becomes outdated, use the include parameter to include any new parameters relevant to the Web App Manifest.
    const include = opt(opts, ['include', 'includeParams', 'include-params']);
    // istanbul ignore next
    if (include instanceof Array && include.every(v => typeof v === 'string')) {
      for (const param of include) {
        extraParams[param] = opts[param];
      }
    } else if (typeof include !== 'undefined')
      throw 'The include parameter in the options must be an array of extra parameter names to include in the final manifest.';
    
    this.extraParams = extraParams;
  }

  private fingerprint(filename: string, buf: Buffer | string, method: HashMethod = this.defaultHashMethod): string {
    const i = filename.lastIndexOf('.');
    const base = filename.slice(0, i);
    const ext = filename.slice(i + 1);
    return (
      base +
      '.' +
      method === 'name' ? this.intHashFunction('_parcel-plugin-pwa-manifest' + filename).slice(-8) + '.' : method === 'content' ? this.intHashFunction(buf.toString()).slice(-8) + '.' : '' +
      ext
    ); // Similar to (but not the same as) Parcel itself
  };

  async generate(): Promise<Generation | void> {
    if (this.disabled) return;
    this.emit('start');
    await this.genDefaultIcons();
    if (this.doGenFavicons) await this.genFavicons();
    await this.genAppleTouchIcon();
    await this.genMsTileIcons();
    await this.genManifest();
    await this.injectHTML();
    this.emit('end');
    return {
      browserConfig: this.browserConfig,
      generatedIcons: this.generatedIcons
    };
  }
  async genDefaultIcons() {
    this.emit('defaultIconsStart', `Generating icons for ${this.name}...`);
    for (const size of this.sizes) {
      const icon = this.baseIcon.clone().resize(size, size, this.resizeOptions);
      const saveSize = size + 'x' + size;
      for (let format of Object.keys(this.formats) as Array<keyof FormatOptions>) {
        // Ugly but TS is not very smart
        format = format;
        let buf;
        try {
          buf = await icon
            .clone()
            [format](this.formats[format])
            .toBuffer();
        } catch (e) {
          // istanbul ignore next
          throw 'An unknown error ocurred during the icon creation process: ' + e;
        }
        const filename = this.fingerprint(
          this.baseIconName + '-' + saveSize + '.' + format,
          buf
        );
        this.generatedIcons[filename] = buf;
        this.icons.push({
          src: this.meta.baseURL + filename,
          sizes: saveSize,
          type: 'image/' + format
        });
      }
    }
    this.emit('defaultIconsEnd');
  }
  async genAppleTouchIcon() {
    this.emit('appleTouchIconStart', 'Generating Apple Touch Icon...');
    let buf: Buffer;
    const atiSize = 180 - 2 * this.appleTouchIconPadding;
    try {
      const appleTouchIconTransparent = await this.baseIcon
        .clone()
        .resize(atiSize, atiSize, this.resizeOptions)
        .extend({
          top: this.appleTouchIconPadding,
          bottom: this.appleTouchIconPadding,
          left: this.appleTouchIconPadding,
          right: this.appleTouchIconPadding,
          background: 'rgba(0, 0, 0, 0)'
        })
        .toBuffer();
      buf = await sharp(appleTouchIconTransparent)
        .flatten({ background: this.appleTouchIconBG })
        .png(this.formats.png || {})
        .toBuffer();
    } catch (e) {
      // istanbul ignore next
      throw 'An unknown error ocurred during the Apple Touch Icon creation process: ' + e;
    }
    const atiname = this.fingerprint('apple-touch-icon.png', buf);
    this.generatedIcons[atiname] = buf;
    this.html += `<link rel="apple-touch-icon" sizes="180x180" href="${this.meta.baseURL + atiname}">`;
    this.emit('appleTouchIconEnd');
  }
  async genFavicons() {
    this.emit('faviconStart', 'Generating favicons...');
    for (const size of [32, 16]) {
      let favicon: Buffer;
      try {
        favicon = await this.baseIcon
          .clone()
          .resize(size, size, this.resizeOptions)
          .png(this.formats.png || {})
          .toBuffer();
      } catch (e) {
        // istanbul ignore next
        throw 'An unknown error ocurred during the favicon creation process: ' + e;
      }
      const sizes = size + 'x' + size;
      const filename = this.fingerprint('favicon-' + sizes + '.png', favicon);
      this.generatedIcons[filename] = favicon;
      this.html += `<link rel="icon" sizes="${sizes}" href="${this.meta.baseURL + filename}">`;
    }
    this.emit('faviconEnd');
  }
  async genMsTileIcons() {
    this.emit('msTileStart', 'Generating Microsoft Tile Icons...');
    for (const size of [70, 150, 310]) {
      let msTile: Buffer;
      try {
        msTile = await this.baseIcon
          .clone()
          .resize(size, size, this.resizeOptions)
          .png(this.formats.png || {})
          .toBuffer();
      } catch (e) {
        // istanbul ignore next
        throw 'An unknown error ocurred during the Microsoft Tile Icon creation process: ' + e;
      }
      const sizes = size + 'x' + size;
      const filename = this.fingerprint('mstile-' + sizes + '.png', msTile);
      this.generatedIcons[filename] = msTile;
      this.intBrowserConfig += `<square${sizes}logo src="${this.meta.baseURL + filename}"/>`;
    }
    let rectMsTile: Buffer;
    try {
      rectMsTile = await this.baseIcon
        .clone()
        .resize(310, 150, this.resizeOptions)
        .png(this.formats.png || {})
        .toBuffer();
    } catch (e) {
      // istanbul ignore next
      throw (
        'An unknown error ocurred during the Microsoft Tile Icon creation process: ' +
          e
      );
    }
    const rectMsTileFilename = this.fingerprint('mstile-310x150.png', rectMsTile);
    this.generatedIcons[rectMsTileFilename] = rectMsTile;
    this.intBrowserConfig += `<wide310x150logo src="${this.meta.baseURL + rectMsTileFilename}"/>`;
    this.emit('msTileEnd');
  }
  async genManifest() {
    this.manifest = {
      name: this.name,
      short_name: this.shortName,
      start_url: this.startURL,
      scope: this.scope,
      ...(this.desc && { description: this.desc }),
      icons: this.icons,
      theme_color: this.theme,
      ...this.extraParams
    };
    this.html += `<link rel="manifest" href="${this.meta.baseURL}manifest.webmanifest">`;
  }
  async injectHTML() {
    this.emit('htmlStart', 'Inserting links into HTML...');
    for (const out of this.insertInto) {
      let htmlString = readFileSync(out)
        .toString()
        .replace(
          /<link rel="(manifest|icon|apple-touch-icon)"(.*?)>|<meta name="(msapplication(.*?)|theme-color)"(.*?)>/g,
          ''
        );
      const insertBefore = htmlString.search(/(?<=<head>)|<\/head>/); // Prefer at the start, but end is acceptable too.
      // istanbul ignore next
      if (insertBefore === -1)
        throw 'Could not find head tag in HTML file and therefore cannot insert necessary HTML.';
      writeFileSync(out, htmlString.slice(0, insertBefore) + this.html + htmlString.slice(insertBefore));
    }
    this.emit('htmlEnd');
  }
}