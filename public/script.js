// Function to calculate average funding rate
function calculateAverageFundingRate(history) {
    const total = history.reduce((acc, item) => acc + parseFloat(item.fundingRate), 0);
    const averageRate = total / history.length * 24 * 365 * 100; // Convert to yearly percentage and multiply by 100
    return Math.round(averageRate * 100) / 100; // Round to two decimal places
}

async function fetchFundingHistory(coin, startTime) {
    try {
        const response = await axios.post('https://api.hyperliquid.xyz/info', { type: "fundingHistory", coin, startTime });
        return response.data;
    } catch (error) {
        console.error(`Error fetching funding history for ${coin}:`, error);
        return [];
    }
}

async function fetchCoins() {
    try {
        const response = await axios.post('https://api.hyperliquid.xyz/info', { type: 'meta' });
        return response.data.universe.map(coin => coin.name);
    } catch (error) {
        console.error("Error fetching coins:", error);
        return [];
    }
}

// Existing functions (fetchCoins, fetchFundingHistory, calculateAverageFundingRate)

async function updateData() {
    const coins = await fetchCoins();
    const now = Date.now();
    const intervals = [1, 6, 12, 24, 72, 168, 336]; // hours for 1h, 6h, 12h, 24h, 72h, 7 days, 14 days

    const fetchPromises = coins.map(coin => {
        return Promise.all(intervals.map(hours => {
            const startTime = now - hours * 60 * 60 * 1000; // Convert hours to milliseconds
            return fetchFundingHistory(coin, startTime).then(history => {
                return { interval: `${hours}h`, rate: calculateAverageFundingRate(history) };
            });
        }))
        .then(results => {
            return { coin, rates: results.reduce((acc, curr) => ({...acc, [curr.interval]: curr.rate}), {}) };
        });
    });

    const allCoinData = await Promise.all(fetchPromises);
    displayData(allCoinData);

    setTimeout(updateData, 10 * 60 * 1000); // Update every 10 minutes
}

function displayData(allCoinData) {
    if ( $.fn.DataTable.isDataTable('#ratesTable') ) {
        $('#ratesTable').DataTable().clear().destroy();
    }

    const table = $('#ratesTable').DataTable({
        // Set the default page length to 100 entries
        "pageLength": 100
    });

    allCoinData.forEach(({ coin, rates }) => {
        table.row.add([
            coin,
            rates['1h'].toFixed(2) + '%',
            rates['6h'].toFixed(2) + '%',
            rates['12h'].toFixed(2) + '%',
            rates['24h'].toFixed(2) + '%',
            rates['72h'].toFixed(2) + '%',
            rates['168h'].toFixed(2) + '%',
            rates['336h'].toFixed(2) + '%'
        ]);
    });

    table.draw(); // Redraw the table with new data
}

document.addEventListener("DOMContentLoaded", updateData);

// // Initialize the data update when the page is fully loaded
// document.addEventListener("DOMContentLoaded", updateData);
