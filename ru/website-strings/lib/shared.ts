export const appName = 'OpenSpec';

// Абсолютный базовый URL развёрнутого сайта, используемый для разрешения URL
// изображений Open Graph и социальных сетей. В среде развёртывания (например,
// на Cloudflare Pages) присвойте NEXT_PUBLIC_SITE_URL значение вашего реального
// домена. Резервное значение предусмотрено для локальных сборок и запусков CI,
// где переменная не задана или пуста (в противном случае пустая строка вызвала
// бы сбой `new URL()` во время сборки).
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://openspec-ru.pages.dev';

export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

// Репозиторий исходного кода OpenSpec, используемый для ссылок «изменить эту страницу» и GitHub.
export const gitConfig = {
  user: 'Fission-AI',
  repo: 'OpenSpec',
  branch: 'main',
};

export const links = {
  github: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  discord: 'https://discord.gg/YctCnvvshC',
  npm: 'https://www.npmjs.com/package/@fission-ai/openspec',
  x: 'https://x.com/0xTab',
};
