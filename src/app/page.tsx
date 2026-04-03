"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ShiplockLogo from "@/components/ShiplockLogo";
import { motion } from "framer-motion";
import { Luxurious_Roman } from "next/font/google";

const luxuriousRoman = Luxurious_Roman({
  weight: "400",
  subsets: ["latin"],
});

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in, redirect them to dashboard
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <main 
      className={luxuriousRoman.className}
      style={{ 
        minHeight: '100vh', 
        background: '#ffffff', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '40px 24px', 
        textAlign: 'center',
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ maxWidth: '800px', width: '100%' }}
      >
        {/* Shiplock Brand Logo with Ship Header (PNG) */}
        <div style={{ marginBottom: '60px' }}>
          <img 
            src="/landing-logo.png" 
            alt="Shiplock Logo" 
            style={{ width: '420px', height: 'auto', display: 'block', margin: '0 auto' }} 
          />
        </div>

        {/* Hero Headline */}
        <h1 style={{ 
          fontSize: '56px', 
          fontWeight: '750', 
          lineHeight: '1.2', 
          letterSpacing: '-0.02em', 
          margin: '0 0 40px 0', 
          color: '#000'
        }}>
          Not your Basic todolist which <br />
          can be <span style={{ color: '#ff5c00' }}>fooled</span>
        </h1>

        {/* Supporting Copy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '60px' }}>
          <p style={subTextStyle}>Ship or face the consequences</p>
          <p style={subTextStyle}>
            We don&apos;t trust you at all we <span style={{ color: '#ff5c00', fontWeight: 'bold' }}>verify</span> everything
          </p>
          <p style={subTextStyle}>So complete your tasks wisely</p>
          <p style={subTextStyle}>
            We are so <span style={{ color: '#ff5c00', fontWeight: 'bold' }}>brutal</span> so its only for those who <br />
            desperately ship the product
          </p>
        </div>

        {/* Primary CTA */}
        <Link 
          href="/signup" 
          style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#000', 
            textDecoration: 'none', 
            borderBottom: '3px solid #000', 
            paddingBottom: '4px',
            transition: 'color 0.2s',
            cursor: 'pointer',
            display: 'inline-block'
          }}
          onMouseOver={(e: any) => (e.currentTarget.style.color = '#ff5c00', e.currentTarget.style.borderBottomColor = '#ff5c00')}
          onMouseOut={(e: any) => (e.currentTarget.style.color = '#000', e.currentTarget.style.borderBottomColor = '#000')}
        >
          Try Now
        </Link>
      </motion.div>
    </main>
  );
}

const subTextStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '400',
  color: '#4b5563',
  margin: '0',
  lineHeight: '1.7',
  textAlign: 'center'
};
