import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const commonTypeDocOptions = {
  includeVersion: true,
  searchInComments: true,
  cleanOutputDir: true,
  hideGenerator: true,
  excludePrivate: true,
  excludeProtected: true,
  excludeInternal: true,
  excludeExternals: true,
  categorizeByGroup: false,
  sourceLinkExternal: true,
  mergeReadme: true,
  watch: process.env.TYPEDOC_WATCH,
  sort: ['source-order'],
  navigation: {
    includeCategories: true,
    includeGroups: false,
  },
};

const config: Config = {
  title: 'PicJS',
  tagline: 'An ICP canister testing library for TypeScript and JavaScript.',
  url: 'https://hadronous.github.io',
  baseUrl: '/pic-js',
  organizationName: 'hadronous',
  projectName: 'pic-js',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        ...commonTypeDocOptions,
        id: 'pic-js',
        out: 'docs/pic-js',
        entryPoints: ['../packages/pic/src/index.ts'],
        tsconfig: '../packages/pic/tsconfig.json',
        readme: '../packages/pic/README.md',
        sidebar: {
          indexLabel: 'pic-js',
          pretty: true,
        },
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'PicJS',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guidesSidebar',
          position: 'left',
          label: 'Guides',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API Docs',
        },
        {
          href: 'https://github.com/hadronous/pic-js',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [],
      copyright: `Copyright © ${new Date().getFullYear()} Hadronous Labs.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
