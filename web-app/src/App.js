import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './Components/NavBar';
import ItineraryList from './features/Itinerary/components/ItineraryList';
import ItineraryForm from './features/Itinerary/components/ItineraryForm';
import ItineraryDetails from './features/Itinerary/components/ItineraryDetails';
import ItineraryOverview from './features/Itinerary/components/ItineraryOverview/ItineraryOverview'; 
import FlightsTab from './features/Itinerary/components/FlightsTab';
import HotelTab from './features/Itinerary/components/HotelsTab';
import RestaurantsTab from './features/Itinerary/components/RestaurantsTab';
import TransportTab from './features/Itinerary/components/TransportTab';
import ActivitiesTab from './features/Itinerary/components/ActivitiesTab';
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
    if (isLoginOpen) setLoginOpen(false);
  };

  const toggleLogin = () => {
    setLoginOpen(!isLoginOpen);
    if (isSignUpOpen) setSignUpOpen(false);
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
          <Route path="/itineraries/:itineraryId" element={<ItineraryDetails />} />
          <Route path="/itineraries/:itineraryId/overview" element={<ItineraryOverview />} />  
          <Route path="/itineraries/:itineraryId/flights" element={<FlightsTab />} />
          <Route path="/itineraries/:itineraryId/hotels" element={<HotelTab />} />
          <Route path="/itineraries/:itineraryId/restaurants" element={<RestaurantsTab />} />
          <Route path="/itineraries/:itineraryId/transport" element={<TransportTab />} />
          <Route path="/itineraries/:itineraryId/activities" element={<ActivitiesTab />} />
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
