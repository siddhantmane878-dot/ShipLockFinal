"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import s from "./jokers.module.css";

interface Joker {
  id: number;
  name: string;
  picture?: string;
  project: string;
  reason: string;
}

export default function JokersWallPage() {
  const [jokers, setJokers] = useState<Joker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jokers")
      .then(res => res.json())
      .then(data => {
        if (data.jokers && data.jokers.length > 0) {
          setJokers(data.jokers);
        } else {
          // Mock data to match reference if DB is empty
          setJokers([
            {
              id: 1,
              name: "Marcus Thorne",
              project: "Aura Analytics",
              reason: "Spent 40 hours perfecting a font choice that nobody will ever see. Zero code shipped. Zero value created. Failed to deliver the primary dashboard view due to 'kerning inconsistencies.'",
              picture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
            },
            {
              id: 2,
              name: "Elena Vance",
              project: "Core Ledger",
              reason: "Refactored a functional authentication module three times in one week. The final version has the same bugs as the first. The deadline was missed because she was 'visualizing the data flow.'",
              picture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop"
            },
            {
              id: 3,
              name: "Julian Black",
              project: "Vector OS",
              reason: "Arguing about the semantic naming of CSS variables for 72 hours while the staging server was down. Prefers 'theoretical elegance' over shipping functional software.",
              picture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop"
            }
          ]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={s.container}>
      {/* Back button */}
      <Link href="/dashboard" className={s.backBtn}>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Back to Dashboard
      </Link>

      <header className={s.header}>
        <h1 className={s.title}>The Joker&apos;s Wall</h1>
        <p className={s.subtitle}>
          Architectural failure documented with clinical precision. A public record of those who prioritised perfection over deployment. Sunday deadlines are non-negotiable.
        </p>
      </header>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>Developing the wall...</div>
      ) : (
        <div className={s.jokerList}>
          {jokers.map((joker, idx) => (
            <motion.div 
              key={joker.id} 
              className={s.jokerRow}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
            >
              <div className={s.portraitWrapper}>
                <img 
                  src={joker.picture || "https://ui-avatars.com/api/?name=" + encodeURIComponent(joker.name) + "&background=e2e8f0&color=64748b&size=200"} 
                  alt={joker.name} 
                  className={s.portrait} 
                />
              </div>
              <div className={s.info}>
                <h2 className={s.name}>{joker.name}</h2>
                <div className={s.projectName}>
                  <span>Project: </span> &quot;{joker.project}&quot;
                </div>
                <p className={s.reason}>
                  {joker.reason}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
