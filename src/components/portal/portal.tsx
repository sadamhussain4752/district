"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AnalyticsScreen,
  ApplicantsScreen,
  DistrictScreen,
  LeadsScreen,
  ModuleScreen,
} from "./screens";
import { GeoDirectoryScreen, POFormatScreen } from "./admin-screens";
import {
  BeneficiariesScreen,
  ExpensesScreen,
  InventoryScreen,
} from "./core-screens";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  FileText,
  Folder,
  Home,
  Layers3,
  LogOut,
  MapPin,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type Screen =
  | "district"
  | "analytics"
  | "beneficiaries"
  | "leads"
  | "applicants"
  | "projects"
  | "expenses"
  | "receipts"
  | "downloads"
  | "documents"
  | "users";
const nav: [Screen, string, typeof Home][] = [
  ["district", "District view", Home],
  ["analytics", "Reports & analytics", BarChart3],
  ["beneficiaries", "Beneficiaries", Users],
  ["leads", "Leads & applicants", Layers3],
  ["projects", "Projects", BriefcaseBusiness],
  ["expenses", "Expenses", FileText],
  ["receipts", "PO format", ReceiptText],
  ["downloads", "Inventory", Download],
  ["documents", "Geo directory", Folder],
  ["users", "Administration", UserPlus],
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#168548] text-white shadow-sm">
        <Home size={21} />
      </span>
      <div>
        <div className="text-[25px] font-black leading-6 tracking-tight text-[#642917]">
          ఇందిరమ్మ ఇండ్లు
        </div>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[.2em] text-slate-400">
          Government of Telangana
        </p>
      </div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 4) {
      setError("Enter a valid work email and password.");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 650);
  }
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#f5f7fb] lg:grid-cols-[1.1fr_.9fr]">
      <div className="relative hidden flex-col justify-between bg-[#102d22] p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%,#4ade80 0,transparent 28%),radial-gradient(circle at 80% 75%,#f59e0b 0,transparent 25%)",
          }}
        />
        <div className="relative">
          <Brand />
          <div className="mt-24 max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-300">
              Indiramma Illu Management Tool
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.12]">
              Every home.
              <br />
              Every beneficiary.
              <br />
              <span className="text-emerald-300">One clear view.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-emerald-50/70">
              A unified administration console for beneficiary registration,
              construction monitoring, finance, materials and statewide
              reporting.
            </p>
          </div>
        </div>
        <div className="relative flex gap-8 text-xs text-emerald-100/60">
          <span>33 Districts</span>
          <span>606 Mandals</span>
          <span>10,703 Villages</span>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,.1)] sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">
              Secure access
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to the Head Office management console.
            </p>
            <form onSubmit={submit} className="mt-8 space-y-5">
              <label className="block text-sm font-semibold text-slate-700">
                Work email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="text"
                  autoComplete="username"
                  placeholder="name@organization.com"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Password
                <div className="relative mt-2">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-12 w-full rounded-xl border border-slate-200 px-4 pr-12 font-normal outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-3 top-3 text-slate-400"
                  >
                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-500">
                  <input type="checkbox" />
                  Remember me
                </label>
                <button
                  type="button"
                  className="font-semibold text-emerald-700"
                >
                  Forgot password?
                </button>
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                  {error}
                </p>
              )}
              <button
                disabled={loading}
                className="h-12 w-full rounded-xl bg-[#168548] text-sm font-bold text-white shadow-lg shadow-emerald-800/15 transition hover:bg-[#116d3b] disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in to console"}
              </button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            EESHA INFRA GLOBAL PRIVATE LIMITED · Version 1.0.0
          </p>
        </div>
      </div>
    </main>
  );
}

export function Portal() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("district");
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarOpen = sidebarExpanded || sidebarHovered || mobile;
  useEffect(() => {
    setLoggedIn(sessionStorage.getItem("indiramma-session") === "active");
    const requested = window.location.hash.slice(1) as Screen;
    if (nav.some(([id]) => id === requested)) setScreen(requested);
  }, []);
  useEffect(() => {
    if (loggedIn) window.history.replaceState(null, "", `#${screen}`);
  }, [screen, loggedIn]);
  if (!loggedIn)
    return (
      <Login
        onLogin={() => {
          sessionStorage.setItem("indiramma-session", "active");
          setLoggedIn(true);
        }}
      />
    );
  const page =
    screen === "district" ? (
      <DistrictScreen onReports={() => setScreen("analytics")} />
    ) : screen === "analytics" ? (
      <AnalyticsScreen />
    ) : screen === "beneficiaries" ? (
      <BeneficiariesScreen />
    ) : screen === "leads" ? (
      <LeadsScreen onApplicants={() => setScreen("applicants")} />
    ) : screen === "applicants" ? (
      <ApplicantsScreen />
    ) : screen === "expenses" ? (
      <ExpensesScreen />
    ) : screen === "downloads" ? (
      <InventoryScreen />
    ) : screen === "receipts" ? (
      <POFormatScreen />
    ) : screen === "documents" ? (
      <GeoDirectoryScreen />
    ) : (
      <ModuleScreen
        title={nav.find((n) => n[0] === screen)?.[1] || "Module"}
        icon={nav.find((n) => n[0] === screen)?.[2] || FileText}
      />
    );
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800">
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-gradient-to-r from-orange-400 via-slate-900 to-green-700" />
      <header className="fixed inset-x-0 top-1 z-40 flex h-[76px] items-center border-b border-slate-200 bg-white px-5 md:px-8">
        <button
          className="mr-3 rounded-lg p-2 md:hidden"
          onClick={() => setMobile(true)}
          aria-label="Open menu"
        >
          <Menu />
        </button>
        <Brand />
        <button
          onClick={() => setSidebarExpanded((value) => !value)}
          aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className="ml-6 hidden rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 md:block"
        >
          {sidebarExpanded ? (
            <PanelLeftClose size={19} />
          ) : (
            <PanelLeftOpen size={19} />
          )}
        </button>
        <div className="ml-auto flex items-center gap-4">
          <button
            aria-label="Toggle dark mode"
            className="rounded-full p-2 text-teal-600 hover:bg-teal-50"
          >
            <Moon size={21} />
          </button>
          <button className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800">
            K ARJUN <ChevronDown size={15} />
          </button>
        </div>
      </header>
      {mobile && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/30 md:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`fixed bottom-0 left-0 top-[81px] z-40 overflow-y-auto border-r border-slate-200 bg-white transition-[width,transform,box-shadow] duration-300 ${sidebarOpen ? "w-[270px] shadow-[12px_0_35px_rgba(15,23,42,.10)]" : "w-[96px]"} ${mobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <button
          onClick={() => setMobile(false)}
          className="absolute right-3 top-3 md:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
        <p
          className={`pb-3 pt-7 text-[10px] font-bold tracking-[.18em] text-slate-400 ${sidebarOpen ? "px-6 text-left" : "text-center"}`}
        >
          {sidebarOpen ? "MENU" : "•••"}
        </p>
        <nav className="space-y-1 px-3">
          {nav.map(([id, label, Icon], index) => (
            <div key={id}>
              {index === 3 && sidebarOpen && (
                <p className="mb-2 mt-5 px-3 text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">
                  Operations
                </p>
              )}
              {index === 6 && sidebarOpen && (
                <p className="mb-2 mt-5 px-3 text-[9px] font-bold uppercase tracking-[.18em] text-slate-400">
                  Configuration
                </p>
              )}
              <button
                title={label}
                onClick={() => {
                  if (id === "leads") {
                    setRecordsOpen((v) => !v);
                    setScreen("leads");
                  } else setScreen(id);
                  setMobile(false);
                }}
                className={`flex h-12 w-full items-center rounded-xl text-left text-sm font-semibold transition ${sidebarOpen ? "gap-3 px-4" : "justify-center px-0"} ${screen === id || (id === "leads" && (screen === "leads" || screen === "applicants")) ? "bg-blue-50 text-blue-600 shadow-[inset_3px_0_0_#3b82f6]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
              >
                <Icon size={19} />
                {sidebarOpen && <span>{label}</span>}
                {id === "leads" && sidebarOpen && (
                  <ChevronDown className="ml-auto" size={14} />
                )}
              </button>
              {id === "leads" && recordsOpen && sidebarOpen && (
                <div className="ml-8 mt-1 space-y-1 border-l border-slate-200 pl-3">
                  <button
                    onClick={() => {
                      setScreen("leads");
                      setRecordsOpen(false);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
                  >
                    Leads register
                  </button>
                  <button
                    onClick={() => {
                      setScreen("applicants");
                      setRecordsOpen(false);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
                  >
                    Applicants
                  </button>
                </div>
              )}
            </div>
          ))}
          <div className="my-4 border-t border-slate-100" />
          <button
            onClick={() => {
              sessionStorage.removeItem("indiramma-session");
              window.history.replaceState(null, "", window.location.pathname);
              setLoggedIn(false);
            }}
            title="Logout"
            className={`flex h-12 w-full items-center rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 ${sidebarOpen ? "gap-3 px-4" : "justify-center px-0"}`}
          >
            <LogOut size={19} />
            {sidebarOpen && "Sign out"}
          </button>
        </nav>
        <div
          className={`m-4 mt-8 rounded-2xl bg-[#102d22] p-4 text-white ${sidebarOpen ? "block" : "hidden"}`}
        >
          <p className="text-xs font-bold">Indiramma Help Desk</p>
          <p className="mt-1 text-[10px] leading-4 text-emerald-100/70">
            Programme guidance and technical support.
          </p>
          <button className="mt-3 text-[10px] font-bold text-emerald-300">
            Open support →
          </button>
        </div>
      </aside>
      <main
        className={`min-h-screen pt-[81px] transition-[padding] duration-300 ${sidebarExpanded ? "md:pl-[270px]" : "md:pl-[96px]"}`}
      >
        {page}
      </main>
    </div>
  );
}
