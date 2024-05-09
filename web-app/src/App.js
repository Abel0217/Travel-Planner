import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './Components/NavBar';
import ItineraryList from './features/Itinerary/components/ItineraryList';
import ItineraryForm from './features/Itinerary/components/ItineraryForm';
import HomePage from './features/HomePage';
import Login from './Pages/Login';
import SignUp from './Pages/SignUp';
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
          <Route path="/" element={<HomePage />} />
          <Route path="/itineraries" element={<ItineraryList />} />
          <Route path="/itineraries/create" element={<ItineraryForm />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
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
