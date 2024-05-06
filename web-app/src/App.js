import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Pages/Home';
import Login from './Pages/Login';
import SignUp from './Pages/SignUp';
import NavBar from './Components/NavBar';
import ItineraryList from './features/Itinerary/components/ItineraryList'; // Correct component for itineraries
import ItineraryForm from './features/Itinerary/components/ItineraryForm';
import { AuthContextProvider } from './Contexts/AuthContext';
import './App.css'; 

function App() {
  const [isSignUpOpen, setSignUpOpen] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);

  const toggleSignUp = () => {
    setSignUpOpen(!isSignUpOpen);
    if(isLoginOpen) setLoginOpen(false);
  };

  const toggleLogin = () => {
    setLoginOpen(!isLoginOpen);
    if(isSignUpOpen) setSignUpOpen(false);
  };

  const openLogin = () => {
    setLoginOpen(true);
    setSignUpOpen(false);
  };

  return (
    <AuthContextProvider>
      <Router>
        <NavBar openSignUp={toggleSignUp} openLogin={toggleLogin} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/itineraries" element={<ItineraryList />} />
          <Route path="/itineraries/new" element={<ItineraryForm />} />
          {/* Ensure each path is unique and properly defined */}
        </Routes>
        {isLoginOpen && (
          <Login 
            isOpen={isLoginOpen} 
            closeLogin={() => setLoginOpen(false)} 
            switchToSignUp={toggleSignUp} 
          />
        )}
        {isSignUpOpen && (
          <SignUp 
            isOpen={isSignUpOpen} 
            closeSignUp={() => setSignUpOpen(false)} 
            switchToLogin={toggleLogin} 
            openLogin={openLogin}
          />
        )}
      </Router>
    </AuthContextProvider>
  );
}

export default App;
