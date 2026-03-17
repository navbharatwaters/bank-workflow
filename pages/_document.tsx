import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preload fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#080f1e"/>
        <meta property="og:title" content="BankFlow — Statement Converter"/>
        <meta property="og:description" content="Convert Kotak Mahindra Bank statements to Excel instantly"/>
        <meta property="og:type" content="website"/>
      </Head>
      <body>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('bankflow-theme') || 'dark';
            if (t === 'light') document.documentElement.classList.add('light');
          } catch(e) {}
        `}}/>
        <Main/>
        <NextScript/>
      </body>
    </Html>
  )
}
