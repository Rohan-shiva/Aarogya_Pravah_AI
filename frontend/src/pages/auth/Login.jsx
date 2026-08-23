import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export const Login = ({ initialRole = "doctor" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [role, setRole] = useState(initialRole);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please enter your email/staff ID and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await login({
        email: identifier,
        staffId: identifier,
        password,
        role
      });

      if (res.success) {
        const userRole = (res.user?.role || role).toLowerCase();
        const redirectPath = userRole === "doctor" ? "/doctor/dashboard" : "/staff/validation";
        navigate(location.state?.from?.pathname || redirectPath, { replace: true });
      } else {
        setError(res.message || "Invalid credentials.");
      }
    } catch (err) {
      setError("Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md h-screen w-full flex items-center justify-center overflow-hidden clinical-bg-pattern p-margin-mobile md:p-margin-desktop">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)] bg-surface border border-outline-variant relative z-10 h-auto md:h-[600px]">
        {/* Left Side: Branding & Imagery */}
        <div className="hidden md:flex flex-col justify-between bg-surface-container-low p-8 relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-primary text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_hospital
              </span>
              <h1 className="font-headline-lg text-headline-lg text-primary m-0">Aarogya Pravah AI</h1>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full w-max mt-2 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              <span className="font-label-sm text-label-sm">AI-Triage Enabled</span>
            </div>
          </div>

          <div className="relative z-10 mt-auto pb-4">
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[280px]">
              Secure access to the Aarogya Pravah AI platform. Optimizing patient flow and triage accuracy.
            </p>
          </div>

          {/* Decorative abstract clinical visual */}
          <div
            className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[60%] opacity-20 pointer-events-none"
            style={{
              background: "radial-gradient(circle at top right, #0f52ba, transparent 60%)"
            }}
          ></div>
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-15"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBUoc6BSROJUy4s_i7QTtaAkGrsoAccIufa-oR1mrapJu8qk7yvNpsYm96llYBYE74CQEeAV6YsKv5NjkjKU784I5PKa2u-d3AvpNr3XAmBYg4N8i_aBdD6w2B472bJN8s6U9_8NQZVhvGOoGugWL_qvBlelRIBaGcBGShlYM67S1Vj4h5Cpgnqo3UMwIx9fNmxeS-mZYgIUCh7eFUyysb11G0O3bHivb24feeBHIRZCKrlZO1-Jt_o')",
              backgroundSize: "cover"
            }}
          ></div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex flex-col justify-center p-8 sm:p-12 bg-surface">
          {/* Mobile Branding (Hidden on Desktop) */}
          <div className="md:hidden flex flex-col gap-2 mb-6 items-center text-center">
            <span
              className="material-symbols-outlined text-primary text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_hospital
            </span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary m-0">Aarogya Pravah AI</h1>
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container py-1 px-3 rounded-full mt-1">
              AI-Triage Enabled
            </span>
          </div>

          <div className="mb-6">
            <h2 className="font-title-md text-title-md text-on-surface mb-1">
              {role === "doctor" ? "Doctor Login" : "Staff Login"}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Enter your credentials to access the secure portal.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-container text-on-error-container text-xs rounded border border-error/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Role Toggle */}
            <div className="flex bg-surface-container p-1 rounded-lg w-full mb-1">
              <button
                type="button"
                onClick={() => setRole("doctor")}
                className={`flex-1 py-2 font-label-sm text-label-sm rounded-md transition-colors ${
                  role === "doctor"
                    ? "bg-surface text-primary shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-outline-variant font-bold"
                    : "text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                Doctor
              </button>
              <button
                type="button"
                onClick={() => setRole("staff")}
                className={`flex-1 py-2 font-label-sm text-label-sm rounded-md transition-colors ${
                  role === "staff"
                    ? "bg-surface text-primary shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-outline-variant font-bold"
                    : "text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                Support Staff
              </button>
            </div>

            {/* Email / Staff ID Input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-on-surface" htmlFor="staff_id">
                Email or Staff ID
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline">badge</span>
                <input
                  id="staff_id"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. doctor@citygeneral.org"
                  className="w-full h-11 pl-10 pr-3 rounded bg-surface border border-outline-variant text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-on-surface" htmlFor="password">
                Password
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline">lock</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-11 pl-10 pr-10 rounded bg-surface border border-outline-variant text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-outline hover:text-on-surface-variant transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center mt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-[2px] border-outline-variant text-primary focus:ring-primary h-4 w-4 bg-surface"
                />
                <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">
                  Remember me
                </span>
              </label>
              <Link
                to="/reset-password"
                className="font-label-sm text-label-sm text-primary hover:text-on-primary-fixed-variant transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-primary text-on-primary font-title-md text-title-md rounded hover:bg-on-primary-fixed-variant shadow-[0_4px_6px_rgba(0,0,0,0.02)] transition-all flex justify-center items-center gap-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Login</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-outline-variant pt-4">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Need system access?{" "}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Register a new account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
