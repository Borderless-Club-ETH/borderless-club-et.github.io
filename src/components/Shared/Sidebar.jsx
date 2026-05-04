const Sidebar = () => (
  <nav className="w-64 pr-8 hidden md:block">
    <ul className="space-y-2">
      <li className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium cursor-pointer">Dashboard</li>
      <li className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-lg cursor-pointer transition">Error Bank</li>
      <li className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-lg cursor-pointer transition">Leaderboards</li>
      <li className="text-slate-600 px-4 py-2 hover:bg-slate-100 rounded-lg cursor-pointer transition">Live Sessions</li>
    </ul>
  </nav>
);

export default Sidebar;