import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Pages/Home';
import Login from './Pages/Login';
import SignUp from './Pages/SignUp';
import NavBar from './Components/NavBar';
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

  return (
    <Router>
      <NavBar openSignUp={toggleSignUp} openLogin={toggleLogin} />
      <Routes>
        <Route path="/" element={<Home />} />
        // These routes below might not be necessary if you're using modals instead of separate pages.
        // <Route path="/login" element={<Login isOpen={isLoginOpen} closeLogin={() => setLoginOpen(false)} switchToSignUp={toggleSignUp} />} />
        // <Route path="/signup" element={<SignUp isOpen={isSignUpOpen} closeSignUp={() => setSignUpOpen(false)} switchToLogin={toggleLogin} />} />
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
        />
      )}
    </Router>
  );
}

export default App;
