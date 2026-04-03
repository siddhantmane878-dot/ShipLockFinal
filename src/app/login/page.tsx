"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ShiplockLogo from "@/components/ShiplockLogo";
import s from "@/components/cleanAuth.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // If user is already logged in, instantly retain session and route to dashboard
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      return setError("Please enter your email and password.");
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to log in.");
      }

      setSuccess("Welcome back! Redirecting...");
      
      // Save minimal user info (in real app, use HTTP-only cookies/JWT)
      localStorage.setItem("user", JSON.stringify(data.user));

      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.card}>
        <div className={s.header}>
          <div className={s.logoWrap}>
            <ShiplockLogo vertical={false} style={{ width: '260px', height: 'auto', color: '#000' }} />
          </div>
          <p className={s.tagline}>Ship or face it&apos;s consequences</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className={s.error}>{error}</div>}
          {success && <div className={s.success}>{success}</div>}

          <div className={s.formGroup}>
            <label htmlFor="email" className={s.label}>Email Address</label>
            <input 
              id="email" 
              type="email" 
              className={s.input}
              placeholder="name@company.com" 
              autoComplete="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={s.formGroup}>
            <label htmlFor="password" className={s.label}>Password</label>
            <input 
              id="password" 
              type="password" 
              className={s.input}
              placeholder="••••••••" 
              autoComplete="current-password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className={s.submitBtn} type="submit" id="signin-btn" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <Link href="#" className={s.forgotLink}>
            Forgot Password?
          </Link>

          <div className={s.footer}>
            <span>New Here?</span>
            <Link href="/signup" id="go-signup">
              Create Account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
