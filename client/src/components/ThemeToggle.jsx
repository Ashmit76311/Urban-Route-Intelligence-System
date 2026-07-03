export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="theme-toggle-icon">{isDark ? '🌙' : '☀️'}</span>
      <div className="theme-toggle-track">
        <div className="theme-toggle-thumb" />
      </div>
    </button>
  );
}
