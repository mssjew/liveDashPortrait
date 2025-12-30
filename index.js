const askPriceP = document.getElementById("askPrice");
let todaysDateP = document.getElementById("todaysDate");
let currentTimeP = document.getElementById("currentTime");
let marketStatus = document.getElementById("marketStatus");

// Price elements for BHD only
const weights = ['oneGram', 'twoHalfGram', 'fiveGram', 'tenGram', 'twentyGram', 'oneOunce', 'fiftyGram', 'hundredGram', 'ttPrice'];
const fixedPrices = [];
let silverPriceElements = ['oneKgSilver'];

// Create object to store previous prices for comparison
let previousPrices = {};
weights.forEach(weight => {
    previousPrices[weight] = 0;
});


// Create object to store all price elements
let priceElements = {};
weights.forEach(weight => {
    priceElements[weight] = document.getElementById(`${weight}_bhd`);
    // Add initial class
    if (priceElements[weight]) {
        priceElements[weight].classList.add('itemPrice');
    }
});

// Handle silver price elements
silverPriceElements.forEach(item => {
    priceElements[item] = document.getElementById(`${item}_bhd`);
    if (priceElements[item]) {
        priceElements[item].classList.add('itemPrice', 'price-neutral');
    }
});

// Store previous silver price for comparison
let previousSilverPrice = 0;

function updateSilverPriceFromWS(silverPrice, silverPriceHistory) {
    try {
        // Apply the same formula as in getSilverPrice()
        var silverPriceNum = parseFloat(silverPrice) + PRICE_CORRECTOR;
        var silverPriceDecimal = Math.round(silverPriceNum * 100) / 100;
        
        // Convert from troy ounce to 1KG: multiply by 32.1507
        // Then convert to BD: multiply by 0.377
        // Add 50 BD markup
        var silverPricePerKg = silverPriceDecimal * 32.1507;
        var silverPriceBD = (silverPricePerKg * 0.377) + 110;
        
        // Update silver price element exactly like gold is handled
        const silverElement = priceElements['oneKgSilver'];
        if (silverElement) {
            silverElement.innerText = formatNumber(silverPriceBD, 3);
            silverPriceHistory.push(silverPriceBD);
            
            if (silverPriceHistory.length > 1) {
                if (silverPriceHistory[silverPriceHistory.length - 1] > silverPriceHistory[silverPriceHistory.length - 2]) {
                    silverElement.className = 'itemPrice price-up';
                } else if (silverPriceHistory[silverPriceHistory.length - 1] < silverPriceHistory[silverPriceHistory.length - 2]) {
                    silverElement.className = 'itemPrice price-down';
                } else {
                    silverElement.className = 'itemPrice price-neutral';
                }
            }
            
            if (silverPriceHistory.length > 3) {
                silverPriceHistory.shift();
            }
        }
        
        console.log('Silver price updated via WebSocket:', silverPrice, '-> BD:', silverPriceBD);
        return true;
    } catch (error) {
        console.error("Error updating silver price from WebSocket:", error.message);
        return false;
    }
}

const API_KEY_STATIC = "fz7uld3FsJ8nMBcbpn1D";
const API_KEY_STREAMING = "wsjQ0CImecnVl8ycNIsg";
const MASSIVE_API_KEY = "sSGPCXG_vSX4FtMsfS3qPo4W2RZMs98w";
const PRICE_CORRECTOR = 0; // Add any price adjustment if needed

// Format number with commas and decimals if needed
function formatNumber(num, decimals = 0) {
    const numStr = Number(num).toFixed(decimals);
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function updatePriceColor(element, newPrice, oldPrice) {
    element.classList.remove('price-up', 'price-down', 'price-neutral');
    if (oldPrice === 0) {
        element.classList.add('price-neutral');
    } else if (newPrice > oldPrice) {
        element.classList.add('price-up');
    } else if (newPrice < oldPrice) {
        element.classList.add('price-down');
    } else {
        element.classList.add('price-neutral');
    }
}


function calculatePrices(price) {
    // Calculate base BHD prices
    const bhd_prices = {
        oneGram: (((price + 700) / 31.10347) * 1 * 0.377).toFixed(3),
        twoHalfGram: (((price + 325) / 31.10347) * 2.5 * 0.377).toFixed(3),
        fiveGram: (((price + 275) / 31.10347) * 5 * 0.377).toFixed(3),
        tenGram: (((price + 180) / 31.10347) * 10 * 0.377).toFixed(3),
        twentyGram: (((price + 125) / 31.10347) * 20 * 0.377).toFixed(3),
        oneOunce: (((price + 82) / 31.10347) * 31.10347 * 0.377).toFixed(3),
        fiftyGram: (((price + 77) / 31.10347) * 50 * 0.377).toFixed(3),
        hundredGram: (((price + 41) / 31.10347) * 100 * 0.377).toFixed(3),
        ttPrice: ((((price + 13) / 31.10347) * 116.64 * 0.377) + 15).toFixed(3)
    };

    // Update BHD prices and colors
    weights.forEach(weight => {
        const bhd_price = Number(bhd_prices[weight]);
        priceElements[weight].innerText = formatNumber(bhd_price, 3);
        updatePriceColor(priceElements[weight], bhd_price, previousPrices[weight]);
        previousPrices[weight] = bhd_price;
    });
}

let socket;
let lastPrice = 0;

async function getSilverPrice() {
    try {
        const response = await fetch(`https://api.massive.com/v1/last_quote/currencies/XAG/USD?apiKey=${MASSIVE_API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`Silver API Error: ${response.status} ${response.statusText}`);
        }
        
        const apiPrice = await response.json();
        console.log("Silver API response:", apiPrice);
        
        // Calculate silver price using the provided formula
        var silverPrice = (apiPrice.last.bid + apiPrice.last.ask) / 2;
        var silverPriceNum = parseFloat(silverPrice) + PRICE_CORRECTOR;
        var silverPriceDecimal = Math.round(silverPriceNum * 100) / 100;
        
        // Convert from troy ounce to 1KG: multiply by 32.1507
        // Then convert to BD: multiply by 0.377
        // Add 50 BD markup
        var silverPricePerKg = silverPriceDecimal * 32.1507;
        var silverPriceBD = (silverPricePerKg * 0.377) + 110;
        
        // Update silver price element
        const silverElement = priceElements['oneKgSilver'];
        if (silverElement) {
            silverElement.innerText = formatNumber(silverPriceBD, 3);
            updatePriceColor(silverElement, silverPriceBD, previousSilverPrice);
            previousSilverPrice = silverPriceBD;
        }
        
        return true;
    } catch (error) {
        console.error("Error fetching silver price:", error.message);
        
        // Show error state for silver price
        const silverElement = priceElements['oneKgSilver'];
        if (silverElement) {
            silverElement.innerText = "Service Unavailable";
            silverElement.classList.add('price-error');
        }
        
        return false;
    }
}

async function getMassiveAPIPrice() {
    try {
        const response = await fetch(
            `https://api.massive.com/v1/last_quote/currencies/XAU/USD?apiKey=${MASSIVE_API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error(`Massive API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Massive API response:", data); // Debug log
        
        // Check different possible response structures
        let price;
        if (data && data.status === 'success' && data.last && typeof data.last === 'object') {
            // Massive API structure: last is an object with ask/bid
            // Use ask price (or average of ask/bid)
            if (data.last.ask) {
                price = data.last.ask;
            } else if (data.last.bid) {
                price = data.last.bid;
            } else {
                throw new Error("No ask or bid price in last object");
            }
        } else if (data && data.results && data.results.length > 0 && data.results[0].c) {
            // If data comes in results array with close price
            price = data.results[0].c;
        } else if (data && typeof data.price !== 'undefined') {
            // If price field exists
            price = data.price;
        } else if (data && typeof data.close !== 'undefined') {
            // If close field exists
            price = data.close;
        } else if (data && data.quotes && data.quotes.length > 0) {
            // If quotes array exists
            price = data.quotes[0].ask || data.quotes[0].bid || data.quotes[0].mid;
        } else {
            console.error("Unexpected Massive API response structure:", data);
            throw new Error("Could not find price in Massive API response");
        }
        
        // Ensure price is a valid number
        price = Number(price);
        if (isNaN(price)) {
            throw new Error("Price is not a valid number");
        }
        
        askPriceP.innerText = formatNumber(price, 2);
        askPriceP.classList.remove('price-error'); // Remove error class if present
        if (price > lastPrice) {
            askPriceP.className = 'price-up';
        } else if (price < lastPrice) {
            askPriceP.className = 'price-down';
        } else {
            askPriceP.className = 'price-neutral';
        }
        lastPrice = price;
        
        calculatePrices(price);
        
        // Also remove error class from all price elements
        weights.forEach(weight => {
            if (priceElements[weight]) {
                priceElements[weight].classList.remove('price-error');
            }
        });
        
        return true;
    } catch (error) {
        console.error("Error fetching Massive API price:", error.message);
        
        // Show service unavailable message
        if (askPriceP) {
            askPriceP.innerText = "Service Unavailable";
            askPriceP.className = 'price-error';
        }
        
        return false;
    }
}

async function getClosedMarketPrice() {
    try {
        const response = await fetch(
            `https://marketdata.tradermade.com/api/v1/live?currency=XAUUSD&api_key=${API_KEY_STATIC}`
        );
        
        // Check if response is OK
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        // Check content type
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            throw new Error(`Expected JSON but received: ${text.substring(0, 100)}...`);
        }
        
        const data = await response.json();
        
        // Validate data structure
        if (!data.quotes || !data.quotes[0] || !data.quotes[0].mid) {
            throw new Error("Invalid data structure from API");
        }
        
        const originalPrice = data.quotes[0].mid;
        
        // Subtract 20 dollars from the price
        const adjustedPrice = originalPrice;
        
        askPriceP.innerText = formatNumber(Number(adjustedPrice), 2);
        if (adjustedPrice > lastPrice) {
            askPriceP.className = 'price-up';
        } else if (adjustedPrice < lastPrice) {
            askPriceP.className = 'price-down';
        }
        lastPrice = adjustedPrice;
        
        // Use the adjusted price for calculations
        calculatePrices(adjustedPrice);
        return true;
    } catch (error) {
        console.error("Error fetching closed market price:", error.message);
        
        // Try Massive API as fallback
        console.log("Attempting to use Massive API as fallback...");
        const massiveSuccess = await getMassiveAPIPrice();
        
        if (!massiveSuccess) {
            // Display error message to user if both APIs fail
            if (askPriceP) {
                askPriceP.innerText = "Service Unavailable";
                askPriceP.className = 'price-error';
            }
            
            // Set all prices to show unavailable
            weights.forEach(weight => {
                if (priceElements[weight]) {
                    priceElements[weight].innerText = "---";
                    priceElements[weight].classList.add('price-error');
                }
            });
            
            // Keep silver price available even during gold API errors
            silverPriceElements.forEach(item => {
                if (priceElements[item] && !priceElements[item].classList.contains('price-error')) {
                    // Only show error if silver API also fails
                    getSilverPrice().catch(() => {
                        if (priceElements[item]) {
                            priceElements[item].innerText = "Service Unavailable";
                            priceElements[item].classList.add('price-error');
                        }
                    });
                }
            });
        }
        
        return massiveSuccess;
    }
}

const connectWS = () => {
    let askPriceHistory = [];
    let silverPriceHistory = [];
    
    // First, immediately try to get a price from the API while WebSocket connects
    getMassiveAPIPrice().catch(err => {
        console.error('Initial API call failed:', err);
    });
    
    // Also get initial silver price
    getSilverPrice().catch(err => {
        console.error('Initial silver API call failed:', err);
    });
    
    socket = new WebSocket('wss://socket.massive.com/forex');

    socket.onopen = function (e) {
        console.log('WebSocket connected. Sending authentication...');
        // Send authentication message
        socket.send(JSON.stringify({
            "action": "auth",
            "params": MASSIVE_API_KEY
        }));
    };

    socket.onmessage = function incoming(event) {
        try {
            const messages = JSON.parse(event.data);
            
            // Handle array of messages
            if (Array.isArray(messages)) {
                messages.forEach(msg => processMessage(msg));
            } else {
                processMessage(messages);
            }
            
            function processMessage(msg) {
                // Handle connection success
                if (msg.ev === 'status' && msg.status === 'connected') {
                    console.log('Connected successfully');
                    return;
                }
                
                // Handle authentication success
                if (msg.ev === 'status' && msg.status === 'auth_success') {
                    console.log('Authentication successful. Subscribing to XAU/USD and XAG/USD...');
                    // Subscribe to both gold and silver forex pairs for second aggregates
                    socket.send(JSON.stringify({"action":"subscribe", "params":"CAS.XAU/USD"}));
                    socket.send(JSON.stringify({"action":"subscribe", "params":"CAS.XAG/USD"}));
                    return;
                }
                
                // Handle subscription success
                if (msg.ev === 'status' && msg.message && msg.message.includes('subscribed')) {
                    console.log('Successfully subscribed to:', msg.message);
                    return;
                }
                
                // Handle forex aggregate data for gold (XAU/USD)
                if (msg.ev === 'CAS' && msg.pair === 'XAU/USD') {
                    // Use the close price from the aggregate
                    const askPriceFormatted = msg.c;
                    
                    askPriceP.innerText = formatNumber(Number(askPriceFormatted), 2);
                    askPriceHistory.push(Number(askPriceFormatted));
                    
                    if (askPriceHistory.length > 1) {
                        if (askPriceHistory[askPriceHistory.length - 1] > askPriceHistory[askPriceHistory.length - 2]) {
                            askPriceP.className = 'price-up';
                        } else if (askPriceHistory[askPriceHistory.length - 1] < askPriceHistory[askPriceHistory.length - 2]) {
                            askPriceP.className = 'price-down';
                        }
                    }
                    
                    if (askPriceHistory.length > 3) {
                        askPriceHistory.shift();
                    }
                    
                    if (askPriceFormatted) {
                        calculatePrices(Number(askPriceFormatted));
                    }
                }
                
                // Handle forex aggregate data for silver (XAG/USD)
                if (msg.ev === 'CAS' && msg.pair === 'XAG/USD') {
                    // Use the close price from the aggregate
                    const silverPrice = msg.c;
                    console.log('Received silver WebSocket data:', msg);
                    
                    if (silverPrice) {
                        updateSilverPriceFromWS(Number(silverPrice), silverPriceHistory);
                    }
                }
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    socket.onerror = function (error) {
        console.error(`WebSocket Error: ${error.message}`);
        // Use Massive API as fallback during WebSocket errors
        getMassiveAPIPrice().then(success => {
            if (!success) {
                console.error('Fallback to Massive API also failed');
            }
        });
        // Also try to get silver price via API
        getSilverPrice().catch(err => {
            console.error('Silver API fallback also failed:', err);
        });
        setTimeout(connectWS, 5000);
    };

    socket.onclose = function(event) {
        console.log('WebSocket Connection Closed. Code:', event.code, 'Reason:', event.reason);
        // If service is unavailable (1006 or specific close codes), use API fallback
        if (event.code === 1006 || event.reason?.includes('unavailable')) {
            console.log('Service unavailable, using Massive API fallback');
            getMassiveAPIPrice().then(success => {
                if (!success) {
                    console.error('Fallback to Massive API also failed');
                }
            });
            // Also get silver price via API
            getSilverPrice().catch(err => {
                console.error('Silver API fallback also failed:', err);
            });
        }
        setTimeout(connectWS, 5000);
    };
};

// Check if market is closed (weekends or outside trading hours)
function isMarketClosed() {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getUTCHours();
    
    // Market is closed on weekends
    if (day === 0 || day === 6) {
        return true;
    }
    
    // Forex market is generally closed from Friday 10 PM UTC to Sunday 10 PM UTC
    // Also closed during certain hours for maintenance
    if (day === 5 && hours >= 22) { // Friday after 10 PM UTC
        return true;
    }
    if (day === 0 && hours < 22) { // Sunday before 10 PM UTC
        return true;
    }
    
    return false;
}

// Initialize the application
async function initializeApp() {
    const marketClosed = isMarketClosed();

    if (marketClosed) {
        console.log("Market is closed. Using API for price updates.");
        // Initial fetch for closed market - try Massive API first
        const success = await getMassiveAPIPrice();
        if (!success) {
            // If Massive API fails, try the other API
            await getClosedMarketPrice();
        }
        
        // Also get initial silver price
        await getSilverPrice();
        
        // Set up polling for closed market updates (every minute)
        setInterval(async () => {
            const success = await getMassiveAPIPrice();
            if (!success) {
                await getClosedMarketPrice();
            }
            // Also update silver price
            await getSilverPrice();
        }, 60000);
    } else {
        console.log("Market is open. Attempting WebSocket connection.");
        if (marketStatus) {  // Check if element exists before updating
            marketStatus.innerHTML = "";
        }
        
        // Try connecting to WebSocket
        connectWS();
        
        // Immediately try API as well in case WebSocket fails
        setTimeout(() => {
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                console.log('WebSocket not connected after 5 seconds, using Massive API');
                getMassiveAPIPrice();
            }
            // Also get silver price
            getSilverPrice();
        }, 5000);
        
        // Check WebSocket connection every 30 seconds and use API if not connected
        setInterval(() => {
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                console.log('WebSocket not connected, attempting to use Massive API');
                getMassiveAPIPrice().then(success => {
                    if (!success) {
                        console.error('Both WebSocket and API are unavailable');
                        // Try the other API as last resort
                        getClosedMarketPrice();
                    }
                });
                // Also try to reconnect WebSocket
                if (!socket || socket.readyState === WebSocket.CLOSED) {
                    connectWS();
                }
            }
            // Update silver price every 30 seconds as well
            getSilverPrice();
        }, 30000);
    }
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const dateOptions = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    todaysDateP.innerText = now.toLocaleDateString('en-US', dateOptions);
    currentTimeP.innerText = now.toLocaleTimeString('en-US', timeOptions);
}

// Start the application
updateDateTime();
setInterval(updateDateTime, 1000);
initializeApp();

// Set up auto-refresh every 5 minutes to reload the entire page
setInterval(() => {
    console.log("Auto-refreshing page every 5 minutes...");
    window.location.reload();
}, 5 * 60 * 1000); // 5 minutes in milliseconds