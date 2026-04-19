import React, { useState } from 'react';

export default function DayDescription({ dayCity, isArrival, isDeparture, activities, hotel }) {
  const [expanded, setExpanded] = useState(false);

  let text = '';
  if (isArrival) {
    text = `Arrive at the ${dayCity} International Airport into the city of ${dayCity} and enjoy a stress-free start to your visit. Upon arrival check in to ${hotel?.name || 'your hotel'}. `;
    if (activities?.length > 0) {
      text += activities.map(a => a.description || a.name).join('. ') + '. ';
    } else {
      text += `Rest of the day at leisure to explore the city. `;
    }
    text += `Overnight stay at ${hotel?.name || 'hotel'}.`;
  } else if (isDeparture) {
    text = `Check out from ${hotel?.name || 'your hotel'} in ${dayCity}. Transfer to the airport for your departure flight.`;
  } else {
    if (activities?.length > 0) {
      text = activities.map(a => a.description || a.name).join('. ') + '. ';
      text += `Overnight stay at ${hotel?.name || 'hotel'} in ${dayCity}.`;
    } else {
      text = `Free day at leisure to explore ${dayCity} on your own. Overnight stay at ${hotel?.name || 'hotel'}.`;
    }
  }

  const truncated = text.length > 280 && !expanded;
  
  return (
    <div className="text-sm text-gray-600 leading-relaxed">
      {truncated ? (
        <>
          {text.slice(0, 280)}...
          <button onClick={() => setExpanded(true)} className="text-blue-600 hover:underline ml-1 font-medium">more</button>
        </>
      ) : (
        <>
          {text}
          {text.length > 280 && (
            <button onClick={() => setExpanded(false)} className="text-blue-600 hover:underline ml-1 font-medium">less</button>
          )}
        </>
      )}
    </div>
  );
}
