import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Search, TrendingUp, BookOpen, Award, LogOut, Plus, Edit2, Trash2, Download, Users, Filter, X } from 'lucide-react';
import { 
  auth, 
  loginUser, 
  logoutUser, 
  onAuthChange,
  getTeams,
  addTeam,
  updateTeam,
  deleteTeam,
  getLeaders,
  addLeader,
  deleteLeader
} from './firebase';
//
// Book point values
const BOOK_VALUES = {
  Bhagavatam: 72,
  CC: 36,
  MBB: 2,
  BB: 1,
  MB: 0.5,
  SB: 0.25
};

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const App = () => {
  const [teams, setTeams] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLeader, setFilterLeader] = useState('all');
  const [sortBy, setSortBy] = useState('points');
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showLeaderManager, setShowLeaderManager] = useState(false);
  const [newLeader, setNewLeader] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setIsAdmin(!!user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = getTeams((teamsData) => {
      setTeams(teamsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadLeaders = async () => {
      try {
        const leadersData = await getLeaders();
        setLeaders(leadersData.map(l => l.name));
      } catch (err) {
        console.error('Error loading leaders:', err);
      }
    };
    loadLeaders();
  }, []);

  const calculateStats = (books) => {
    let totalBooks = 0;
    let totalPoints = 0;
    Object.keys(books).forEach(bookType => {
      const count = books[bookType] || 0;
      totalBooks += count;
      totalPoints += count * BOOK_VALUES[bookType];
    });
    return { totalBooks, totalPoints };
  };

  const getTeamsWithStats = () => {
    return teams.map(team => ({
      ...team,
      ...calculateStats(team.books)
    }));
  };

  const getFilteredTeams = () => {
    let filtered = getTeamsWithStats();

    if (searchTerm) {
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterLeader !== 'all') {
      filtered = filtered.filter(team => team.leader === filterLeader);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'points') {
        return b.totalPoints - a.totalPoints;
      } else {
        return b.totalBooks - a.totalBooks;
      }
    });

    return filtered;
  };

  const handleLogin = async () => {
    try {
      setError('');
      await loginUser(email, password);
      setShowLogin(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
      console.error('Login error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setIsAdmin(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleSaveTeam = async (teamData) => {
    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, teamData);
        setEditingTeam(null);
      } else {
        await addTeam(teamData);
      }
      setShowAddTeam(false);
    } catch (err) {
      console.error('Error saving team:', err);
      alert('Error saving team. Please try again.');
    }
  };

  const handleDeleteTeam = async (id) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      try {
        await deleteTeam(id);
      } catch (err) {
        console.error('Error deleting team:', err);
        alert('Error deleting team. Please try again.');
      }
    }
  };

  const handleAddLeader = async () => {
    if (newLeader && !leaders.includes(newLeader)) {
      try {
        await addLeader(newLeader);
        setLeaders([...leaders, newLeader]);
        setNewLeader('');
      } catch (err) {
        console.error('Error adding leader:', err);
        alert('Error adding leader. Please try again.');
      }
    }
  };

  const handleDeleteLeader = async (leader) => {
    if (window.confirm(`Remove ${leader} from the list?`)) {
      try {
        const leadersData = await getLeaders();
        const leaderDoc = leadersData.find(l => l.name === leader);
        if (leaderDoc) {
          await deleteLeader(leaderDoc.id);
          setLeaders(leaders.filter(l => l !== leader));
        }
      } catch (err) {
        console.error('Error deleting leader:', err);
        alert('Error deleting leader. Please try again.');
      }
    }
  };

  const exportToCSV = () => {
    const teamsWithStats = getFilteredTeams();
    const headers = ['Rank', 'Team Name', 'BV Leader', 'Bhagavatam', 'CC', 'MBB', 'BB', 'MB', 'SB', 'Total Books', 'Total Points'];
    const rows = teamsWithStats.map((team, idx) => [
      idx + 1,
      team.name,
      team.leader,
      team.books.Bhagavatam || 0,
      team.books.CC || 0,
      team.books.MBB || 0,
      team.books.BB || 0,
      team.books.MB || 0,
      team.books.SB || 0,
      team.totalBooks,
      team.totalPoints.toFixed(2)
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marathon-scoreboard-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading Marathon Scoreboard...</p>
        </div>
      </div>
    );
  }

  const filteredTeams = getFilteredTeams();
  const teamsWithStats = getTeamsWithStats();
  const totalTeams = teams.length;
  const totalBooks = teamsWithStats.reduce((sum, t) => sum + t.totalBooks, 0);
  const totalPoints = teamsWithStats.reduce((sum, t) => sum + t.totalPoints, 0);

  const chartData = filteredTeams.slice(0, 10).map((team) => ({
    name: team.name.length > 15 ? team.name.substring(0, 15) + '...' : team.name,
    points: team.totalPoints,
    books: team.totalBooks
  }));

  const bookDistribution = Object.keys(BOOK_VALUES).map(bookType => ({
    name: bookType,
    value: teamsWithStats.reduce((sum, team) => sum + (team.books[bookType] || 0), 0)
  })).filter(item => item.value > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-orange-500 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                <BookOpen className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                  Marathon Scoreboard
                </h1>
                <p className="text-sm text-gray-600 font-medium mt-1">ISKCON Book Distribution Campaign</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isAdmin ? (
                <>
                  <button
                    onClick={() => setShowLeaderManager(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2 font-medium"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Leaders</span>
                  </button>
                  <button
                    onClick={() => setShowAddTeam(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Team</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold"
                >
                  Admin Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Total Teams</p>
                <p className="text-5xl font-bold">{totalTeams}</p>
              </div>
              <Award className="w-16 h-16 text-orange-200 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Books</p>
                <p className="text-5xl font-bold">{totalBooks.toLocaleString()}</p>
              </div>
              <BookOpen className="w-16 h-16 text-blue-200 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Total Points</p>
                <p className="text-5xl font-bold">{totalPoints.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
              </div>
              <TrendingUp className="w-16 h-16 text-green-200 opacity-80" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-bold text-gray-800">Filters & Search</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              />
            </div>
            <select
              value={filterLeader}
              onChange={(e) => setFilterLeader(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
            >
              <option value="all">All Leaders</option>
              {leaders.map(leader => (
                <option key={leader} value={leader}>{leader}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
            >
              <option value="points">🏆 Sort by Points</option>
              <option value="books">📚 Sort by Total Books</option>
            </select>
            <button
              onClick={exportToCSV}
              className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Bar Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-orange-600" />
              Top 10 Teams Performance
            </h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #f97316',
                      borderRadius: '12px',
                      padding: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{paddingTop: '20px'}} />
                  <Bar dataKey="points" fill="#f97316" name="Points" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="books" fill="#3b82f6" name="Books" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">
                <p>No data available</p>
              </div>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-orange-600" />
              Book Distribution Breakdown
            </h2>
            {bookDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={bookDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bookDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">
                <p>No data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Scoreboard Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Award className="w-6 h-6" />
              Team Rankings
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-orange-500">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase">Team Name</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase">BV Leader</th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-gray-700 uppercase">Bhag</th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-gray-700 uppercase">CC</th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-gray-700 uppercase">MBB</th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-gray-700 uppercase">BB</th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-gray-700 uppercase">MB</th>
                  <th className="px-4 py-4 text-center text-sm font-bold text-gray-700 uppercase">SB</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase">Total Books</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase">Total Points</th>
                  {isAdmin && <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 12 : 11} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <BookOpen className="w-16 h-16 text-gray-300" />
                        <p className="text-xl text-gray-500 font-medium">No teams found</p>
                        {isAdmin && (
                          <button
                            onClick={() => setShowAddTeam(true)}
                            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-medium"
                          >
                            Add Your First Team
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team, idx) => (
                    <tr key={team.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {idx < 3 ? (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              idx === 0 ? 'bg-yellow-400 text-yellow-900' : 
                              idx === 1 ? 'bg-gray-300 text-gray-700' : 
                              'bg-orange-400 text-orange-900'
                            }`}>
                              {idx + 1}
                            </div>
                          ) : (
                            <span className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                              {idx + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-800 text-base">{team.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 font-medium">{team.leader}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-lg font-semibold">
                          {team.books.Bhagavatam || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-semibold">
                          {team.books.CC || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-lg font-semibold">
                          {team.books.MBB || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg font-semibold">
                          {team.books.BB || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-pink-100 text-pink-800 rounded-lg font-semibold">
                          {team.books.MB || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg font-semibold">
                          {team.books.SB || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-lg">
                          {team.totalBooks}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-lg">
                          {team.totalPoints.toFixed(2)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setEditingTeam(team); setShowAddTeam(true); }}
                              className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Edit Team"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(team.id)}
                              className="p-2.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete Team"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Admin Login</h2>
              <button
                onClick={() => { setShowLogin(false); setError(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                <span className="font-medium">{error}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="Enter password"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleLogin}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold text-lg"
                >
                  Login
                </button>
                <button
                  onClick={() => { setShowLogin(false); setError(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Team Modal */}
      {showAddTeam && (
        <TeamForm
          team={editingTeam}
          leaders={leaders}
          onSave={handleSaveTeam}
          onCancel={() => { setShowAddTeam(false); setEditingTeam(null); }}
        />
      )}

      {/* Leader Manager Modal */}
      {showLeaderManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Manage Leaders</h2>
              <button
                onClick={() => setShowLeaderManager(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLeader}
                  onChange={(e) => setNewLeader(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLeader()}
                  placeholder="Enter leader name"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
                <button
                  onClick={handleAddLeader}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
              {leaders.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No leaders added yet</p>
                </div>
              ) : (
                leaders.map(leader => (
                  <div key={leader} className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-white border-2 border-orange-100 rounded-xl hover:shadow-md transition-all">
                    <span className="font-semibold text-gray-800">{leader}</span>
                    <button
                      onClick={() => handleDeleteLeader(leader)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remove Leader"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowLeaderManager(false)}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-all font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Team Form Component
const TeamForm = ({ team, leaders, onSave, onCancel }) => {
  const [formData, setFormData] = useState(team || {
    name: '',
    leader: leaders[0] || '',
    books: { Bhagavatam: 0, CC: 0, MBB: 0, BB: 0, MB: 0, SB: 0 }
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert('Please enter a team name');
      return;
    }
    if (!formData.leader) {
      alert('Please select a BV Leader');
      return;
    }
    onSave(formData);
  };

  const handleBookChange = (bookType, value) => {
    setFormData({
      ...formData,
      books: { ...formData.books, [bookType]: parseInt(value) || 0 }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full my-8 transform transition-all">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-800">
            {team ? 'Edit Team' : 'Add New Team'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-2 font-semibold">Team Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="Enter team name"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2 font-semibold">BV Leader *</label>
              <select
                value={formData.leader}
                onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
              >
                {leaders.length === 0 ? (
                  <option value="">No leaders available</option>
                ) : (
                  leaders.map(leader => (
                    <option key={leader} value={leader}>{leader}</option>
                  ))
                )}
              </select>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-orange-600" />
              Book Distribution
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.keys(BOOK_VALUES).map(bookType => (
                <div key={bookType} className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-100 rounded-xl p-4 hover:shadow-md transition-all">
                  <label className="block text-gray-700 mb-2 font-semibold text-sm">
                    {bookType}
                    <span className="ml-2 text-xs text-orange-600 font-bold">
                      ({BOOK_VALUES[bookType]} pts)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.books[bookType]}
                    onChange={(e) => handleBookChange(bookType, e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-bold text-lg text-center"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-bold text-lg"
            >
              {team ? 'Update Team' : 'Add Team'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl hover:bg-gray-300 transition-all font-bold text-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;="block text-gray-700 mb-2 font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="admin@iskcon.org"
                />
              </div>
              <div>
                <label className
