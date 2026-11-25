import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary, Footer, Navbar, Skeleton } from './components/Shared';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/montserrat/700.css';
import './styles.css';

const Home = lazy(() => import('./pages/Home'));
const Detail = lazy(() => import('./pages/Detail'));
const Listing = lazy(() => import('./pages/Listing'));
const Search = lazy(() => import('./pages/Search'));
const NotFound = lazy(() => import('./pages/NotFound'));
const OpenFilms = lazy(() => import('./pages/OpenFilms'));
const Browse = lazy(() => import('./pages/Browse'));
const IndonesianFilms = lazy(() => import('./pages/IndonesianFilms'));
const client = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false } } });
function App() {
  const location = useLocation();
  return <><Navbar /><ErrorBoundary key={location.pathname}><Suspense fallback={<main className="container page"><Skeleton /></main>}><Routes location={location}>
    <Route path="/indonesia" element={<IndonesianFilms key={location.pathname} />} /><Route path="/indonesia/:id" element={<IndonesianFilms key={location.pathname} />} />
    <Route path="/" element={<Home />} /><Route path="/films" element={<Listing mode="films" />} /><Route path="/series" element={<Listing mode="series" />} /><Route path="/popular" element={<Listing mode="popular" />} /><Route path="/drakor" element={<Listing mode="drakor" />} /><Route path="/ongoing" element={<Listing key="ongoing" mode="ongoing" />} /><Route path="/tamat" element={<Listing key="tamat" mode="complete" />} /><Route path="/genre/:slug" element={<Listing mode="genre" />} /><Route path="/search" element={<Search />} /><Route path="/jelajah" element={<Browse />} /><Route path="/film-terbuka" element={<OpenFilms />} /><Route path="/film-terbuka/:id" element={<OpenFilms key={location.pathname} />} /><Route path="/:type/:slug" element={<Detail key={location.pathname} />} /><Route path="*" element={<NotFound />} />
  </Routes></Suspense></ErrorBoundary><Footer /></>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={client}><BrowserRouter><App /></BrowserRouter></QueryClientProvider></React.StrictMode>);
