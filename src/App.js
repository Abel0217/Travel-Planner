import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import NavBar from './Components/NavBar';
import ItineraryView from './features/ItineraryView'; 
import ItineraryForm from './features/Itinerary/components/ItineraryForm';
import ItineraryDetails from './features/Itinerary/components/ItineraryDetails';
import ItineraryOverview from './features/Itinerary/components/ItineraryOverview/ItineraryOverview';
import FlightsTab from './features/Itinerary/components/FlightsTab';
import HotelTab from './features/Itinerary/components/HotelsTab';
import RestaurantsTab from './features/Itinerary/components/RestaurantsTab';
import TransportTab from './features/Itinerary/components/TransportTab';
import ActivitiesTab from './features/Itinerary/components/ActivitiesTab';
import Profile from './features/Profile';
import HomePage from './Pages/HomePage';
import Login from './Pages/Login';
import SignUp from './Pages/SignUp';
import Reminders from './features/Notifications';
import Expense from './features/Expense';
import FriendsPage from './features/Friends/FriendsPage';
import { AuthContextProvider, AuthContext } from './Contexts/AuthContext';
import './App.css';

// Private Wrapper for Authenticated Routes
function PrivateWrapper({ children }) {
  const { currentUser } = useContext(AuthContext);

  if (!currentUser) {
    // Redirect to login if user is not authenticated
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthContextProvider>
      <Router>
        <NavBar />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Private Routes */}
          <Route
            path="/*"
            element={
              <PrivateWrapper>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/itineraries-view" element={<ItineraryView />} />
                  <Route path="/itineraries/create" element={<ItineraryForm />} />
                  <Route path="/itineraries/:itineraryId" element={<ItineraryDetails />} />
                  <Route path="/itineraries/:itineraryId/overview" element={<ItineraryOverview />} />
                  <Route path="/itineraries/:itineraryId/flights" element={<FlightsTab />} />
                  <Route path="/itineraries/:itineraryId/hotels" element={<HotelTab />} />
                  <Route path="/itineraries/:itineraryId/restaurants" element={<RestaurantsTab />} />
                  <Route path="/itineraries/:itineraryId/transport" element={<TransportTab />} />
                  <Route path="/itineraries/:itineraryId/activities" element={<ActivitiesTab />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Reminders />} />
                  <Route path="/friends" element={<FriendsPage />} />
                  <Route path="/expenses" element={<Expense />} />
                </Routes>
              </PrivateWrapper>
            }
          />
        </Routes>
      </Router>
    </AuthContextProvider>
  );
}

export default App;
