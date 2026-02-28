export interface Room {
  id: string;
  name: string;
  type: string;
  bedType: string;
  view: string;
  size: string;
  price: number;
  originalPrice: number;
  currency: string;
  amenities: string[];
  refundable: boolean;
  refundableUntil?: string;
  meals: string;
  images: string[];
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  description: string;
  starRating: number;
  ratingScore: number;
  ratingText: string;
  reviewCount: number;
  images: string[];
  amenities: string[];
  detailedRatings: {
    cleanliness: number;
    service: number;
    comfort: number;
    condition: number;
    amenities: number;
  };
  whatToKnow: {
    icon: string;
    title: string;
    description: string;
  }[];
  rooms: Room[];
}

export const HOTEL_DATABASE: Hotel[] = [
  {
    id: "H001",
    name: "Courtyard by Marriott Baku",
    city: "Baku",
    country: "Azerbaijan",
    address: "300-303 Quarter, Nasimi District, Baku",
    description: "A stay at Courtyard by Marriott Baku places you in the heart of Baku, within a 15-minute walk of Heydar Aliyev Palace and 28 Mall. This upscale hotel is 1.6 mi (2.5 km) from Sabir Park and 1.6 mi (2.6 km) from Baku City Circuit.",
    starRating: 4,
    ratingScore: 9.2,
    ratingText: "Wonderful",
    reviewCount: 107,
    images: [
      "https://picsum.photos/seed/baku1/1200/800",
      "https://picsum.photos/seed/baku2/1200/800",
      "https://picsum.photos/seed/baku3/1200/800"
    ],
    amenities: ["Pool", "Spa", "Beach Access", "Free WiFi", "Fitness Center"],
    detailedRatings: {
      cleanliness: 4.7,
      service: 4.6,
      comfort: 4.7,
      condition: 4.7,
      amenities: 4.6
    },
    whatToKnow: [
      { icon: "Lobby", title: "LobbyAmbience", description: "Spacious lobby with comfortable seating area" },
      { icon: "Shopping", title: "LocalShopping", description: "Walking distance to local markets and shops" },
      { icon: "Train", title: "MetroProximity", description: "5-minute walk to 28 May metro station" },
      { icon: "Maximize", title: "SpaciousRooms", description: "Rooms average 323 sq ft, with modern amenities" }
    ],
    rooms: [
      {
        id: "R001",
        name: "Superior, Guest Room, 1 King, City View",
        type: "Superior Room",
        bedType: "1 King",
        view: "City View",
        size: "30 sqm",
        price: 1861,
        originalPrice: 1918,
        currency: "AED",
        amenities: ["Free WiFi", "TV", "Minibar"],
        refundable: true,
        refundableUntil: "11 Mar",
        meals: "No meals included",
        images: ["https://picsum.photos/seed/room1/800/600"]
      },
      {
        id: "R002",
        name: "Superior, Guest Room, 2 Twin, City View",
        type: "Superior Room",
        bedType: "2 Twin",
        view: "City View",
        size: "30 sqm",
        price: 1946,
        originalPrice: 2006,
        currency: "AED",
        amenities: ["Free WiFi", "TV", "Minibar"],
        refundable: true,
        refundableUntil: "11 Mar",
        meals: "No meals included",
        images: ["https://picsum.photos/seed/room2/800/600"]
      }
    ]
  },
  {
    id: "H002",
    name: "Burj Al Arab Jumeirah",
    city: "Dubai",
    country: "United Arab Emirates",
    address: "Jumeirah St, Dubai",
    description: "The distinctive sail-shaped silhouette of Burj Al Arab Jumeirah is more than just a stunning hotel, it is a symbol of modern Dubai.",
    starRating: 7,
    ratingScore: 9.8,
    ratingText: "Exceptional",
    reviewCount: 2540,
    images: [
      "https://picsum.photos/seed/burj1/1200/800",
      "https://picsum.photos/seed/burj2/1200/800"
    ],
    amenities: ["Pool", "Spa", "Beach Access", "Free WiFi", "Fitness Center"],
    detailedRatings: {
      cleanliness: 4.9,
      service: 5.0,
      comfort: 4.9,
      condition: 4.9,
      amenities: 4.8
    },
    whatToKnow: [
      { icon: "Star", title: "Luxury", description: "World's only 7-star hotel experience" }
    ],
    rooms: [
      {
        id: "R003",
        name: "Deluxe Marina Suite",
        type: "Suite",
        bedType: "1 King",
        view: "Marina View",
        size: "170 sqm",
        price: 5500,
        originalPrice: 6000,
        currency: "AED",
        amenities: ["Butler Service", "Hermes Amenities"],
        refundable: false,
        meals: "Breakfast Included",
        images: ["https://picsum.photos/seed/suite1/800/600"]
      }
    ]
  }
];
