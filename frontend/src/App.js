import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import "@/App.css";
import { AppShell } from "@/components/AppShell";
import Home from "@/pages/Home";
import Terms from "@/pages/legal/Terms";
import Privacy from "@/pages/legal/Privacy";
import AiDisclosure from "@/pages/legal/AiDisclosure";
import Credits from "@/pages/legal/Credits";
import ConsoleOverview from "@/pages/ConsoleOverview";
import CustomersPage from "@/pages/CustomersPage";
import CustomerDetail from "@/pages/CustomerDetail";
import OpportunitiesPage from "@/pages/OpportunitiesPage";
import TransactionsPage from "@/pages/TransactionsPage";
import Companion from "@/pages/Companion";
import CarbonEngine from "@/pages/CarbonEngine";
import Methodology from "@/pages/Methodology";
import Evaluation from "@/pages/Evaluation";
import JudgeVerify from "@/pages/JudgeVerify";
import CsvUpload from "@/pages/CsvUpload";

const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
};

function App() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <ScrollManager />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/legal/privacy" element={<Privacy />} />
          <Route path="/legal/ai" element={<AiDisclosure />} />
          <Route path="/credits" element={<Credits />} />
          <Route element={<AppShell />}>
            <Route path="/console" element={<ConsoleOverview />} />
            <Route path="/console/customers" element={<CustomersPage />} />
            <Route path="/console/customers/:id" element={<CustomerDetail />} />
            <Route path="/console/opportunities" element={<OpportunitiesPage />} />
            <Route path="/console/transactions" element={<TransactionsPage />} />
            <Route path="/companion" element={<Companion />} />
            <Route path="/carbon" element={<CarbonEngine />} />
            <Route path="/evaluation" element={<Evaluation />} />
            <Route path="/verify" element={<JudgeVerify />} />
            <Route path="/upload" element={<CsvUpload />} />
            <Route path="/methodology" element={<Methodology />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
