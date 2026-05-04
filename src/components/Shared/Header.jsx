const Header = () => (
  <header className="flex justify-between items-center py-4 mb-8">
    <div>
      <div className="flex items-center gap-3">
        <img src="/images/borderless-logo-only.png" alt="Borderless logo" className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">BORDERLESS SATPREP</h1>
      </div>
      <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Borderless Club</p>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium text-slate-700">Bamlak Bezuayehu</p>
        <p className="text-xs text-blue-600">Pro Member</p>
      </div>
      <div className="h-10 w-10 bg-slate-200 rounded-full border border-slate-300"></div>
    </div>
  </header>
);

export default Header;