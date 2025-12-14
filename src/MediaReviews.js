import React from 'react';
import { Link } from 'react-router-dom';
import hobbes from './assets/hobbes.jpg';

export default function MediaReviews() {
  return (
    <div style={{padding: 20}}>
      <h2>Media Reviews</h2>
      <p>This is a placeholder page for media reviews.</p>
      <p>{`There isn't anything here yet :(`}</p>
      <img src={hobbes} alt="hobbes" />
      <Link to="..">← Back to Home</Link>
    </div>
  );
}
