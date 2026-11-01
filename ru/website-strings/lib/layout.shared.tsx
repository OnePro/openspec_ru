import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, links } from './shared';

/** Общие параметры макета для макета документации. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // Сайт содержит только документацию, поэтому логотип ведёт на главную страницу документации,
      // а не на `/` (этот адрес просто перенаправляет туда).
      url: '/docs',
      title: (
        <img
          src="/docs/openspec-pixel.svg"
          alt={appName}
          className="h-3 w-auto dark:invert [#nd-sidebar_&]:ml-2"
        />
      ),
    },
    // Здесь нет ссылки «Документация»: вкладки макета панели навигации уже выполняют её роль.
    links: [
      {
        text: 'Discord',
        url: links.discord,
        external: true,
        on: 'nav',
      },
    ],
    githubUrl: links.github,
  };
}
