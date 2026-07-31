import { Navigate, Route, Routes } from 'react-router';
import { HomePage } from './pages/HomePage';
import { UserDetailsPage } from './pages/UserDetailsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/users/:id" element={<UserDetailsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
