# webpack-plugin-pwa-manifest

A Webpack plugin that generates a Web App Manifest, creates all the icons you need, and more!

## Usage
In `webpack.config.js`:
```js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackPluginPWAManifest = require('webpack-plugin-pwa-manifest');
module.exports = {
  entry: 'index.js',
  plugins: [
    new HtmlWebpackPlugin(),
    new WebpackPluginPWAManifest({
      name: 'My Awesome PWA',
      shortName: 'My PWA',
      startURL: './offline',
      theme: '#add8e6',
      generateIconOptions: {
        baseIcon: './public/my-awesome-icon.svg',
        sizes: [192, 384, 512],
        genFavicons: true
      }
    })
  ]
}
```

This will create a `manifest.webmanifest` similar to the following:
```json
{
  "name": "My Awesome PWA",
  "short_name": "My PWA",
  "description": "An awesome PWA to do awesome things",
  "start_url": "./offline",
  "theme_color": "#add8e6",
  "icons": [
    {
      "src": "./my-awesome-icon-192x192.f734j3c21.awebp",
      "sizes": "192x192",
      "type": "image/webp"
    },
    {
      "src": "./my-awesome-icon-192x192.13f4eaa1.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./my-awesome-icon-384x384.83dae89f.webp",
      "sizes": "384x384",
      "type": "image/webp"
    },
    {
      "src": "./my-awesome-icon-384x384.153e4fb7.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "./my-awesome-icon-512x512.429feabc.webp",
      "sizes": "512x512",
      "type": "image/webp"
    },
    {
      "src": "./my-awesome-icon-512x512.c4abb323.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```
In `index.html`, a link to the manifest, an Apple Touch Icon, a Microsoft Tile configuration, and two favicons will be inserted at the top of the `<head>`.

## What?
This package is a plugin for [Webpack](https://webpack.js.org) that creates a web manifest with reasonable defaults and inserts a link into the HTML. More importantly, it handles all icon/favicon generation for you when you provide a base icon, which lets you effortlessly support multiple screen sizes and ensure best practices.

## Why?
Creating web manifests by hand can be annoying and can involve you having to jump through hoops to do simple things such as having an icon set that just works across all devices.

In the case of icon generation, you could manually do it with something like [Real Favicon Generator](https://realfavicongenerator.net), but if you ever change your main icon, you have to run through the entire process again. That's no fun.

Integrating manifest generation into the build pipeline makes life easier. Only minimal configuration is *required*, but if you want you can still customize to your heart's content.

## Documentation

Almost anything that usually goes in a `manifest.json` file can go into the constructor. All parameter names have aliases in the original form from the spec (like `start_url`), in camel case (recommended, like `startUrl`), in kebab case (like `start-url`), and in other reasonable forms (like `startURL`). If you see any inconsistencies in the documentation, it's probably fine; you can use multiple names for the same value.

All parameters that exist in the [MDN documentation for the Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) are aliased, type-checked, and inserted into the manifest whenever provided in the constructor. There are a few reasonable defaults, like `'.'` for `start_url`. Watch out for three changes, though: the removal of the `icons` option to allow icon generation and the modification of the `screenshots` and `shortcuts` options' behavior (detailed below).

If you need to have a parameter not included in that list, put an array of parameter names to keep in the final manifest under the `include` key. If you use an unknown parameter name and don't put it in `include`, the generation will throw an error.

### Changes from standard manifest

The `theme_color` (aka `theme`) will default to white and will change the default behavior of some parts of the icon generation, such as the background color of the Microsoft Tile.

The `screenshots`, unlike in a normal web app manifest, should be an array of screenshot image filepaths or absolute URLs. Do not use relative URLs or they will be confused for filepaths. Each image should be a PNG, JPEG, or WebP file.

Each shortcut in the `shortcuts` should not include an `icons` field but rather a single `icon`, which will automatically be resized according to the icon generation options. The other fields like `name`, `short_name` have aliases.

Instead of manually setting an `icons` parameter containing a set of icons, you should use `genIconOpts` (aka `iconGenerationOptions`, `iconGenOpts`, ...you get the gist). `genIconOpts` will contain the options for icon generation. The parameters for `genIconOpts` are as follows:
#### `baseIcon`
The path to the icon to generate all other icons from. Path is relative to the placement of `webpack.config.js`.
- For best results, use a high-resolution (at least 512x512) PNG or an SVG.
#### `sizes`
An array of pixel values for the sizes to generate. Defaults to `[96, 152, 192, 384, 512]`.
- All PWAs need at least 192px and 512px icons, so those will be added in regardless of whether they are provided in the `sizes` parameter.
#### `shortcutSizes`
An array of pixel values for the sizes of the shortcut icons. Defaults to `[96, 192]`.
- All PWAs need at least 96x shortcut icons, so those will be added in regardless of whether they are provided in the `shortcutSizes` parameter.
#### `formats`
An object whose keys are the desired output formats (in lowercase) and whose values are the configurations to use with the [`sharp`](https://sharp.pixelplumbing.com/en/stable/api-output/#png) package when generating icons of that type. By default, generates WebP and PNG images with somewhat high compression.
- If you prefer the user getting one format over another, put that format first in the object.
- All PWAs need at least PNG, so that's inserted first if you provide your own config. If you don't want it first, put your own `png` key-value pair in your config.
#### `appleTouchIconBG`
The background color for the Apple Touch Icon (to fill transparent regions). Defaults to the theme color.
- Useful because by default, Apple uses black for transparent regions, which doesn't look good with most icons.
- Recommended to use `atib` alias for brevity.
#### `appleTouchIconPadding`
The number of pixels to pad the Apple Touch Icon with on all sides. Defaults to 12.
- Used to account for Apple's courner-rounding.
- Recommended to use `atip` alias for brevity.
#### `genFavicons`
Whether or not to generate 16x16 and 32x32 favicons and insert links in the HTML. Defaults to `false`.
#### `genSafariPinnedTab`
Whether or not to generate a Safari Pinned Tab SVG icon using an autotracer. Defaults to `false`
- Has a significant impact on performance (not managed by `sharp` but by native JavaScript).
- Recommended to use `genPinnedTab` or `gspt` for brevity.
#### `safariPinnedTabColor`
The color for the Safari Pinned Tab icon. Defaults to the theme color (or `'black'` if no theme was manually specified).
- Recommended to use `pinnedTabColor` or `sptc` for brevity.
#### `msTileColor`
The background color for Microsoft Tiles. Defaults to the theme color.
#### `resizeMethod`
The method to use for resizing non-square images. Can be one of `'cover'` (default), `'contain'`, or `'fill'`.
#### `purpose`
An array of possible purposes for the icons. Each element should be one of `'badge'`, `'maskable'`, or `'any'`
#### `disabled`
Disables the manifest creation with no warning.
- Used to speed up builds when icon generation isn't needed (i.e. when developing with HMR)
#### `production` / `development`
The parameters to use when `NODE_ENV` is a certain value. Merged with the outer parameters.
- Useful for disabling/generating less icons in development
- Case-insensitive - use lowercase in options
- Can be anything. `production` and `development` are common, but you could hypothetically set your `NODE_ENV` to `asdf` and have an `asdf` key with custom manifest generation options

The second parameter in the constructor is for extra configuration. As of now, there is only one key, `fingerprint`, which is a boolean value that determines whether to add a fingerprint hash to the image filenames. By default, it is true.

## Advanced: Events
See the [events section for the core package](https://github.com/101arrowz/pwa-manifest/tree/master/packages/core/README.md#Advanced-Events). All events are emitted on the plugin object itself.

Example:
```js
const WebpackPluginPWAManifest = require('webpack-plugin-pwa-manifest');
const opts = require('./config.json'); // Assuming you have some configuration here
const plugin = new WebpackPluginPWAManifest(opts, { fingerprint: true });
plugin.on('appleTouchIconGen', data => {
  // Prevent filename fingerprinting for Apple Touch Icon
  data.filename = Promise.resolve('apple-touch-icon.png');
});
module.exports = {...};
```

The plugin also has hook support, and every event is also a hook. You can get the hooks for a given compilation with the static `getHooks(compilation)` method. The generation events are `SyncHook`s, the rest are `AsyncParallelHook`s.
```js
// In some other plugin...
WebpackPluginPWAManifest.getHooks(compilation).defaultIconGen.tap('PluginName', data => {
  // Do whatever modifications you need
});
```

## Alternatives
Probably the best alternative to this plugin is [`webpack-pwa-manifest`](https://github.com/arthurbergmz/webpack-pwa-manifest). `webpack-plugin-pwa-manifest` was build from the ground up, so there are quite a few differences.

`webpack-plugin-pwa-manifest` supports aliases in camel, snake, and kebab case, while `webpack-pwa-manifest` supports only snake case. `webpack-plugin-pwa-manifest` also type-checks all manifest parameters and throws informative errors if you make a mistake. Lastly, due to the use of `sharp` (Node.js bindings to `libvips`, a C++ native module) instead of `jimp` (a pure JavaScript image manipulation library), you should usually see faster build times with this plugin.

## License
MIT