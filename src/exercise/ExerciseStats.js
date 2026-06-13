import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { POINT_THRESHOLDS } from './constants';
import './ExerciseStats.css';

export default function ExerciseStats() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [targetPoints, setTargetPoints] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: true });

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch active goal
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (goalError && goalError.code !== 'PGRST116') throw goalError;
      setGoal(goalData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSetGoal = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Deactivate old goals
      if (goal) {
        await supabase
          .from('goals')
          .update({ is_active: false })
          .eq('id', goal.id);
      }

      // Create new goal
      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        target_points: parseInt(targetPoints),
        end_date: endDate,
        is_active: true,
      });

      if (error) throw error;

      setTargetPoints('');
      setEndDate('');
      setShowGoalForm(false);
      await fetchData();
    } catch (error) {
      console.error('Error setting goal:', error);
      setError('Failed to set goal: ' + error.message);
    }
  };

  const handleDeleteGoal = async () => {
    if (!window.confirm('Delete current goal?')) return;

    try {
      const { error } = await supabase
        .from('goals')
        .update({ is_active: false })
        .eq('id', goal.id);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Failed to delete goal');
    }
  };

  // Calculate stats
  const totalPoints = activities.reduce((sum, activity) => sum + activity.points, 0);

  const currentLevel = [...POINT_THRESHOLDS]
    .reverse()
    .find(threshold => totalPoints >= threshold.points) || POINT_THRESHOLDS[0];

  // Points over time (cumulative)
  const cumulativeData = activities.reduce((acc, activity) => {
    const lastTotal = acc.length > 0 ? acc[acc.length - 1].total : 0;
    acc.push({
      date: new Date(activity.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total: lastTotal + activity.points,
      points: activity.points,
    });
    return acc;
  }, []);

  // Points by activity type
  const pointsByType = activities.reduce((acc, activity) => {
    acc[activity.activity_type] = (acc[activity.activity_type] || 0) + activity.points;
    return acc;
  }, {});

  const activityTypeData = Object.entries(pointsByType).map(([name, points]) => ({
    name,
    points: Math.round(points * 10) / 10,
  }));

  // Goal progress
  const daysLeft = goal ? Math.ceil((new Date(goal.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const pointsLeft = goal ? Math.max(0, goal.target_points - totalPoints) : null;
  const progressPercent = goal ? Math.min(100, (totalPoints / goal.target_points) * 100) : null;

  if (loading) {
    return <div className="stats-container"><p>Loading...</p></div>;
  }

  return (
    <div className="stats-container">
      <div className="stats-header">
        <Link to="/exercise-tracker" className="back-link">← Back to Tracker</Link>
        <h2>Exercise Stats</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-grid">
        {/* Current Level Card */}
        <div className="stat-card level-card">
          <h3>Current Level</h3>
          <div className="level-display">
            <span className="level-emoji-large">{currentLevel.emoji}</span>
            <div className="level-info">
              <div className="level-title-large">{currentLevel.title}</div>
              <div className="points-text-large">{Math.round(totalPoints * 10) / 10} points</div>
            </div>
          </div>
        </div>

        {/* Goal Card */}
        <div className="stat-card goal-card">
          <h3>Goal</h3>
          {goal ? (
            <div className="goal-display">
              <div className="goal-info">
                <div className="goal-target">{goal.target_points} points by {new Date(goal.end_date).toLocaleDateString()}</div>
                <div className="goal-status">
                  <div className="goal-stat">
                    <span className="goal-label">Points Left:</span>
                    <span className="goal-value">{pointsLeft}</span>
                  </div>
                  <div className="goal-stat">
                    <span className="goal-label">Days Left:</span>
                    <span className="goal-value">{daysLeft}</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <div className="progress-text">{Math.round(progressPercent)}% complete</div>
              </div>
              <button onClick={handleDeleteGoal} className="btn-secondary">Clear Goal</button>
            </div>
          ) : (
            <div className="no-goal">
              {showGoalForm ? (
                <form onSubmit={handleSetGoal} className="goal-form">
                  <div className="form-group">
                    <label htmlFor="target-points">Target Points</label>
                    <input
                      id="target-points"
                      type="number"
                      value={targetPoints}
                      onChange={(e) => setTargetPoints(e.target.value)}
                      required
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="end-date">End Date</label>
                    <input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-buttons">
                    <button type="submit" className="btn-primary">Set Goal</button>
                    <button type="button" onClick={() => setShowGoalForm(false)} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              ) : (
                <div>
                  <p>No active goal set</p>
                  <button onClick={() => setShowGoalForm(true)} className="btn-primary">Set Goal</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cumulative Points Chart */}
        <div className="stat-card chart-card">
          <h3>Points Over Time</h3>
          {cumulativeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#667eea" strokeWidth={2} name="Total Points" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No activity data yet</p>
          )}
        </div>

        {/* Points by Activity Type */}
        <div className="stat-card chart-card">
          <h3>Points by Activity Type</h3>
          {activityTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="points" fill="#667eea" name="Points" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No activity data yet</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="stat-card quick-stats-card">
          <h3>Quick Stats</h3>
          <div className="quick-stats">
            <div className="quick-stat">
              <div className="quick-stat-value">{activities.length}</div>
              <div className="quick-stat-label">Total Activities</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-value">{Math.round(totalPoints * 10) / 10}</div>
              <div className="quick-stat-label">Total Points</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-value">
                {activities.length > 0 ? Math.round((totalPoints / activities.length) * 10) / 10 : 0}
              </div>
              <div className="quick-stat-label">Avg Points/Activity</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
