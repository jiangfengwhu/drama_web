import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/Home/Home';
import { StoryPlayPage } from './pages/StoryPlay/StoryPlay';
import { StorySetupPage } from './pages/StorySetup/StorySetup';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<StorySetupPage />} />
        <Route path="/play" element={<StoryPlayPage />} />
      </Routes>
    </BrowserRouter>
  );
}
