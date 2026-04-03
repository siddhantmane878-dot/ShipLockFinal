"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import s from "./leaderboard.module.css";

interface Professional {
  id: number;
  name: string;
  xp: number;
  streak: number;
  endorsements: number;
  core_project?: string;
  role?: string; // Mocking roles since not in DB
}

const MOCK_ROLES = [
  "Senior Architect",
  "Lead Developer",
  "Security Systems",
  "UX Strategist",
  "Product Owner",
  "Backend Engineer",
  "DevOps Lead",
  "Frontend Master",
  "ML Engineer",
  "Product Designer"
];

export default function LeaderboardPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(res => res.json())
      .then(data => {
        if (data.professionals) {
          // Assign mock roles for better visual matching with reference
          const withRoles = data.professionals.map((p: any, idx: number) => ({
            ...p,
            role: MOCK_ROLES[idx % MOCK_ROLES.length]
          }));
          setProfessionals(withRoles);
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
        <h1 className={s.title}>Wall of Legends</h1>
        <p className={s.subtitle}>
          A definitive audit of professional excellence. Rankings are calculated based
          on verifiable project milestones, consistent performance streaks, and peer-validated contribution weights.
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', fontSize: '15px', color: '#6b7280' }}>
          Loading the legends...
        </div>
      ) : (
        <motion.div 
          className={s.tableWrapper}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Table Header */}
          <div className={s.tableHeader}>
            <div className={`${s.headerCol} ${s.colRank}`}>Rank</div>
            <div className={`${s.headerCol} ${s.colProf}`}>Professional</div>
            <div className={`${s.headerCol} ${s.colCore}`}>Core Project</div>
            <div className={`${s.headerCol} ${s.colStrk}`}>Streak</div>
            <div className={`${s.headerCol} ${s.colXP}`}>Performance XP</div>
          </div>

          {/* Table Rows */}
          {professionals.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#9ca3af' }}>
              No current legends found. Be the first.
            </div>
          ) : (
            professionals.map((p, idx) => (
              <div key={p.id} className={s.tableRow}>
                {/* Rank */}
                <div className={`${s.rankNum} ${s.colRank}`}>
                  {(idx + 1).toString().padStart(2, '0')}
                </div>

                {/* Professional */}
                <div className={s.colProf}>
                  <div className={s.profName}>{p.name}</div>
                  <div className={s.profRole}>{p.role}</div>
                </div>

                {/* Core Project */}
                <div className={`${s.coreProject} ${s.colCore}`}>
                  {p.core_project || "-"}
                </div>

                {/* Streak */}
                <div className={`${s.streak} ${s.colStrk}`}>
                  {p.streak || 0} Weeks
                </div>

                {/* XP & Endorsements */}
                <div className={`${s.colXP}`}>
                  <div className={s.xpValue}>
                    {p.xp.toLocaleString()} XP
                  </div>
                  <div className={s.endorsements}>
                    {p.endorsements || 0} Endorsements
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
