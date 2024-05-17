import { useParams } from 'react-router-dom';
import RestaurantsForm from './RestaurantForm';  


const RestaurantsTab = () => {
  const { itineraryId, dayId } = useParams();
  console.log("Itinerary ID:", itineraryId, "Day ID:", dayId);  // Log to check values

  return (
    <div>
      <h2>Restaurant Information</h2>
      <p>Fetching data for Itinerary ID: {itineraryId}, Day ID: {dayId}</p>
    </div>
  );
};

export default RestaurantsTab;
