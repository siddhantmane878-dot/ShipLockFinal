"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ShiplockLogo from "@/components/ShiplockLogo";
import s from "@/components/cleanAuth.module.css";

export default function SignupPage() {
  const router = useRouter();

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI states
  const [step, setStep] = useState(1); // 1 = Basic, 2 = Profile
  const [loading, setLoading] = useState(false);
  const [auditStatus, setAuditStatus] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Step 2 Profile states
  const [picture, setPicture] = useState("");
  const [socialHandle, setSocialHandle] = useState("");

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!firstName || !lastName || !email || !password) {
      return setError("Please fill in all required fields.");
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!picture || !socialHandle) {
      return setError("Profile picture and social handle are compulsory.");
    }

    try {
      setLoading(true);

      // Audit Sequence - Step 1: Social Identity Verification
      setAuditStatus("Scraping social handle for name match...");
      const socialRes = await fetch("/api/verify-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: socialHandle, name: `${firstName} ${lastName}` })
      });
      const socialData = await socialRes.json();
      if (!socialRes.ok) throw new Error(socialData.message);

      // Audit Sequence - Step 2: Biometric Liveness Audit (Faceless detection)
      setAuditStatus("Verifying professional portrait via GPT Audit...");
      const photoRes = await fetch("/api/verify-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: picture })
      });
      const photoData = await photoRes.json();
      if (!photoRes.ok) throw new Error(photoData.message);

      // Final step: Account Creation
      setAuditStatus("Synchronizing identity with the Wall of Legends...");
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: `${firstName} ${lastName}`.trim(),
          picture,
          social_handle: socialHandle
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to sign up.");
      }

      setSuccess("Identity Audit Passed! Account established.");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setAuditStatus(null);
    } finally {
      if (!success) setLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.card}>
        <div className={s.header}>
          <div className={s.logoWrap}>
            <ShiplockLogo vertical={false} style={{ width: '260px', height: 'auto', color: '#000' }} />
          </div>
          <p className={s.tagline}>
            {loading ? "OFFICIAL IDENTITY AUDIT IN PROGRESS" : step === 1 ? "Ship or face its consequences" : "Finalize your professional profile"}
          </p>
        </div>

        {error && (
          <div className={s.error} style={{ border: '1px solid #ef4444', background: '#fef2f2', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#ef4444', marginBottom: '20px', fontWeight: 600 }}>
            AUDIT REFUSED: {error}
          </div>
        )}
        {success && <div className={s.success} style={{ padding: '12px', background: '#ecfdf5', border: '1px solid #10b981', color: '#10b981', borderRadius: '8px', marginBottom: '20px', fontWeight: 600, fontSize: '13px' }}>{success}</div>}

        {loading && !success ? (
          <div style={{ padding: '60px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '30px', height: '30px', border: '3px solid #f1f5f9', borderLeftColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '20px' }}></div>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{auditStatus}</p>
            <style jsx>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleNext}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="first-name" className={s.label}>First Name</label>
                <input 
                  id="first-name" 
                  type="text" 
                  className={s.input}
                  placeholder="John" 
                  autoComplete="given-name" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="last-name" className={s.label}>Last Name</label>
                <input 
                  id="last-name" 
                  type="text" 
                  className={s.input}
                  placeholder="Doe" 
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className={s.formGroup} style={{ marginBottom: '32px' }}>
              <label htmlFor="confirm-password" className={s.label}>Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                className={s.input}
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button className={s.submitBtn} style={{ marginBottom: '32px' }} type="submit">
              Continue to Profile Setup
            </button>

            <div className={s.footer}>
              <span>Already have an account?</span>
              <Link href="/" id="go-login">
                Sign In
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
              <div 
                onClick={() => document.getElementById('picture-upload')?.click()}
                style={{ 
                  position: 'relative', 
                  width: '140px', 
                  height: '140px', 
                  background: '#f8fafc', 
                  borderRadius: '50%', 
                  border: '2px dashed #e2e8f0', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  overflow: 'hidden', 
                  marginBottom: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                {picture ? (
                  <img src={picture} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '8px' }}>UPLOAD PHOTO</span>
                  </>
                )}
                {picture && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 600, transition: '0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
                    CHANGE PHOTO
                  </div>
                )}
              </div>
              <input 
                id="picture-upload"
                type="file" 
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setPicture(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', maxWidth: '200px' }}>Your face is your identity. A clear headshot is mandatory for all Legends.</p>
            </div>

            <div className={s.formGroup} style={{ marginBottom: '32px' }}>
              <label htmlFor="social-handle" className={s.label}>Social Media Handle (LinkedIn / X / GitHub)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="social-handle" 
                  type="text" 
                  className={s.input}
                  placeholder="@username" 
                  value={socialHandle}
                  onChange={(e) => setSocialHandle(e.target.value)}
                />
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Linking your handle is mandatory for verifiable project milestones.</p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className={s.submitBtn} style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }} type="button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className={s.submitBtn} type="submit" disabled={loading}>
                {loading ? "Establishing Profile..." : "Complete Signup"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
