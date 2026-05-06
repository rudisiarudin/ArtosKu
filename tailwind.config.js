/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--bg-deep)",
                surface: "var(--bg-surface)",
                card: "var(--bg-card)",
                inner: "var(--bg-inner)",
                primary: "var(--accent-primary)",
                "accent-glow": "var(--accent-glow)",
                "text-primary": "var(--text-primary)",
                "text-secondary": "var(--text-secondary)",
                "text-muted": "var(--text-muted)",
                "border-subtle": "var(--border-subtle)",
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
