/** @type {import('tailwindcss').Config} */
// Design tokens của Shop Acc Liqi (phong cách esports Liên Quân): nền tối + vàng hoàng kim.
// Mọi màu / bóng / gradient đều đặt ở đây MỘT lần để các trang dùng đồng bộ (bg-surface, text-gold-light...).
module.exports = {
  content: ["./index.html", "./frontend/**/*.html", "./frontend/**/*.js"],
  theme: {
    // Giữ đúng mốc responsive của CSS cũ: 480 / 768 / 992 / 1200 (max-md = ≤768px, max-sm = ≤480px).
    screens: { sm: "481px", md: "769px", lg: "993px", xl: "1201px" },
    extend: {
      colors: {
        bg: { DEFAULT: "#0a0e17", elevated: "#121824" },
        surface: { DEFAULT: "#1a2336", hover: "#222e46", active: "#2b3a58", input: "#1e283c" },
        gold: { DEFAULT: "#f59e0b", light: "#fbbf24", dark: "#b45309" },
        violet: { DEFAULT: "#8b5cf6", dark: "#6d28d9" },
        fire: { DEFAULT: "#f97316", dark: "#ea580c" },
        maroon: "#e11d48",
        success: "#10b981",
        ink: { DEFAULT: "#f1f5f9", muted: "#94a3b8", subtle: "#64748b" },
      },
      fontFamily: {
        body: ['"Be Vietnam Pro"', "system-ui", "-apple-system", "sans-serif"],
        display: ["Spectral", "Georgia", "serif"],
      },
      borderRadius: { ui: "8px", card: "16px" },
      boxShadow: {
        sm2: "0 4px 12px rgba(0,0,0,.35)",
        card: "0 12px 32px -6px rgba(0,0,0,.65), 0 4px 12px -2px rgba(0,0,0,.4)",
        "card-hover": "0 20px 40px -10px rgba(0,0,0,.8), 0 0 24px rgba(245,158,11,.16)",
        pop: "0 18px 44px rgba(0,0,0,.8), 0 0 24px rgba(245,158,11,.12)",
        modal: "0 24px 60px rgba(0,0,0,.85), 0 0 35px rgba(245,158,11,.12)",
        gold: "0 4px 16px rgba(245,158,11,.35)",
        "gold-lg": "0 6px 22px rgba(245,158,11,.5)",
        fire: "0 4px 18px rgba(234,88,12,.45)",
        violet: "0 0 18px rgba(139,92,246,.45)",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg,#fef08a 0%,#f59e0b 50%,#d97706 100%)",
        "gold-gradient-hover": "linear-gradient(135deg,#fffbeb 0%,#fbbf24 50%,#d97706 100%)",
        "violet-gradient": "linear-gradient(135deg,#a78bfa 0%,#8b5cf6 50%,#6d28d9 100%)",
        "fire-gradient": "linear-gradient(135deg,#fb923c 0%,#f97316 50%,#ea580c 100%)",
        "card-surface": "linear-gradient(180deg,rgba(22,29,44,.98) 0%,rgba(13,17,26,.99) 100%)",
        "panel-surface": "linear-gradient(180deg,rgba(26,35,54,.9) 0%,rgba(18,24,36,.95) 100%)",
        "page-glow":
          "radial-gradient(ellipse 80% 50% at 50% -10%,rgba(245,158,11,.09),transparent 65%),radial-gradient(ellipse 60% 40% at 100% 30%,rgba(6,182,212,.06),transparent 50%),radial-gradient(ellipse 50% 40% at 0% 80%,rgba(139,92,246,.06),transparent 50%)",
        shimmer: "linear-gradient(90deg,#1a2336 25%,#232d42 37%,#1a2336 63%)",
      },
      keyframes: {
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } },
        "drop-in": { from: { opacity: 0, transform: "translateY(-6px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "toast-in": { from: { opacity: 0, transform: "translateX(30px)" }, to: { opacity: 1, transform: "translateX(0)" } },
        "toast-out": { to: { opacity: 0, transform: "translateX(30px)" } },
        shimmer: { "0%": { backgroundPosition: "100% 50%" }, "100%": { backgroundPosition: "0 50%" } },
        "badge-pulse": { "0%,100%": { boxShadow: "0 4px 14px rgba(109,40,217,.5)" }, "50%": { boxShadow: "0 4px 22px rgba(139,92,246,.8)" } },
        "nudge-down": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(3px)" } },
      },
      animation: {
        "fade-in": "fade-in .2s ease",
        "drop-in": "drop-in .2s cubic-bezier(.16,1,.3,1)",
        "toast-in": "toast-in .28s cubic-bezier(.16,1,.3,1)",
        "toast-out": "toast-out .22s ease forwards",
        shimmer: "shimmer 1.4s ease infinite",
        "badge-pulse": "badge-pulse 2s infinite ease-in-out",
        "nudge-down": "nudge-down 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
