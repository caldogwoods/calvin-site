import logo from './assets/calvin-hobbes.jpg';
import './App.css';
import { Routes, Route, Link } from 'react-router-dom';
import LotrMap from './LotrMap';
import MediaReviews from './MediaReviews';

function Home() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} alt="calvin and hobbes" />
        <p>
          Testing GitHub Pages for Calvin Woods.
        </p>
      </header>
    </div>
  );
}

function App() {
  return (
    <div>
      <nav className="App-nav">
        <Link to=".">Home</Link>
        <Link to="lotr-map">LOTR Map</Link>
        <Link to="media-reviews">Media Reviews</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="lotr-map" element={<LotrMap />} />
        <Route path="media-reviews" element={<MediaReviews />} />
      </Routes>
    </div>
  );
}

export default App;
