"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import styles from "./AuthLayout.module.css";

interface AuthLayoutProps {
  imageLeft?: boolean;
  caption: { brand: string; heading: string };
  children: React.ReactNode;
}

const variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export default function AuthLayout({
  imageLeft = false,
  caption,
  children,
}: AuthLayoutProps) {
  const imagePanel = (
    <div className={styles.imagePanel}>
      <Image
        src="/login_bg.png"
        alt="Background"
        fill
        priority
        className={styles.bgImage}
      />
      <div className={styles.imageOverlay} />
      <div className={styles.imageCaption}>
        <p className={styles.brand}>{caption.brand}</p>
        <h2 className={styles.heading}>{caption.heading}</h2>
      </div>
    </div>
  );

  const formPanel = (
    <motion.div
      className={styles.formPanel}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );

  return (
    <div className={styles.container}>
      {imageLeft ? (
        <>
          {imagePanel}
          {formPanel}
        </>
      ) : (
        <>
          {formPanel}
          {imagePanel}
        </>
      )}
    </div>
  );
}
