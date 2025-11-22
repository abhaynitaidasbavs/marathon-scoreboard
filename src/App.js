import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, TrendingUp, BookOpen, Award, LogOut, Plus, Edit2, Trash2, Download, Users } from 'lucide-react';
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

// Book point values
const BOOK_VALUES = {
  Bhagavatam: 72,
  CC: 36,
  MBB: 2,
  BB: 1,
  MB: 0.5,
  SB: 0.25
};

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

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setIsAdmin(!!user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to teams changes
  useEffect(() => {
    const unsubscribe = getTeams((teamsData) => {
      setTeams(teamsData);
    });
    return () => unsubscribe();
  }, []);

  // Load leaders
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

  // Calculate points and books for a team
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

  // Get teams with calculated stats
  const getTeamsWithStats = () => {
    return teams.map(team => ({
      ...team,
      ...calculateStats(team.books)
    }));
  };

  // Filter and sort teams
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

  // Admin login
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

  // Admin logout
  const handleLogout = async () => {
    try {
      await logoutUser();
      setIsAdmin(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Add/Edit team
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

  // Delete team
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

  // Add leader
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

  // Delete leader
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

  // Export to CSV
  const exportToCSV = () => {
    const teamsWithStats = getTeamsWithStats();
    const headers = ['Rank', 'Team Name', 'BV Leader', 'Bhagavatam', 'CC', 'MBB', 'BB', 'MB', 'SB', 'Total Books', 'Total Points'];
    const rows = teamsWithStats.map((team, idx) => [
      idx + 1,
      team.name,
      team.leader,
      team.books.Bhagavatam,
      team.books.CC,
      team.books.MBB,
      team.books.BB,
      team.books.MB,
      team.books.SB,
      team.totalBooks,
      team.totalPoints
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const filteredTeams = getFilteredTeams();
  const chartData = filteredTeams.slice(0, 10).map((team) => ({
    name: team.name,
    points: team.totalPoints,
    books: team.totalBooks
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-md border-b-4 border-orange-500">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-orange-600">Marathon Scoreboard</h1>
                <p className="text-sm text-gray-600">ISKCON Book Distribution Campaign</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isAdmin ? (
                <>
                  <button
                    onClick={() => setShowLeaderManager(true)}
                    className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Manage Leaders
                  </button>
                  <button
                    onClick={() => setShowAddTeam(true)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Team
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold"
                >
                  Admin Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterLeader}
              onChange={(e) => setFilterLeader(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Leaders</option>
              {leaders.map(leader => (
                <option key={leader} value={leader}>{leader}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="points">Sort by Points</option>
              <option value="books">Sort by Total Books</option>
            </select>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Total Teams</p>
                <p className="text-4xl font-bold">{teams.length}</p>
              </div>
              <Award className="w-12 h-12 text-orange-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Books</p>
                <p className="text-4xl font-bold">{getTeamsWithStats().reduce((sum, t) => sum + t.totalBooks, 0)}</p>
              </div>
              <BookOpen className="w-12 h-12 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Points</p>
                <p className="text-4xl font-bold">{getTeamsWithStats().reduce((sum, t) => sum + t.totalPoints, 0).toFixed(2)}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-200" />
            </div>
          </div>
        </div>

        {/* Analytics Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Top 10 Teams Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="points" fill="#f97316" name="Points" />
              <Bar dataKey="books" fill="#3b82f6" name="Books" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Scoreboard Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orange-500 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Rank</th>
                  <th className="px-6 py-4 text-left">Team Name</th>
                  <th className="px-6 py-4 text-left">BV Leader</th>
                  <th className="px-6 py-4 text-center">Bhagavatam</th>
                  <th className="px-6 py-4 text-center">CC</th>
                  <th className="px-6 py-4 text-center">MBB</th>
                  <th className="px-6 py-4 text-center">BB</th>
                  <th className="px-6 py-4 text-center">MB</th>
                  <th className="px-6 py-4 text-center">SB</th>
                  <th className="px-6 py-4 text-center">Total Books</th>
                  <th className="px-6 py-4 text-center">Total Points</th>
                  {isAdmin && <th className="px-6 py-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 12 : 11} className="px-6 py-8 text-center text-gray-500">
                      No teams found. {isAdmin && "Click 'Add Team' to get started!"}
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team, idx) => (
                    <tr key={team.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${idx === 0 ? 'text-yellow-500 text-2xl' : idx === 1 ? 'text-gray-400 text-xl' : idx === 2 ? 'text-orange-600 text-xl' : 'text-gray-700'}`}>
                            {idx + 1}
                          </span>
                          {idx < 3 && <Award className={`w-5 h-5 ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-orange-600'}`} />}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{team.name}</td>
                      <td className="px-6 py-4 text-gray-600">{team.leader}</td>
                      <td className="px-6 py-4 text-center">{team.books.Bhagavatam || 0}</td>
                      <td className="px-6 py-4 text-center">{team.books.CC || 0}</td>
                      <td className="px-6 py-4 text-center">{team.books.MBB || 0}</td>
                      <td className="px-6 py-4 text-center">{team.books.BB || 0}</td>
                      <td className="px-6 py-4 text-center">{team.books.MB || 0}</td>
                      <td className="px-6 py-4 text-center">{team.books.SB || 0}</td>
                      <td className="px-6 py-4 text-center font-bold text-blue-600">{team.totalBooks}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-600">{team.totalPoints.toFixed(2)}</td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setEditingTeam(team); setShowAddTeam(true); }}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(team.id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Login</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            <div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleLogin}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 font-semibold"
                >
                  Login
                </button>
                <button
                  onClick={() => { setShowLogin(false); setError(''); }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage BV Leaders</h2>
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLeader}
                  onChange={(e) => setNewLeader(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLeader()}
                  placeholder="New leader name"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddLeader}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {leaders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No leaders added yet</p>
              ) : (
                leaders.map(leader => (
                  <div key={leader} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>{leader}</span>
                    <button
                      onClick={() => handleDeleteLeader(leader)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowLeaderManager(false)}
              className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
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
    onSave(formData);
  };

  const handleBookChange = (bookType, value) => {
    setFormData({
      ...formData,
      books: { ...formData.books, [bookType]: parseInt(value) || 0 }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full my-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {team ? 'Edit Team' : 'Add New Team'}
        </h2>
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2">Team Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">BV Leader</label>
              <select
                value={formData.leader}
                onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Book Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.keys(BOOK_VALUES).map(bookType => (
                <div key={bookType}>
                  <label className="block text-gray-700 mb-2">
                    {bookType} ({BOOK_VALUES[bookType]} pts)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.books[bookType]}
                    onChange={(e) => handleBookChange(bookType, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-semibold"
            >
              {team ? 'Update Team' : 'Add Team'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;