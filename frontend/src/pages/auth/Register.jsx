import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export const Register = ({ initialRole = "doctor" }) => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    license: "",
    department: "cardiology",
    role: initialRole,
    email: "",
    password: "",
    confirmPassword: "",
    terms: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!formData.terms) {
      setError("Please agree to the Terms of Service & HIPAA Policy.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await register(formData);
      if (res.success) {
        setSuccessMsg("Registration successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setError(res.message || "Registration failed.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop antialiased">
      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-lg overflow-hidden relative z-10 my-8">
        {/* Left Visual Side */}
        <div className="hidden md:flex flex-col justify-between bg-surface-container-low p-8 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, #003c90 1px, transparent 0)",
              backgroundSize: "24px 24px"
            }}
          ></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <span
                className="material-symbols-outlined text-primary text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                monitor_heart
              </span>
              <span className="font-headline-lg text-headline-lg text-primary tracking-tight">Aarogya Pravah AI</span>
            </div>
            <h2 className="font-display-lg text-display-lg text-on-surface leading-tight mb-4">
              Empowering <br />Clinical Excellence
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md">
              Join our high-stakes healthcare environment to streamline patient flow, enhance staff coordination, and leverage AI-driven queue analytics.
            </p>
          </div>

          <div className="relative z-10 mt-12 bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                <span className="material-symbols-outlined">security</span>
              </div>
              <div>
                <h4 className="font-title-md text-title-md text-on-surface text-sm font-bold">Secure & Compliant</h4>
                <p className="font-body-md text-body-md text-on-surface-variant text-xs">Enterprise-grade security for medical data.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-outlined">insights</span>
              </div>
              <div>
                <h4 className="font-title-md text-title-md text-on-surface text-sm font-bold">AI-Powered Insights</h4>
                <p className="font-body-md text-body-md text-on-surface-variant text-xs">Real-time triage and flow analytics.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Side */}
        <div className="p-8 md:p-10 lg:p-12">
          <div className="md:hidden flex items-center gap-2 mb-6 justify-center">
            <span
              className="material-symbols-outlined text-primary text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              monitor_heart
            </span>
            <span className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight">
              Aarogya Pravah AI
            </span>
          </div>

          <div className="mb-6">
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1">Create Account</h1>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">
              Register as a medical professional to access the triage dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-container text-on-error-container text-xs rounded border border-error/20">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 text-xs rounded border border-emerald-300">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface uppercase mb-1" htmlFor="fullName">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline">person</span>
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Dr. Jane Doe"
                  className="block w-full pl-10 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-md text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Professional License & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface uppercase mb-1" htmlFor="license">
                  License Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline">badge</span>
                  </div>
                  <input
                    id="license"
                    name="license"
                    type="text"
                    required
                    value={formData.license}
                    onChange={handleChange}
                    placeholder="MD-12345"
                    className="block w-full pl-10 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-data-display text-xs focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface uppercase mb-1" htmlFor="department">
                  Department
                </label>
                <select
                  id="department"
                  name="department"
                  required
                  value={formData.department}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-md text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                >
                  <option value="cardiology">Cardiology</option>
                  <option value="orthopedics">Orthopedics</option>
                  <option value="neurology">Neurology</option>
                  <option value="emergency">Emergency (ER)</option>
                  <option value="pediatrics">Pediatrics</option>
                  <option value="general">General Medicine</option>
                </select>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface uppercase mb-2">Role Selection</label>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="doctor"
                    checked={formData.role === "doctor"}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="px-3 py-2.5 border border-outline-variant rounded bg-surface-container-lowest text-center peer-checked:border-primary peer-checked:bg-primary-fixed peer-checked:text-on-primary-fixed-variant transition-colors flex items-center justify-center gap-2 hover:bg-surface-container-low">
                    <span className="material-symbols-outlined text-base">stethoscope</span>
                    <span className="font-body-md text-sm font-medium">Doctor</span>
                  </div>
                </label>

                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="staff"
                    checked={formData.role === "staff"}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="px-3 py-2.5 border border-outline-variant rounded bg-surface-container-lowest text-center peer-checked:border-primary peer-checked:bg-primary-fixed peer-checked:text-on-primary-fixed-variant transition-colors flex items-center justify-center gap-2 hover:bg-surface-container-low">
                    <span className="material-symbols-outlined text-base">groups</span>
                    <span className="font-body-md text-sm font-medium">Clinical Staff</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Hospital Email */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface uppercase mb-1" htmlFor="email">
                Hospital Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline">mail</span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@hospital.org"
                  className="block w-full pl-10 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-md text-sm focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Password Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface uppercase mb-1" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-md text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface uppercase mb-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface font-body-md text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start pt-1">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={formData.terms}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary bg-surface-container-lowest border-outline-variant rounded focus:ring-primary"
                />
              </div>
              <div className="ml-3 text-xs">
                <label className="font-body-md text-on-surface-variant" htmlFor="terms">
                  I agree to the <a href="#" className="text-primary hover:underline font-medium">Terms of Service</a> and <a href="#" className="text-primary hover:underline font-medium">HIPAA Privacy Policy</a>.
                </label>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded bg-primary text-on-primary font-title-md text-sm hover:bg-on-primary-fixed-variant shadow-sm transition-colors"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>

              <div className="text-center">
                <span className="font-body-md text-xs text-on-surface-variant">Already have an account? </span>
                <Link to="/login" className="font-body-md text-xs text-primary font-semibold hover:underline">
                  Login here
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
