import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
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
import ItineraryView from './features/ItineraryView'; 
import Profile from './features/Profile'; 
import HomePage from './Pages/HomePage';
import Login from './Pages/Login';
import SignUp from './Pages/SignUp';
import Reminders from './features/Notifications';
import Expense from './features/Expense';
import FriendsPage from './features/Friends/FriendsPage'; 
import { AuthContextProvider } from './Contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthContextProvider>
      <Router>
        <NavBar />
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
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/profile" element={<Profile />} />  
          <Route path="/notifications" element={<Reminders />} />
          <Route path="/friends" element={<FriendsPage />} /> 
          <Route path="/expenses" element={<Expense />} /> 
        </Routes>
      </Router>
    </AuthContextProvider>
  );
}

export default App;
