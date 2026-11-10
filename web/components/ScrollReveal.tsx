"use client";
import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .reveal {
        opacity: 0;
        transform: translateY(28px);
        transition: opacity 0.55s cubic-bezier(.22,.68,0,1.2), transform 0.55s cubic-bezier(.22,.68,0,1.2);
      }
      .reveal.visible {
        opacity: 1;
        transform: none;
      }
      .reveal-left {
        opacity: 0;
        transform: translateX(-28px);
        transition: opacity 0.55s cubic-bezier(.22,.68,0,1.2), transform 0.55s cubic-bezier(.22,.68,0,1.2);
      }
      .reveal-left.visible {
        opacity: 1;
        transform: none;
      }
      .reveal-right {
        opacity: 0;
        transform: translateX(28px);
        transition: opacity 0.55s cubic-bezier(.22,.68,0,1.2), transform 0.55s cubic-bezier(.22,.68,0,1.2);
      }
      .reveal-right.visible {
        opacity: 1;
        transform: none;
      }
    `;
    document.head.appendChild(style);

    const els = document.querySelectorAll<HTMLElement>(".reveal, .reveal-left, .reveal-right");
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add("visible"), i * 60);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => { io.disconnect(); document.head.removeChild(style); };
  }, []);

  return null;
}
