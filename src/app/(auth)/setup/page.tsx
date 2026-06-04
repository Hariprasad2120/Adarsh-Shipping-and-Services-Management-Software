"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DemoFillButton } from "@/components/demo-fill-button";
import { getSetupDemoValues } from "@/lib/demo-fill";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      orgName: fd.get("orgName"),
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
    };

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Setup failed.");
      setLoading(false);
      return;
    }

    router.replace("/login");
  }

  function fillDemoData() {
    const demo = getSetupDemoValues();
    setOrgName(demo.orgName);
    setName(demo.name);
    setEmail(demo.email);
    setPassword(demo.password);
    setError(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Initial Setup</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create your organisation and first administrator account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-end">
            <DemoFillButton disabled={loading} onClick={fillDemoData} />
          </div>

          <Field label="Organisation Name" name="orgName" onChange={setOrgName} placeholder="Adarsh Shipping" required value={orgName} />
          <Field label="Your Name" name="name" onChange={setName} placeholder="Admin" required value={name} />
          <Field label="Email" name="email" onChange={setEmail} type="email" placeholder="admin@company.com" required value={email} />
          <Field label="Password" name="password" onChange={setPassword} type="password" placeholder="Min 8 characters" required value={password} />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  onChange,
  type = "text",
  placeholder,
  required,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
