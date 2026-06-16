import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { ACTIVITY_TYPES, POINT_THRESHOLDS } from './constants';
import './ExerciseTracker.css';

export default function ExerciseTracker() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(ACTIVITY_TYPES[0].name);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const activityType = ACTIVITY_TYPES.find(a => a.name === selectedActivity);

    try {
      // Calculate points and round to nearest integer
      let calculatedPoints;
      if (activityType.multiplier) {
        calculatedPoints = duration ? Math.ceil(parseFloat(duration) * activityType.points) : 0;
      } else {
        calculatedPoints = Math.ceil(activityType.points);
      }

      const { error } = await supabase.from('activities').insert({
        user_id: user.id,
        activity_type: selectedActivity,
        duration_minutes: duration ? parseFloat(duration) : null,
        points: calculatedPoints,
        notes,
        activity_date: activityDate,
      });

      if (error) throw error;

      // Reset form
      setDuration('');
      setNotes('');
      setActivityDate(new Date().toISOString().split('T')[0]);

      // Refresh activities
      await fetchActivities();
    } catch (error) {
      console.error('Error adding activity:', error);
      setError('Failed to add activity: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteActivity = async (id) => {
    if (!window.confirm('Delete this activity?')) return;

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      setError('Failed to delete activity');
    }
  };

  const totalPoints = activities.reduce((sum, activity) => sum + activity.points, 0);

  const currentLevel = [...POINT_THRESHOLDS]
    .reverse()
    .find(threshold => totalPoints >= threshold.points) || POINT_THRESHOLDS[0];

  const nextLevel = POINT_THRESHOLDS.find(threshold => threshold.points > totalPoints);

  if (loading) {
    return <div className="exercise-container"><p>Loading...</p></div>;
  }

  return (
    <div className="exercise-container">
      <div className="exercise-header">
        <h2>Exercise Tracker</h2>
        <Link to="/exercise-stats" className="points-badge-link">
          <div className="points-badge">
            <span className="level-emoji">{currentLevel.emoji}</span>
            <div>
              <div className="level-title">{currentLevel.title}</div>
              <div className="points-text">{Math.round(totalPoints * 10) / 10} points</div>
              {nextLevel && (
                <div className="next-level">
                  {Math.round((nextLevel.points - totalPoints) * 10) / 10} to {nextLevel.title}
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="exercise-grid">
        <div className="add-activity-card">
          <h3>Log Activity</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="activity-type">Activity Type</label>
              <select
                id="activity-type"
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
                disabled={submitting}
              >
                {ACTIVITY_TYPES.map(type => (
                  <option key={type.name} value={type.name}>
                    {type.name} ({type.points} pts)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="activity-date">Date</label>
              <input
                id="activity-date"
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration (minutes)</label>
              <input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Optional"
                min="1"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it go?"
                rows="3"
                disabled={submitting}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Activity'}
            </button>
          </form>
        </div>

        <div className="activities-list-card">
          <h3>Recent Activities</h3>
          {activities.length === 0 ? (
            <p className="no-activities">No activities yet. Start logging!</p>
          ) : (
            <div className="activities-list">
              {activities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-header-row">
                    <strong>{activity.activity_type}</strong>
                    <span className="activity-points">{activity.points} pts</span>
                  </div>
                  <div className="activity-date">
                    {new Date(activity.activity_date).toLocaleDateString()}
                  </div>
                  {activity.duration_minutes && (
                    <div className="activity-duration">
                      {activity.duration_minutes} minutes
                    </div>
                  )}
                  {activity.notes && (
                    <div className="activity-notes">{activity.notes}</div>
                  )}
                  <button
                    onClick={() => deleteActivity(activity.id)}
                    className="btn-delete"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
