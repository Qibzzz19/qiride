export function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-obsidian" aria-hidden="true">
      <div
        className="absolute -left-[28%] -top-[16%] h-[65vh] w-[95vw] rounded-full opacity-70 blur-[110px]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(37,99,235,0.23) 0%, rgba(29,78,216,0.08) 42%, transparent 70%)',
        }}
      />
      <div
        className="absolute -right-[32%] top-[22%] h-[52vh] w-[80vw] rounded-full opacity-55 blur-[120px]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.04) 48%, transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-[24%] left-[8%] h-[58vh] w-[95vw] rounded-full opacity-40 blur-[130px]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(59,130,246,0.16) 0%, rgba(37,99,235,0.04) 50%, transparent 72%)',
        }}
      />
      <div className="tech-grid absolute inset-0 opacity-50" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(11,15,25,0.2) 0%, rgba(11,15,25,0.46) 55%, #0B0F19 100%)',
        }}
      />
      <div className="scan-noise absolute inset-0" />
    </div>
  )
}
