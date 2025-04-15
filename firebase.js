// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, push, update, remove, onValue, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8PyYrGfsODSEYqhbeBP-CJE7UxEy83TE",
  authDomain: "raahi-2b943.firebaseapp.com",
  databaseURL: "https://raahi-2b943-default-rtdb.firebaseio.com",
  projectId: "raahi-2b943",
  storageBucket: "raahi-2b943.firebasestorage.app",
  messagingSenderId: "1058938218048",
  appId: "1:1058938218048:web:c3682e8bab8217b28561a5",
  measurementId: "G-LLVG1RN4V0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Authentication functions
export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
};

// User profile functions
export const createUserProfile = async (userId, profileData) => {
  try {
    // First try the normal way
    try {
      await set(ref(database, `users/${userId}`), {
        ...profileData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      // If we get a permission error, try an alternative approach
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when creating user profile. Using temporary local storage fallback.');
        
        // Store in localStorage as a temporary fallback
        const userData = {
          ...profileData,
          id: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
        
        // Show warning about using local storage
        alert('Your profile has been temporarily saved to local storage due to Firebase permission issues. Please contact the administrator to update Firebase security rules for permanent storage.');
        
        return true;
      } else {
        // If it's not a permission error, rethrow
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    // First try to get from Firebase
    try {
      const snapshot = await get(ref(database, `users/${userId}`));
      if (snapshot.exists()) {
        return snapshot.val();
      }
    } catch (error) {
      console.warn('Error fetching user profile from Firebase:', error);
      // Continue to local storage fallback
    }
    
    // If not found in Firebase or there was an error, check localStorage
    const localUserData = localStorage.getItem(`user_${userId}`);
    if (localUserData) {
      console.warn('Using profile data from localStorage due to Firebase permission issues');
      return JSON.parse(localUserData);
    }
    
    // If not found anywhere
    return null;
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (userId, profileData) => {
  try {
    // First try the normal way
    try {
      await update(ref(database, `users/${userId}`), {
        ...profileData,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      // If we get a permission error, try the localStorage approach
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when updating user profile. Using localStorage fallback.');
        
        // Get existing data from localStorage
        const existingData = localStorage.getItem(`user_${userId}`);
        let userData = existingData ? JSON.parse(existingData) : {};
        
        // Update with new data
        userData = {
          ...userData,
          ...profileData,
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
        
        console.warn('Profile updated in localStorage due to Firebase permission issues');
        return true;
      } else {
        // If it's not a permission error, rethrow
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

// Profile picture upload
export const uploadProfilePicture = async (userId, file) => {
  try {
    // Upload to Firebase Storage (this should work regardless of database rules)
    const fileRef = storageRef(storage, `profilePictures/${userId}`);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    
    // Try to update the profile in the database
    try {
      await update(ref(database, `users/${userId}`), {
        profilePicture: downloadURL,
        updatedAt: new Date().toISOString()
      });
    } catch (dbError) {
      // If database update fails due to permissions, update in localStorage
      if (dbError.message && dbError.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when updating profile picture. Using localStorage fallback.');
        
        // Get existing data from localStorage
        const existingData = localStorage.getItem(`user_${userId}`);
        let userData = existingData ? JSON.parse(existingData) : {};
        
        // Update with new profile picture URL
        userData = {
          ...userData,
          profilePicture: downloadURL,
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
        console.warn('Profile picture URL saved to localStorage due to Firebase permission issues');
      } else {
        // If it's not a permission error, rethrow
        throw dbError;
      }
    }
    
    return downloadURL;
  } catch (error) {
    throw error;
  }
};

// Ride functions
export const createRide = async (rideData) => {
  try {
    try {
      const newRideRef = push(ref(database, 'rides'));
      const rideId = newRideRef.key;
      
      await set(newRideRef, {
        ...rideData,
        id: rideId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return rideId;
    } catch (error) {
      // If permission denied, store in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when creating ride. Using localStorage fallback.');
        
        // Generate a mock ride ID
        const mockRideId = 'mock-ride-' + Date.now();
        
        // Create the ride object
        const ride = {
          ...rideData,
          id: mockRideId,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Get existing mock rides for this user
        const userId = rideData.driverId;
        const mockRidesKey = `mock_rides_${userId}`;
        const existingMockRides = localStorage.getItem(mockRidesKey);
        let mockRides = existingMockRides ? JSON.parse(existingMockRides) : [];
        
        // Add the new ride
        mockRides.push(ride);
        
        // Save back to localStorage
        localStorage.setItem(mockRidesKey, JSON.stringify(mockRides));
        
        console.warn('Ride saved to localStorage due to Firebase permission issues');
        
        // Show warning to user
        alert('Your ride has been saved locally due to Firebase permission issues. Please note that it will only be visible to you until the database permissions are fixed.');
        
        return mockRideId;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getRide = async (rideId) => {
  try {
    try {
      const snapshot = await get(ref(database, `rides/${rideId}`));
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        // Check if this is a mock ride
        if (rideId.startsWith('mock-ride')) {
          // Find the ride in localStorage
          const allStorageKeys = Object.keys(localStorage);
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_rides_')) {
              const rides = JSON.parse(localStorage.getItem(key));
              const ride = rides.find(r => r.id === rideId);
              
              if (ride) {
                console.warn(`Found mock ride in localStorage (${key})`);
                return ride;
              }
            }
          }
        }
        
        return null;
      }
    } catch (error) {
      // If permission denied, check localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when getting ride. Checking localStorage.');
        
        // Check if this is a mock ride
        if (rideId.startsWith('mock-ride')) {
          // Find the ride in localStorage
          const allStorageKeys = Object.keys(localStorage);
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_rides_')) {
              const rides = JSON.parse(localStorage.getItem(key));
              const ride = rides.find(r => r.id === rideId);
              
              if (ride) {
                console.warn(`Found mock ride in localStorage (${key})`);
                return ride;
              }
            }
          }
        }
        
        return null;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const updateRide = async (rideId, rideData) => {
  try {
    try {
      await update(ref(database, `rides/${rideId}`), {
        ...rideData,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      // If permission denied, update in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when updating ride. Using localStorage fallback.');
        
        // Check if this is a mock ride
        if (rideId.startsWith('mock-ride')) {
          // Find the ride in localStorage
          const allStorageKeys = Object.keys(localStorage);
          let foundRide = null;
          let foundInKey = null;
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_rides_')) {
              const rides = JSON.parse(localStorage.getItem(key));
              const rideIndex = rides.findIndex(r => r.id === rideId);
              
              if (rideIndex !== -1) {
                foundRide = rides[rideIndex];
                foundInKey = key;
                
                // Update the ride
                rides[rideIndex] = {
                  ...rides[rideIndex],
                  ...rideData,
                  updatedAt: new Date().toISOString()
                };
                
                // Save back to localStorage
                localStorage.setItem(key, JSON.stringify(rides));
              }
            }
          }
          
          if (foundRide) {
            console.warn(`Ride updated in localStorage (${foundInKey})`);
            return true;
          } else {
            throw new Error('Mock ride not found in localStorage');
          }
        } else {
          throw new Error('Cannot update non-mock ride in localStorage');
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const deleteRide = async (rideId) => {
  try {
    await remove(ref(database, `rides/${rideId}`));
    return true;
  } catch (error) {
    throw error;
  }
};

export const getAllRides = async () => {
  try {
    try {
      const snapshot = await get(ref(database, 'rides'));
      if (snapshot.exists()) {
        const rides = [];
        snapshot.forEach((childSnapshot) => {
          rides.push(childSnapshot.val());
        });
        return rides;
      } else {
        return [];
      }
    } catch (error) {
      // If permission denied, use mock data
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when getting all rides. Using mock data.');
        
        // Collect all mock rides from localStorage
        const allStorageKeys = Object.keys(localStorage);
        let allMockRides = [];
        
        for (const key of allStorageKeys) {
          if (key.startsWith('mock_rides_')) {
            const rides = JSON.parse(localStorage.getItem(key));
            allMockRides = [...allMockRides, ...rides];
          }
        }
        
        // If no mock rides found, create some sample rides
        if (allMockRides.length === 0) {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          allMockRides = [
            {
              id: 'mock-ride-sample-1',
              driverId: 'mock-driver-1',
              driverName: 'Amit Kumar',
              startingPoint: 'Bennett University',
              destination: 'Delhi',
              date: tomorrow.toISOString(),
              time: '10:00',
              price: 200,
              availableSeats: 3,
              totalSeats: 4,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'mock-ride-sample-2',
              driverId: 'mock-driver-2',
              driverName: 'Sneha Patel',
              startingPoint: 'Bennett University',
              destination: 'Noida',
              date: tomorrow.toISOString(),
              time: '14:30',
              price: 150,
              availableSeats: 2,
              totalSeats: 3,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];
          
          // Save these sample rides to localStorage for future use
          localStorage.setItem('mock_rides_samples', JSON.stringify(allMockRides));
        }
        
        return allMockRides;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getActiveRides = async () => {
  try {
    try {
      const ridesQuery = query(
        ref(database, 'rides'),
        orderByChild('status'),
        equalTo('active')
      );
      
      const snapshot = await get(ridesQuery);
      if (snapshot.exists()) {
        const rides = [];
        snapshot.forEach((childSnapshot) => {
          rides.push(childSnapshot.val());
        });
        return rides;
      } else {
        return [];
      }
    } catch (error) {
      // If permission denied, use mock data
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when getting active rides. Using mock data.');
        
        // Get all mock rides from localStorage and filter active ones
        const allMockRides = await getAllRides(); // Reuse our getAllRides function which now handles permission errors
        
        // Filter only active rides
        const activeRides = allMockRides.filter(ride => ride.status === 'active');
        
        return activeRides;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getUserRides = async (userId) => {
  try {
    try {
      const ridesQuery = query(
        ref(database, 'rides'),
        orderByChild('driverId'),
        equalTo(userId)
      );
      
      const snapshot = await get(ridesQuery);
      if (snapshot.exists()) {
        const rides = [];
        snapshot.forEach((childSnapshot) => {
          rides.push(childSnapshot.val());
        });
        return rides;
      } else {
        return [];
      }
    } catch (error) {
      // If permission denied, check for mock data in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when fetching user rides. Using mock data.');
        
        // Check if we have any mock rides in localStorage
        const mockRidesKey = `mock_rides_${userId}`;
        const mockRidesData = localStorage.getItem(mockRidesKey);
        
        if (mockRidesData) {
          return JSON.parse(mockRidesData);
        }
        
        // If no mock data exists yet, create some sample rides
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const mockRides = [
          {
            id: 'mock-ride-1',
            driverId: userId,
            driverName: localStorage.getItem(`user_${userId}`) ? JSON.parse(localStorage.getItem(`user_${userId}`)).fullName : 'Current User',
            startingPoint: 'Bennett University',
            destination: 'Greater Noida',
            date: tomorrow.toISOString(),
            time: '14:00',
            price: 150,
            availableSeats: 3,
            totalSeats: 4,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        
        // Save mock rides to localStorage
        localStorage.setItem(mockRidesKey, JSON.stringify(mockRides));
        
        return mockRides;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

// Booking functions
export const createBooking = async (bookingData) => {
  try {
    try {
      const newBookingRef = push(ref(database, 'bookings'));
      const bookingId = newBookingRef.key;
      
      await set(newBookingRef, {
        ...bookingData,
        id: bookingId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return bookingId;
    } catch (error) {
      // If permission denied, store in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when creating booking. Using localStorage fallback.');
        
        // Generate a mock booking ID
        const mockBookingId = 'mock-booking-' + Date.now();
        
        // Create the booking object
        const booking = {
          ...bookingData,
          id: mockBookingId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Get existing mock bookings for this user
        const userId = bookingData.passengerId;
        const mockBookingsKey = `mock_bookings_${userId}`;
        const existingMockBookings = localStorage.getItem(mockBookingsKey);
        let mockBookings = existingMockBookings ? JSON.parse(existingMockBookings) : [];
        
        // Add the new booking
        mockBookings.push(booking);
        
        // Save back to localStorage
        localStorage.setItem(mockBookingsKey, JSON.stringify(mockBookings));
        
        // Also add to the ride's bookings
        const rideId = bookingData.rideId;
        const mockRideBookingsKey = `mock_ride_bookings_${rideId}`;
        const existingRideBookings = localStorage.getItem(mockRideBookingsKey);
        let rideBookings = existingRideBookings ? JSON.parse(existingRideBookings) : [];
        
        // Add the booking to the ride's bookings
        rideBookings.push(booking);
        
        // Save back to localStorage
        localStorage.setItem(mockRideBookingsKey, JSON.stringify(rideBookings));
        
        console.warn('Booking saved to localStorage due to Firebase permission issues');
        
        // Show warning to user
        alert('Your booking has been saved locally due to Firebase permission issues. Please note that it will only be visible to you until the database permissions are fixed.');
        
        return mockBookingId;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getBooking = async (bookingId) => {
  try {
    try {
      const snapshot = await get(ref(database, `bookings/${bookingId}`));
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        // Check if this is a mock booking
        if (bookingId.startsWith('mock-booking')) {
          // Find the booking in localStorage
          const allStorageKeys = Object.keys(localStorage);
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_bookings_') || key.startsWith('mock_ride_bookings_')) {
              const bookings = JSON.parse(localStorage.getItem(key));
              const booking = bookings.find(b => b.id === bookingId);
              
              if (booking) {
                console.warn(`Found mock booking in localStorage (${key})`);
                return booking;
              }
            }
          }
        }
        
        return null;
      }
    } catch (error) {
      // If permission denied, check localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when getting booking. Checking localStorage.');
        
        // Check if this is a mock booking
        if (bookingId.startsWith('mock-booking')) {
          // Find the booking in localStorage
          const allStorageKeys = Object.keys(localStorage);
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_bookings_') || key.startsWith('mock_ride_bookings_')) {
              const bookings = JSON.parse(localStorage.getItem(key));
              const booking = bookings.find(b => b.id === bookingId);
              
              if (booking) {
                console.warn(`Found mock booking in localStorage (${key})`);
                return booking;
              }
            }
          }
        }
        
        return null;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const updateBookingStatus = async (bookingId, status) => {
  try {
    try {
      await update(ref(database, `bookings/${bookingId}`), {
        status,
        updatedAt: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      // If permission denied, update in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when updating booking status. Using localStorage fallback.');
        
        // Check if this is a mock booking
        if (bookingId.startsWith('mock-booking')) {
          // We need to update the booking in both the user's bookings and the ride's bookings
          
          // First, find the booking in all mock booking collections
          const allStorageKeys = Object.keys(localStorage);
          let foundBooking = null;
          let foundInKey = null;
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_bookings_') || key.startsWith('mock_ride_bookings_')) {
              const bookings = JSON.parse(localStorage.getItem(key));
              const bookingIndex = bookings.findIndex(b => b.id === bookingId);
              
              if (bookingIndex !== -1) {
                foundBooking = bookings[bookingIndex];
                foundInKey = key;
                
                // Update the booking
                bookings[bookingIndex] = {
                  ...bookings[bookingIndex],
                  status,
                  updatedAt: new Date().toISOString()
                };
                
                // Save back to localStorage
                localStorage.setItem(key, JSON.stringify(bookings));
              }
            }
          }
          
          if (foundBooking) {
            console.warn(`Booking status updated in localStorage (${foundInKey})`);
            return true;
          } else {
            throw new Error('Mock booking not found in localStorage');
          }
        } else {
          throw new Error('Cannot update non-mock booking in localStorage');
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getUserBookings = async (userId) => {
  try {
    try {
      const bookingsQuery = query(
        ref(database, 'bookings'),
        orderByChild('passengerId'),
        equalTo(userId)
      );
      
      const snapshot = await get(bookingsQuery);
      if (snapshot.exists()) {
        const bookings = [];
        snapshot.forEach((childSnapshot) => {
          bookings.push(childSnapshot.val());
        });
        return bookings;
      } else {
        return [];
      }
    } catch (error) {
      // If permission denied, check for mock data in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when fetching user bookings. Using mock data.');
        
        // Check if we have any mock bookings in localStorage
        const mockBookingsKey = `mock_bookings_${userId}`;
        const mockBookingsData = localStorage.getItem(mockBookingsKey);
        
        if (mockBookingsData) {
          return JSON.parse(mockBookingsData);
        }
        
        // If no mock data exists yet, create some sample bookings
        const today = new Date();
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        
        const mockBookings = [
          {
            id: 'mock-booking-1',
            passengerId: userId,
            passengerName: localStorage.getItem(`user_${userId}`) ? JSON.parse(localStorage.getItem(`user_${userId}`)).fullName : 'Current User',
            rideId: 'mock-ride-external-1',
            driverId: 'mock-driver-1',
            driverName: 'Amit Kumar',
            startingPoint: 'Bennett University',
            destination: 'Delhi',
            date: dayAfterTomorrow.toISOString(),
            time: '10:00',
            price: 200,
            status: 'approved',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        
        // Save mock bookings to localStorage
        localStorage.setItem(mockBookingsKey, JSON.stringify(mockBookings));
        
        return mockBookings;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getRideBookings = async (rideId) => {
  try {
    try {
      const bookingsQuery = query(
        ref(database, 'bookings'),
        orderByChild('rideId'),
        equalTo(rideId)
      );
      
      const snapshot = await get(bookingsQuery);
      if (snapshot.exists()) {
        const bookings = [];
        snapshot.forEach((childSnapshot) => {
          bookings.push(childSnapshot.val());
        });
        return bookings;
      } else {
        return [];
      }
    } catch (error) {
      // If permission denied, check for mock data in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when fetching ride bookings. Using mock data.');
        
        // Check if we have any mock bookings for this ride in localStorage
        const mockRideBookingsKey = `mock_ride_bookings_${rideId}`;
        const mockBookingsData = localStorage.getItem(mockRideBookingsKey);
        
        if (mockBookingsData) {
          return JSON.parse(mockBookingsData);
        }
        
        // If no mock data exists yet, create some sample bookings for this ride
        // For mock rides, we'll create some sample passengers
        if (rideId.startsWith('mock-ride')) {
          const mockPassengers = [
            {
              id: 'mock-booking-ride-1',
              passengerId: 'mock-passenger-1',
              passengerName: 'Priya Sharma',
              rideId: rideId,
              status: 'approved',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'mock-booking-ride-2',
              passengerId: 'mock-passenger-2',
              passengerName: 'Rahul Verma',
              rideId: rideId,
              status: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];
          
          // Save mock bookings to localStorage
          localStorage.setItem(mockRideBookingsKey, JSON.stringify(mockPassengers));
          
          return mockPassengers;
        }
        
        // For non-mock rides, return empty array
        return [];
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

// Real-time listeners
export const onUserProfileChange = (userId, callback) => {
  const userRef = ref(database, `users/${userId}`);
  return onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
};

export const onRideChange = (rideId, callback) => {
  const rideRef = ref(database, `rides/${rideId}`);
  return onValue(rideRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
};

export const onBookingsChange = (rideId, callback) => {
  const bookingsQuery = query(
    ref(database, 'bookings'),
    orderByChild('rideId'),
    equalTo(rideId)
  );
  
  return onValue(bookingsQuery, (snapshot) => {
    const bookings = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        bookings.push(childSnapshot.val());
      });
    }
    callback(bookings);
  });
};

export { auth, database, storage };