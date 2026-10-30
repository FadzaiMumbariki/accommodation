import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

const responsiveGlobalStyles = `
/* Web reset and responsive website enhancements for laptop/desktop viewing */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #FAF7F2;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

#root {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* Make touchable elements feel like real website links and buttons on desktop */
[role="button"], button, a, [data-focusable="true"] {
  cursor: pointer !important;
  user-select: none;
}

/* Elegant scrollbar on desktop */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #F1ECE1;
}
::-webkit-scrollbar-thumb {
  background: #C4622D40;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #C4622D80;
}

/* Selection highlight */
::selection {
  background: #C4622D30;
  color: #1B2B48;
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5"
        />
        <title>ImbaFind — Find Accommodation in Zimbabwe</title>
        <meta
          name="description"
          content="Browse verified flats, houses, cottages and rooms for rent across Harare, Bulawayo and all Zimbabwe. Direct landlord contact, zero broker surcharge."
        />
        <meta name="theme-color" content="#C4622D" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveGlobalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
