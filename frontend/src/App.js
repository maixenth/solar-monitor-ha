import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Dashboard from "./pages/Dashboard";
import Charts from "./pages/Charts";
import Statistics from "./pages/Statistics";
import InverterManagement from "./pages/InverterManagement";
import InverterDetail from "./pages/InverterDetail";
import Settings from "./pages/Settings";
import HomeAssistantConfig from "./pages/HomeAssistantConfig";
import TestAPI from "./pages/TestAPI";
import Sidebar from "./components/Sidebar";
import "@/App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-amber-50">
          <Sidebar />
          <main className="flex-1 ml-64">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/inverters" element={<InverterManagement />} />
              <Route path="/inverters/:id" element={<InverterDetail />} />
              <Route path="/home-assistant" element={<HomeAssistantConfig />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/test-api" element={<TestAPI />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;