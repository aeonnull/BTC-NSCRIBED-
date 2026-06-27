import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Home from "@/components/Home";
import Profile from "@/components/Profile";
import Collection from "@/components/Collection";
import EditProfile from "@/components/EditProfile";
import Access from "@/components/Access";
import AuthCallback from "@/components/AuthCallback";

function App() {
  return (
    <div className="ns-root">
      <AuthProvider>
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/edit" element={<EditProfile />} />
            <Route path="/access" element={<Access />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/:handle/c/:cid" element={<Collection />} />
            <Route path="/:handle" element={<Profile />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
