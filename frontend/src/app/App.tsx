import { AppProviders } from './providers/AppProviders.js';
import { AppRouter } from './router/router.js';

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
