"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  FileText,
  IndianRupee,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

const beneficiaries = [
  {
    id: "BEN-2026-000145",
    name: "Lakshmi Narayana",
    aadhaar: "XXXX XXXX 4821",
    contact: "98••••2145",
    district: "Hyderabad",
    mandal: "Secunderabad",
    village: "Tarnaka",
    stage: "Roof Completed",
    payment: "Processing",
    status: "Approved",
  },
  {
    id: "BEN-2026-000146",
    name: "Savitri Devi",
    aadhaar: "XXXX XXXX 1974",
    contact: "97••••6712",
    district: "Rangareddy",
    mandal: "Shamshabad",
    village: "Mamidipally",
    stage: "Wall Construction",
    payment: "Released",
    status: "Construction Started",
  },
  {
    id: "BEN-2026-000147",
    name: "Mohammed Rafi",
    aadhaar: "XXXX XXXX 6305",
    contact: "99••••4058",
    district: "Medchal–Malkajgiri",
    mandal: "Keesara",
    village: "Bogaram",
    stage: "Foundation",
    payment: "Pending",
    status: "Verified",
  },
  {
    id: "BEN-2026-000148",
    name: "Padma Reddy",
    aadhaar: "XXXX XXXX 8250",
    contact: "96••••2876",
    district: "Warangal",
    mandal: "Geesugonda",
    village: "Vanchanagiri",
    stage: "Completed",
    payment: "Released",
    status: "Completed",
  },
];
const expenses = [
  {
    id: "EXP-2026-000892",
    date: "29 Aug 2026",
    project: "PRJ-TG-000021",
    category: "Material",
    description: "Cement purchase – 240 bags",
    amount: "₹1,08,000",
    mode: "Bank Transfer",
    vendor: "Sri Sai Traders",
    status: "Approved",
  },
  {
    id: "EXP-2026-000893",
    date: "30 Aug 2026",
    project: "PRJ-TG-000018",
    category: "Labour",
    description: "Foundation labour payment",
    amount: "₹72,500",
    mode: "UPI",
    vendor: "Seven Hills Groups",
    status: "Pending",
  },
  {
    id: "EXP-2026-000894",
    date: "31 Aug 2026",
    project: "PRJ-TG-000031",
    category: "Transport",
    description: "Steel delivery to site",
    amount: "₹18,750",
    mode: "Cash",
    vendor: "Kaveri Logistics",
    status: "Approved",
  },
];
const stock = [
  {
    id: "ITM-001",
    item: "Cement OPC 53",
    category: "Construction Material",
    unit: "Bags",
    opening: 480,
    purchased: 240,
    issued: 708,
    current: 12,
    reorder: 80,
    location: "Hyderabad / Amberpet Store",
  },
  {
    id: "ITM-002",
    item: "TMT Steel 12mm",
    category: "Construction Material",
    unit: "Kg",
    opening: 12000,
    purchased: 8000,
    issued: 20000,
    current: 0,
    reorder: 1200,
    location: "Rangareddy / Shamshabad",
  },
  {
    id: "ITM-003",
    item: "Clay Bricks",
    category: "Construction Material",
    unit: "Nos",
    opening: 42000,
    purchased: 18000,
    issued: 48500,
    current: 11500,
    reorder: 5000,
    location: "Warangal / Geesugonda",
  },
  {
    id: "ITM-004",
    item: "Exterior Paint",
    category: "Finishing",
    unit: "Litres",
    opening: 520,
    purchased: 240,
    issued: 742,
    current: 18,
    reorder: 75,
    location: "Medchal / Keesara",
  },
];
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-[0_8px_25px_rgba(30,41,59,.06)] ${className}`}
    >
      {children}
    </section>
  );
}
function Header({
  title,
  subtitle,
  onAdd,
  addLabel,
}: {
  title: string;
  subtitle: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs text-slate-500">
          Home › <b>{title}</b>
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="flex gap-2">
        <button className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold">
          <ArrowDownToLine className="mr-2 inline" size={15} />
          Export
        </button>
        <button
          onClick={onAdd}
          className="rounded-xl bg-[#168548] px-5 py-3 text-xs font-bold text-white"
        >
          <Plus className="mr-2 inline" size={15} />
          {addLabel}
        </button>
      </div>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-500"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Input({
  label,
  placeholder,
  type = "text",
  name,
  required = true,
}: {
  label: string;
  placeholder: string;
  type?: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500"
      />
    </label>
  );
}

function useStoredRows<T>(key: string, initial: T[]) {
  const [rows, setRows] = useState<T[]>(initial);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setRows(JSON.parse(stored) as T[]);
    } catch {
      // Keep the safe starter data if browser storage is unavailable.
    }
  }, [key]);
  function save(next: T[] | ((current: T[]) => T[])) {
    setRows((current) => {
      const value = typeof next === "function" ? next(current) : next;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      return value;
    });
  }
  return [rows, save] as const;
}

function Success({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
    >
      {children}
    </p>
  );
}
function Toolbar({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (x: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 text-slate-400" size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search records..."
          className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm"
        />
      </div>
      {["All districts", "All statuses", "Date range"].map((x) => (
        <button
          key={x}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600"
        >
          {x}
        </button>
      ))}
    </div>
  );
}

export function BeneficiariesScreen() {
  const [query, setQuery] = useState("");
  const [add, setAdd] = useState(false);
  const [message, setMessage] = useState("");
  const [data, setData] = useStoredRows(
    "indiramma-beneficiaries",
    beneficiaries,
  );
  const rows = useMemo(
    () =>
      data.filter((x) =>
        Object.values(x).join(" ").toLowerCase().includes(query.toLowerCase()),
      ),
    [data, query],
  );
  function addBeneficiary(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const aadhaar = String(form.get("aadhaar") || "").replace(/\D/g, "");
    const contact = String(form.get("contact") || "").replace(/\D/g, "");
    const record = {
      id: `BEN-2026-${String(145 + data.length).padStart(6, "0")}`,
      name: String(form.get("name")),
      aadhaar: `XXXX XXXX ${aadhaar.slice(-4)}`,
      contact: `${contact.slice(0, 2)}••••${contact.slice(-4)}`,
      district: String(form.get("district")),
      mandal: String(form.get("mandal")),
      village: String(form.get("village")),
      stage: "Construction Not Started",
      payment: "Pending",
      status: "Applied",
    };
    setData((current) => [record, ...current]);
    setAdd(false);
    setMessage(`${record.name} was added successfully.`);
  }
  return (
    <div className="p-5 md:p-10">
      <Header
        title="Beneficiaries"
        subtitle="Complete beneficiary records, house stages, payments and documents."
        onAdd={() => setAdd(true)}
        addLabel="Add beneficiary"
      />
      {message && <Success>{message}</Success>}
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {[
          ["Total beneficiaries", "93,420", Users, "text-blue-600"],
          ["Construction active", "42,580", Package, "text-amber-600"],
          ["Completed houses", "35,880", ShieldCheck, "text-emerald-600"],
          ["Documents pending", "2,184", FileText, "text-red-500"],
        ].map(([a, b, I, c]) => (
          <Card key={a as string} className="p-5">
            <I className={c as string} size={20} />
            <p className="mt-4 text-xs font-semibold text-slate-500">
              {a as string}
            </p>
            <p className="mt-2 text-2xl font-bold">{b as string}</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <Toolbar query={query} setQuery={setQuery} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Beneficiary ID",
                  "Name",
                  "Aadhaar",
                  "Contact",
                  "District / Mandal / Village",
                  "House stage",
                  "Payment",
                  "Status",
                  "",
                ].map((h) => (
                  <th key={h} className="px-5 py-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr
                  key={x.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-mono">{x.id}</td>
                  <td className="px-5 py-4 font-bold">{x.name}</td>
                  <td className="px-5 py-4">{x.aadhaar}</td>
                  <td className="px-5 py-4">{x.contact}</td>
                  <td className="px-5 py-4">
                    <b>{x.district}</b>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {x.mandal} · {x.village}
                    </p>
                  </td>
                  <td className="px-5 py-4">{x.stage}</td>
                  <td className="px-5 py-4">{x.payment}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      {x.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button className="font-bold text-blue-600">
                      View profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {add && (
        <Modal title="Add new beneficiary" onClose={() => setAdd(false)}>
          <form
            onSubmit={addBeneficiary}
            className="grid gap-4 p-6 md:grid-cols-2"
          >
            <Input
              name="name"
              label="Full name"
              placeholder="Beneficiary name"
            />
            <Input
              name="aadhaar"
              label="Aadhaar number"
              placeholder="12-digit Aadhaar"
            />
            <Input
              name="contact"
              label="Contact number"
              placeholder="10-digit mobile"
            />
            <Input
              name="application"
              label="Application number"
              placeholder="Application / registration no."
            />
            <Input
              name="district"
              label="District"
              placeholder="Select district"
            />
            <Input name="mandal" label="Mandal" placeholder="Select mandal" />
            <Input
              name="village"
              label="Village"
              placeholder="Select village"
            />
            <Input
              name="pincode"
              label="Pincode"
              placeholder="6-digit pincode"
            />
            <label className="md:col-span-2 text-xs font-semibold text-slate-600">
              Documents
              <span className="mt-2 flex h-16 items-center rounded-xl border border-dashed border-slate-300 px-4 text-slate-400">
                <Upload className="mr-2" size={17} />
                Upload agreement or bank declaration
              </span>
            </label>
            <button
              type="submit"
              className="md:col-span-2 rounded-xl bg-[#168548] py-3 text-sm font-bold text-white"
            >
              Save beneficiary
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function ExpensesScreen() {
  const [query, setQuery] = useState("");
  const [add, setAdd] = useState(false);
  const [message, setMessage] = useState("");
  const [data, setData] = useStoredRows("indiramma-expenses", expenses);
  const rows = data.filter((x) =>
    Object.values(x).join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  function addExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount") || 0);
    const dateValue = String(form.get("date"));
    const record = {
      id: `EXP-2026-${String(892 + data.length).padStart(6, "0")}`,
      date: dateValue
        ? new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "Today",
      project: String(form.get("project")),
      category: String(form.get("category")),
      description: `Payment to ${String(form.get("vendor"))}`,
      amount: `₹${amount.toLocaleString("en-IN")}`,
      mode: String(form.get("mode")),
      vendor: String(form.get("vendor")),
      status: "Pending",
    };
    setData((current) => [record, ...current]);
    setAdd(false);
    setMessage(`${record.id} was submitted for approval.`);
  }
  return (
    <div className="p-5 md:p-10">
      <Header
        title="Expense Management"
        subtitle="Record, review and approve all project-related expenditure."
        onAdd={() => setAdd(true)}
        addLabel="Add expense"
      />
      {message && <Success>{message}</Success>}
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {[
          ["This month", "₹1.18 Cr", "text-blue-600"],
          ["Pending approval", "₹12.6 Lakh", "text-amber-600"],
          ["Approved", "₹96.4 Lakh", "text-emerald-600"],
          ["Rejected", "₹1.2 Lakh", "text-red-500"],
        ].map(([a, b, c]) => (
          <Card key={a} className="p-5">
            <IndianRupee className={c} />
            <p className="mt-4 text-xs text-slate-500">{a}</p>
            <p className="mt-2 text-2xl font-bold">{b}</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <Toolbar query={query} setQuery={setQuery} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                {[
                  "Expense ID",
                  "Date",
                  "Project",
                  "Category",
                  "Description",
                  "Amount",
                  "Mode",
                  "Vendor",
                  "Status",
                ].map((h) => (
                  <th className="px-5 py-4" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-mono">{x.id}</td>
                  <td className="px-5 py-4">{x.date}</td>
                  <td className="px-5 py-4 font-semibold">{x.project}</td>
                  <td className="px-5 py-4">{x.category}</td>
                  <td className="px-5 py-4">{x.description}</td>
                  <td className="px-5 py-4 font-bold">{x.amount}</td>
                  <td className="px-5 py-4">{x.mode}</td>
                  <td className="px-5 py-4">{x.vendor}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-md px-2 py-1 text-[10px] font-bold ${x.status === "Approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      {x.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {add && (
        <Modal title="New expense entry" onClose={() => setAdd(false)}>
          <form onSubmit={addExpense} className="grid gap-4 p-6 md:grid-cols-2">
            <Input
              name="date"
              label="Expense date"
              placeholder="Date"
              type="date"
            />
            <Input
              name="project"
              label="Project / site"
              placeholder="Project code"
            />
            <Input
              name="category"
              label="Category"
              placeholder="Material, Labour, Transport..."
            />
            <Input
              name="amount"
              label="Amount"
              placeholder="₹0.00"
              type="number"
            />
            <Input
              name="mode"
              label="Payment mode"
              placeholder="Bank transfer / UPI / Cash"
            />
            <Input
              name="vendor"
              label="Vendor / person"
              placeholder="Payee name"
            />
            <Input
              name="reference"
              label="Voucher / reference"
              placeholder="Reference number"
            />
            <Input name="paidBy" label="Paid by" placeholder="Staff member" />
            <button
              type="submit"
              className="md:col-span-2 rounded-xl bg-[#168548] py-3 text-sm font-bold text-white"
            >
              Submit for approval
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function InventoryScreen() {
  const [query, setQuery] = useState("");
  const [add, setAdd] = useState(false);
  const [message, setMessage] = useState("");
  const [data, setData] = useStoredRows("indiramma-inventory", stock);
  const rows = data.filter((x) =>
    Object.values(x).join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  function addPurchase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const quantity = Number(form.get("quantity") || 0);
    const item = String(form.get("item"));
    const record = {
      id: `ITM-${String(data.length + 1).padStart(3, "0")}`,
      item,
      category: "Construction Material",
      unit: "Units",
      opening: 0,
      purchased: quantity,
      issued: 0,
      current: quantity,
      reorder: 10,
      location: `${String(form.get("district"))} / ${String(form.get("mandal"))}`,
    };
    setData((current) => [record, ...current]);
    setAdd(false);
    setMessage(
      `${quantity.toLocaleString("en-IN")} units of ${item} were added to inventory.`,
    );
  }
  return (
    <div className="p-5 md:p-10">
      <Header
        title="Inventory Management"
        subtitle="District and mandal-level stock, purchases, issues and reorder alerts."
        onAdd={() => setAdd(true)}
        addLabel="Record purchase"
      />
      {message && <Success>{message}</Success>}
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {[
          ["Inventory value", "₹286.4 Cr", Package, "text-blue-600"],
          ["Low stock items", "8", AlertTriangle, "text-amber-600"],
          ["Out of stock", "2", AlertTriangle, "text-red-500"],
          [
            "Purchases this month",
            "₹42.8 Lakh",
            IndianRupee,
            "text-emerald-600",
          ],
        ].map(([a, b, I, c]) => (
          <Card key={a as string} className="p-5">
            <I className={c as string} />
            <p className="mt-4 text-xs text-slate-500">{a as string}</p>
            <p className="mt-2 text-2xl font-bold">{b as string}</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <Toolbar query={query} setQuery={setQuery} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                {[
                  "Item",
                  "Category",
                  "Unit",
                  "Opening",
                  "Purchased",
                  "Issued",
                  "Current",
                  "Reorder level",
                  "Location",
                  "Status",
                ].map((h) => (
                  <th className="px-5 py-4" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} className="border-t border-slate-100">
                  <td className="px-5 py-4">
                    <b>{x.item}</b>
                    <p className="text-[10px] text-slate-400">{x.id}</p>
                  </td>
                  <td className="px-5 py-4">{x.category}</td>
                  <td className="px-5 py-4">{x.unit}</td>
                  <td className="px-5 py-4">
                    {x.opening.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4">
                    {x.purchased.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4">
                    {x.issued.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {x.current.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4">
                    {x.reorder.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4">{x.location}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-md px-2 py-1 text-[10px] font-bold ${x.current === 0 ? "bg-red-50 text-red-600" : x.current <= x.reorder ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {x.current === 0
                        ? "OUT OF STOCK"
                        : x.current <= x.reorder
                          ? "LOW STOCK"
                          : "IN STOCK"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {add && (
        <Modal title="Record inventory purchase" onClose={() => setAdd(false)}>
          <form
            onSubmit={addPurchase}
            className="grid gap-4 p-6 md:grid-cols-2"
          >
            <Input
              name="date"
              label="Purchase date"
              placeholder="Date"
              type="date"
            />
            <Input
              name="item"
              label="Item"
              placeholder="Select inventory item"
            />
            <Input
              name="district"
              label="District"
              placeholder="District (Level 1)"
            />
            <Input
              name="mandal"
              label="Mandal"
              placeholder="Mandal (Level 2)"
            />
            <Input
              name="quantity"
              label="Quantity"
              placeholder="0"
              type="number"
            />
            <Input name="rate" label="Rate" placeholder="₹0.00" type="number" />
            <Input
              name="supplier"
              label="Supplier"
              placeholder="Supplier name"
            />
            <Input
              name="invoice"
              label="Invoice number"
              placeholder="Purchase invoice"
            />
            <button
              type="submit"
              className="md:col-span-2 rounded-xl bg-[#168548] py-3 text-sm font-bold text-white"
            >
              Record purchase
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
