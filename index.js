const askPriceP = document.getElementById("askPrice");
let todaysDateP = document.getElementById("todaysDate");
let currentTimeP = document.getElementById("currentTime");
let marketStatus = document.getElementById("marketStatus");

// Price elements for BHD only
const weights = ['oneGram', 'twoHalfGram', 'fiveGram', 'tenGram', 'twentyGram', 'oneOunce', 'fiftyGram', 'hundredGram', 'ttPrice'];

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

const API_KEY_STATIC = "fz7uld3FsJ8nMBcbpn1D";
const API_KEY_STREAMING = "wsQ4Mke4Fhx8lePQI1pQ";

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
        ttPrice: (((price + 13) / 31.10347) * 116.64 * 0.377).toFixed(3)
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
        
        // Display error message to user
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
        
        return false;
    }
}

const connectWS = () => {
    let askPriceHistory = [];
    socket = new WebSocket("wss://marketdata.tradermade.com/feedadv");

    socket.onopen = function (e) {
        socket.send(`{"userKey":"${API_KEY_STREAMING}", "symbol":"XAUUSD"}`);
    };

    socket.onmessage = function incoming(data) {
        let askPrice = data.data.split(",")[3];
        let askPriceFormatted = askPrice.substring(6, askPrice.length);
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
    };

    socket.onerror = function (error) {
        console.error(`WebSocket Error: ${error.message}`);
        setTimeout(connectWS, 5000);
    };

    socket.onclose = function() {
        console.log('WebSocket Connection Closed. Reconnecting...');
        setTimeout(connectWS, 5000);
    };
};

// Initialize the application
async function initializeApp() {
    const currentDay = new Date().getDay();
    const isWeekend = currentDay === 0 || currentDay === 6;

    if (isWeekend) {
        // Initial fetch for closed market
        await getClosedMarketPrice();
        // Set up polling for closed market updates (every 5 minutes)
        setInterval(getClosedMarketPrice, 300000);
    } else {
        if (marketStatus) {  // Check if element exists before updating
            marketStatus.innerHTML = "";
        }
        connectWS();
        // Check WebSocket connection every 2 minutes
        setInterval(() => {
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                connectWS();
            }
        }, 120000);
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