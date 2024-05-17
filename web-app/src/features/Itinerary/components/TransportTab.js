import { useParams } from 'react-router-dom';
import TransportForm from './TransportForm';  

const TransportTabTab = () => {
  const { itineraryId, dayId } = useParams();
  console.log("Itinerary ID:", itineraryId, "Day ID:", dayId);  // Log to check values

  return (
    <div>
      <h2>Transportatation Information</h2>
      <p>Fetching data for Itinerary ID: {itineraryId}, Day ID: {dayId}</p>
    </div>
  );
};

export default TransportTabTab;
