import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './LotrMap.css';
// map assets
import firstAgeMap from '../assets/lotr-first-age-map.webp';
import secondAgeMap from '../assets/map-of-middle-earth.jpeg';
import thirdAgeMap from '../assets/lotr-first-age-map.webp';
import fourthAgeMap from '../assets/lotr-first-age-map.webp';
import middleEarthMap from '../assets/middle-earth-detailed.jpg';

const ERAS = ['First Age', 'Second Age', 'Third Age', 'Fourth Age', 'Latter Ages'];

export default function LotrMap() {
  const [selected, setSelected] = useState(0);
  const trackRef = useRef(null);
  const handleRef = useRef(null);

  // Map images per era. Replace placeholders by adding images to src/assets and
  // importing them here.
  const maps = [
    firstAgeMap, // First Age
    secondAgeMap, // Second Age (placeholder)
    thirdAgeMap, // Third Age (placeholder)
    fourthAgeMap, // Fourth Age (placeholder)
    middleEarthMap, // Latter Ages (placeholder)
  ];

  const [imageSrc, setImageSrc] = useState(maps[0]);

  useEffect(() => {
    setImageSrc(maps[selected]);
  }, [selected]);

  const positionsForNotches = useCallback(() => {
    const count = ERAS.length;
    return Array.from({ length: count }, (_, i) => (i / (count - 1)) * 100);
  }, []);

  const positions = positionsForNotches();

  const indexForClientX = (clientX) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const innerLeft = rect.left + 24;
    const innerWidth = rect.width - 48;
    const x = Math.min(Math.max(clientX - innerLeft, 0), innerWidth);
    const pct = (x / innerWidth) * 100;
    let best = 0;
    let bestDist = Infinity;
    positions.forEach((p, i) => {
      const d = Math.abs(p - pct);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  };

  useEffect(() => {
    let onMove = null;
    let onUp = null;

    function startDrag(ev) {
      ev.preventDefault();

      onMove = (e) => {
        const idx = indexForClientX(e.clientX);
        setSelected(idx);
      };

      onUp = () => {
        if (onMove) document.removeEventListener('pointermove', onMove);
        if (onUp) document.removeEventListener('pointerup', onUp);
        document.body.style.userSelect = '';
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.body.style.userSelect = 'none';
    }

    const handle = handleRef.current;
    const track = trackRef.current;
    if (handle) handle.addEventListener('pointerdown', startDrag);
    const clickJump = (e) => {
      const idx = indexForClientX(e.clientX);
      setSelected(idx);
    };
    if (track) track.addEventListener('pointerdown', clickJump);

    return () => {
      if (handle) handle.removeEventListener('pointerdown', startDrag);
      if (track) track.removeEventListener('pointerdown', clickJump);
      if (onMove) document.removeEventListener('pointermove', onMove);
      if (onUp) document.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
    };
  }, [positions]);

  return (
    <div className="lotr-map-container">
      <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center'}}>
          <div><Link to="..">← Back</Link></div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2>LOTR Map</h2>
          <h3>...under construction</h3>
          <h4>-help me with content Jacob!</h4>
        </div>
      </div>

      <div className="map-wrapper">
        <div className="selected-era" aria-live="polite">{ERAS[selected]}</div>
        <img
          className="map-image"
          src={imageSrc}
          alt={`Map of Middle-earth (${ERAS[selected]})`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent && !parent.querySelector('.map-fallback')) {
              const fallback = document.createElement('div');
              fallback.className = 'map-fallback';
              fallback.textContent = 'Map image not found';
              parent.appendChild(fallback);
            }
          }}
        />
      </div>

      <div className="timeline" aria-label="Timeline of Ages">
        <div className="timeline-track" ref={trackRef}>
          <div className="track-line" />

          {positions.map((pct, i) => (
            <div
              key={ERAS[i]}
              className={`notch ${i === selected ? 'active' : ''}`}
              onClick={() => setSelected(i)}
              style={{ left: `${pct}%` }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(i); }}
              aria-label={ERAS[i]}
            />
          ))}

          <div
            ref={handleRef}
            className="timeline-handle"
            style={{ left: `${positions[selected]}%` }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={ERAS.length - 1}
            aria-valuenow={selected}
            aria-label={`Selected era: ${ERAS[selected]}`}
          />
        </div>

        <div className="notch-labels">
          {ERAS.map((label) => (
            <div key={label} className="era-label">{label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
