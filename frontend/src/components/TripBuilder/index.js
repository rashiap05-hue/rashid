// Re-export the main TripBuilder component and sub-components
export { default as SaveProposalModal } from './SaveProposalModal';
export { default as ActivitiesModal } from './ActivitiesModal';
export { default as VehicleSelectionModal } from './VehicleSelectionModal';
export { default as UpdateFlightInfoModal } from './UpdateFlightInfoModal';
export { default as HotelOptionsModal } from './HotelOptionsModal';
export { default as HotelSelectionModal } from './HotelSelectionModal';
export { default as DayCard } from './DayCard';

// Export the main TripBuilder as default
// For now, we keep the main component in the original file and just use the extracted modals
import TripBuilder from '../TripBuilder.jsx';
export default TripBuilder;
