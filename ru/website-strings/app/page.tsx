// Этот сайт содержит только документацию; маркетинговая/целевая страница находится в
// отдельном репозитории. Статический экспорт не может сам выполнять HTTP-перенаправления, поэтому
// Cloudflare Pages обрабатывает `/` через public/_redirects; эта страница с meta-refresh
// служит запасным вариантом для локальных предпросмотров и хостов, игнорирующих _redirects.
export default function Home() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/docs/ru" />
      <p>
        Перенаправление к <a href="/docs/ru">обзору OpenSpec RU</a>…
      </p>
    </>
  );
}
