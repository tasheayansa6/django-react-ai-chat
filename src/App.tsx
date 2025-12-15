import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import HomePage from "./pages/HomePage";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Main layout with sidebar */}
          <Route path="/" element={<MainLayout />}>
            {/* Home page */}
            <Route index element={<HomePage />} />
            {/* New chat */}
            <Route path="chats/new" element={<HomePage />} />
            {/* Individual chat - THIS IS MISSING! */}
            <Route path="chats/:chat_uid" element={<HomePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;