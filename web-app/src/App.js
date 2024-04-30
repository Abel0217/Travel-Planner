import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Pages/Home';
import Login from './Pages/Login';
import SignUp from './Pages/SignUp';
import NavBar from './Components/NavBar';
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

  return (
    <AuthContextProvider> {/* Wrap your component tree with AuthContextProvider */}
      <Router>
        <NavBar openSignUp={toggleSignUp} openLogin={toggleLogin} />
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Your existing routes */}
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
    </AuthContextProvider>
  );
}

export default App;
