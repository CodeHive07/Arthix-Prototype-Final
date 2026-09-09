import type { AppProps } from 'next/app';
import '@xyflow/react/dist/style.css';
import '../styles/globals.css';
import '../styles/workspace.css';
import '../styles/arthix-intelligence.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
