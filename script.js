        let marketData = [];
        const DEFAULT_SELECTION = ['Number of stocks up 4% plus today', 'Number of stocks down 4% plus today', 'T2108'];
        let selectedIndicators = new Set(JSON.parse(localStorage.getItem('selectedIndicators') || 'null') || DEFAULT_SELECTION);
        let autoRefreshEnabled = JSON.parse(localStorage.getItem('autoRefreshEnabled') || 'false');
        let autoRefreshInterval = null;
        let lastDataHash = null;
        let lastCheckTime = null;
        let currentFetchController = null;
        let isLoading = false;
        
        // Define indicator configurations with SVG gradient references
        const indicatorConfig = {
            // Primary Breadth Indicators - Emerald/Rose theme
            'Number of stocks up 4% plus today': { 
                color: '#10b981', // emerald-500
                gradientId: 'emeraldGradient',
                fillGradientId: 'emeraldFill',
                gradientColors: ['#6ee7b7', '#10b981'], // emerald-300 to emerald-500
                category: 'primary', 
                yAxis: 'left', 
                name: 'Stocks Up 4%+' 
            },
            'Number of stocks down 4% plus today': { 
                color: '#f43f5e', // rose-500
                gradientId: 'roseGradient',
                fillGradientId: 'roseFill',
                gradientColors: ['#fda4af', '#f43f5e'], // rose-300 to rose-500
                category: 'primary', 
                yAxis: 'left', 
                name: 'Stocks Down 4%+' 
            },
            '5 day ratio': { 
                color: '#8b5cf6', // violet-500
                gradientId: 'violetGradient',
                gradientColors: ['#c4b5fd', '#8b5cf6'], // violet-300 to violet-500
                category: 'primary', 
                yAxis: 'right', 
                name: '5-Day Ratio' 
            },
            '10 day  ratio ': { 
                color: '#f59e0b', // amber-500
                gradientId: 'amberGradient',
                gradientColors: ['#fcd34d', '#f59e0b'], // amber-300 to amber-500
                category: 'primary', 
                yAxis: 'right', 
                name: '10-Day Ratio' 
            },
            'Number of stocks up 25% plus in a quarter': { 
                color: '#059669', // emerald-600
                gradientId: 'emeraldGradient',
                gradientColors: ['#34d399', '#059669'], // emerald-400 to emerald-600
                category: 'primary', 
                yAxis: 'left', 
                name: 'Stocks Up 25%+ Quarter' 
            },
            'Number of stocks down 25% + in a quarter': { 
                color: '#e11d48', // rose-600
                gradientId: 'roseGradient',
                gradientColors: ['#fb7185', '#e11d48'], // rose-400 to rose-600
                category: 'primary', 
                yAxis: 'left', 
                name: 'Stocks Down 25%+ Quarter' 
            },
            
            // Secondary Breadth Indicators - Sky/Orange theme
            'Number of stocks up 25% + in a month': { 
                color: '#0ea5e9', // sky-500
                gradientId: 'skyGradient',
                fillGradientId: 'skyFill',
                gradientColors: ['#7dd3fc', '#0ea5e9'], // sky-300 to sky-500
                category: 'secondary', 
                yAxis: 'left', 
                name: 'Stocks Up 25%+ Month' 
            },
            'Number of stocks down 25% + in a month': { 
                color: '#dc2626', // red-600
                gradientId: 'redGradient',
                gradientColors: ['#f87171', '#dc2626'], // red-400 to red-600
                category: 'secondary', 
                yAxis: 'left', 
                name: 'Stocks Down 25%+ Month' 
            },
            'Number of stocks up 50% + in a month': { 
                color: '#0284c7', // sky-600
                gradientId: 'skyGradient',
                gradientColors: ['#38bdf8', '#0284c7'], // sky-400 to sky-600
                category: 'secondary', 
                yAxis: 'left', 
                name: 'Stocks Up 50%+ Month' 
            },
            'Number of stocks down 50% + in a month': { 
                color: '#b91c1c', // red-700
                gradientId: 'redGradient',
                gradientColors: ['#ef4444', '#b91c1c'], // red-500 to red-700
                category: 'secondary', 
                yAxis: 'left', 
                name: 'Stocks Down 50%+ Month' 
            },
            'Number of stocks up 13% + in 34 days': { 
                color: '#0369a1', // sky-700
                gradientId: 'skyGradient',
                gradientColors: ['#0ea5e9', '#0369a1'], // sky-500 to sky-700
                category: 'secondary', 
                yAxis: 'left', 
                name: 'Stocks Up 13%+ (34d)' 
            },
            'Number of stocks down 13% + in 34 days': { 
                color: '#991b1b', // red-800
                gradientId: 'redGradient',
                gradientColors: ['#dc2626', '#991b1b'], // red-600 to red-800
                category: 'secondary', 
                yAxis: 'left', 
                name: 'Stocks Down 13%+ (34d)' 
            },
            
            // Market Indicators - Special styling
            'T2108': { 
                color: '#ea580c', // orange-600
                gradientId: 'orangeGradient',
                gradientColors: ['#fb923c', '#ea580c'], // orange-400 to orange-600
                category: 'market', 
                yAxis: 'right', 
                name: 'T2108 (%)', 
                dashArray: [8, 4] // Modern dash pattern
            },
            'S&P': { 
                color: '#6366f1', // indigo-500
                gradientId: 'indigoGradient',
                gradientColors: ['#a5b4fc', '#6366f1'], // indigo-300 to indigo-500
                category: 'market', 
                yAxis: 'right', 
                name: 'S&P 500', 
                dashArray: [12, 6] // Modern dash pattern
            },
            ' Worden Common stock universe': { 
                color: '#65a30d', // lime-600
                gradientId: 'limeGradient',
                gradientColors: ['#a3e635', '#65a30d'], // lime-400 to lime-600
                category: 'market', 
                yAxis: 'left', 
                name: 'Total Universe' 
            }
        };

        // Canonicalize header labels and map to indicator keys
        function canonicalize(str) {
            return String(str || '').toLowerCase().replace(/\s+/g, ' ').trim();
        }

        const canonicalIndicatorKeyMap = (() => {
            const map = new Map();
            Object.keys(indicatorConfig).forEach((k) => {
                map.set(canonicalize(k), k);
            });
            return map;
        })();

        function mapHeaderToKey(header) {
            const ck = canonicalize(header);
            return canonicalIndicatorKeyMap.get(ck) || header.trim();
        }

        // Cache helpers
        function restoreFromCache() {
            try {
                const raw = localStorage.getItem('marketDataCache');
                if (!raw) return false;
                const cached = JSON.parse(raw);
                if (!cached || !Array.isArray(cached.data) || cached.data.length === 0) return false;
                marketData = cached.data;
                lastDataHash = cached.hash || generateDataHash(marketData);
                updateDataStatus('current', 'Loaded cached');
                updateDataInfo();
                createIndicatorCheckboxes();
                drawChart();
                updateCurrentReadings();
                return true;
            } catch (e) {
                return false;
            }
        }

        // Generate hash for data comparison
        function generateDataHash(data) {
            if (!data || data.length === 0) return null;
            const firstRow = data[0];
            const hashString = JSON.stringify({
                date: firstRow.Date,
                upStocks: firstRow['Number of stocks up 4% plus today'],
                downStocks: firstRow['Number of stocks down 4% plus today'],
                t2108: firstRow['T2108'],
                recordCount: data.length
            });
            return btoa(hashString); // Simple base64 hash
        }

        // Check for fresh data from Google Sheets
        async function checkForFreshData() {
            try {
                updateDataStatus('checking', 'Checking for updates...');
                
                // Fetch directly from Google Sheets CSV
                // Try export URL which should work better for freshness checks
                const response = await fetch('https://docs.google.com/spreadsheets/d/1O6OhS7ciA8zwfycBfGPbP2fWJnR0pn2UUvFZVDP9jpE/export?format=csv&t=' + Date.now());
                const csvText = await response.text();
                const lines = csvText.trim().split(/\r?\n/);
                
                // Parse just enough to get the latest data point
                const headers = lines[1].split(',');
                const latestRow = {};
                
                if (lines.length > 2) {
                    const values = lines[2].split(',');
                    headers.forEach((header, index) => {
                        let value = values[index];
                        if (value && header !== 'Date') {
                            value = value.replace(/[",]/g, '');
                            if (!isNaN(value) && value !== '') {
                                value = parseFloat(value);
                            }
                        }
                        latestRow[header] = value;
                    });
                }
                
                // Generate hash for comparison
                const newDataHash = generateDataHash([latestRow]);
                lastCheckTime = new Date();
                
                if (lastDataHash === null) {
                    lastDataHash = newDataHash;
                    updateDataStatus('current', 'Data loaded');
                    return { hasUpdate: false, isFirstLoad: true };
                } else if (newDataHash !== lastDataHash) {
                    lastDataHash = newDataHash;
                    updateDataStatus('updated', 'New data available!');
                    return { hasUpdate: true, latestData: latestRow };
                } else {
                    updateDataStatus('current', 'Data is current');
                    return { hasUpdate: false };
                }
                
            } catch (error) {
                console.error('Error checking for fresh data:', error);
                updateDataStatus('error', 'Check failed');
                return { hasUpdate: false, error: true };
            }
        }

        // Update data status display
        function updateDataStatus(status, message) {
            const statusElement = document.getElementById('data-status');
            const lastCheckElement = document.getElementById('last-check');
            
            // Update status badge
            statusElement.textContent = message;
            statusElement.className = 'px-2 py-1 rounded text-xs ';
            
            switch (status) {
                case 'checking':
                    statusElement.className += 'bg-yellow-200 text-yellow-800';
                    break;
                case 'current':
                    statusElement.className += 'bg-green-200 text-green-800';
                    break;
                case 'updated':
                    statusElement.className += 'bg-blue-200 text-blue-800';
                    break;
                case 'error':
                    statusElement.className += 'bg-red-200 text-red-800';
                    break;
                default:
                    statusElement.className += 'bg-gray-200 text-gray-600';
            }
            
            // Update last check time
            if (lastCheckTime) {
                lastCheckElement.textContent = `Last: ${lastCheckTime.toLocaleTimeString()}`;
            }
        }

        // Load and parse CSV data (enhanced version)
        async function loadMarketData(options = {}) {
            const { quiet = false } = options;
            try {
                const sp = document.getElementById('loading-spinner');
                if (sp && !quiet) sp.style.display = 'block';
                
                // Try multiple URLs to handle redirects and access issues
                let response;
                const urls = [
                    `https://docs.google.com/spreadsheets/d/1O6OhS7ciA8zwfycBfGPbP2fWJnR0pn2UUvFZVDP9jpE/pub?output=csv&t=${Date.now()}`,
                    `https://docs.google.com/spreadsheets/d/1O6OhS7ciA8zwfycBfGPbP2fWJnR0pn2UUvFZVDP9jpE/export?format=csv&t=${Date.now()}`,
                    `https://docs.google.com/spreadsheets/d/1O6OhS7ciA8zwfycBfGPbP2fWJnR0pn2UUvFZVDP9jpE/pub?output=csv`,
                    `https://docs.google.com/spreadsheets/d/1O6OhS7ciA8zwfycBfGPbP2fWJnR0pn2UUvFZVDP9jpE/export?format=csv`
                ];
                
                let csvText = '';
                for (let i = 0; i < urls.length; i++) {
                    try {
                        response = await fetch(urls[i]);
                        csvText = await response.text();
                        
                        // Check if we got HTML (redirect page) or actual CSV
                        if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<HTML>')) {
                            continue;
                        }
                        
                        // Check if we got valid CSV data
                        if (csvText.includes('Date,Number of stocks') || csvText.includes('Primary Breadth') || csvText.includes('Date,')) {
                            break;
                        }
                    } catch (error) {
                    }
                }
                
                if (!csvText || csvText.includes('<!DOCTYPE html>') || csvText.includes('<HTML>')) {
                    throw new Error('Could not fetch valid CSV data from Google Sheets. Check console for details.');
                }
                
                
                const lines = csvText.trim().split('\n');
                
                // Skip header rows and parse data
                
                // Parse CSV properly handling quoted values
                function parseCSVLine(line) {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            if (inQuotes && line[i + 1] === '"') { // escaped quote
                                current += '"';
                                i++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (char === ',' && !inQuotes) {
                            result.push(current);
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current);
                    return result;
                }
                
                // Locate header row and map headers to indicator keys
                const headerIndex = lines.findIndex(l => /^\s*Date\s*,/i.test(l));
                if (headerIndex === -1) {
                    throw new Error('CSV header not found');
                }
                const rawHeaders = parseCSVLine(lines[headerIndex]);
                const headers = rawHeaders.map(mapHeaderToKey);
                const data = [];
                
                for (let i = headerIndex + 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    if (values.length >= headers.length && values[0]) {
                        const row = {};
                        headers.forEach((header, index) => {
                            let value = values[index];
                            if (value && header !== 'Date') {
                                // Remove quotes and commas from numbers
                                value = value.replace(/[",]/g, '');
                                if (!isNaN(value) && value !== '') {
                                    value = parseFloat(value);
                                }
                            }
                            row[header] = value;
                        });
                        
                        // Parse date
                        if (row.Date) {
                            row.parsedDate = new Date(row.Date);
                        }
                        
                        data.push(row);
                    }
                }
                
                // Sort data by date (most recent first)
                marketData = data.sort((a, b) => {
                    const dateA = new Date(a.Date);
                    const dateB = new Date(b.Date);
                    return dateB - dateA; // Descending order (newest first)
                });
                
                const newHash = generateDataHash(marketData);
                lastCheckTime = new Date();
                if (lastDataHash && newHash !== lastDataHash) {
                    updateDataStatus('updated', 'New data available!');
                } else {
                    updateDataStatus('current', 'Data refreshed');
                }
                lastDataHash = newHash;
                const spinnerEl = document.getElementById('loading-spinner');
                if (spinnerEl) spinnerEl.style.display = 'none';
                // Save to cache for instant reloads
                try {
                    localStorage.setItem('marketDataCache', JSON.stringify({
                        data: marketData,
                        hash: lastDataHash,
                        lastUpdated: new Date().toISOString()
                    }));
                } catch (e) {
                    // Ignore storage errors (quota, private mode etc.)
                }
                updateDataInfo();
                createIndicatorCheckboxes();
                drawChart();
                updateCurrentReadings();
                
            } catch (error) {
                console.error('Error loading market data:', error);
                const spinner = document.getElementById('loading-spinner');
                if (spinner) spinner.style.display = 'none';
                updateDataStatus('error', 'Load failed');
            }
        }

        // Toggle auto-refresh functionality
        function toggleAutoRefresh() {
            const toggleButton = document.getElementById('auto-refresh-toggle');
            
            if (autoRefreshEnabled) {
                // Disable auto-refresh
                autoRefreshEnabled = false;
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
                toggleButton.textContent = 'Auto: OFF';
                toggleButton.className = 'px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700';
                localStorage.setItem('autoRefreshEnabled', 'false');
            } else {
                // Enable auto-refresh
                autoRefreshEnabled = true;
                toggleButton.textContent = 'Auto: ON';
                toggleButton.className = 'px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700';
                
                // Refresh every 2 minutes
                autoRefreshInterval = setInterval(async () => {
                    await loadMarketData({ quiet: true });
                }, 120000); // 2 minutes
                localStorage.setItem('autoRefreshEnabled', 'true');
                // Initial load
                loadMarketData({ quiet: true });
            }
        }

        // Create indicator selection checkboxes
        function createIndicatorCheckboxes() {
            const primaryContainer = document.getElementById('primary-indicators');
            const secondaryContainer = document.getElementById('secondary-indicators');
            const marketContainer = document.getElementById('market-indicators');
            
            // Clear existing checkboxes to prevent duplicates
            primaryContainer.innerHTML = '';
            secondaryContainer.innerHTML = '';
            marketContainer.innerHTML = '';
            
            Object.entries(indicatorConfig).forEach(([key, config]) => {
                const container = config.category === 'primary' ? primaryContainer :
                                config.category === 'secondary' ? secondaryContainer : marketContainer;
                
                const div = document.createElement('div');
                div.className = 'flex items-center space-x-2';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = key;
                checkbox.className = 'indicator-checkbox';
                checkbox.checked = selectedIndicators.has(key);
                
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        selectedIndicators.add(key);
                    } else {
                        selectedIndicators.delete(key);
                    }
                    localStorage.setItem('selectedIndicators', JSON.stringify(Array.from(selectedIndicators)));
                    drawChart();
                });
                
                const label = document.createElement('label');
                label.htmlFor = key;
                label.className = 'text-sm text-gray-700 cursor-pointer flex items-center';
                
                const colorBox = document.createElement('span');
                colorBox.className = 'w-3 h-3 rounded mr-2';
                colorBox.style.backgroundColor = config.color;
                
                label.appendChild(colorBox);
                label.appendChild(document.createTextNode(config.name));
                
                div.appendChild(checkbox);
                div.appendChild(label);
                container.appendChild(div);
            });
        }

        // Update data information display
        function updateDataInfo() {
            if (marketData.length > 0) {
                // Find the most recent valid date
                let latestDate = null;
                for (let i = 0; i < Math.min(marketData.length, 5); i++) {
                    if (marketData[i].Date) {
                        latestDate = marketData[i].Date;
                        break;
                    }
                }
                
                const oldestDate = marketData[marketData.length - 1].Date;
                
                document.getElementById('last-update').textContent = latestDate || 'Unknown';
                document.getElementById('total-records').textContent = marketData.length.toLocaleString();
                
                // Add date range info if we have multiple records
                if (marketData.length > 1) {
                    const rangeInfo = document.getElementById('date-range');
                    if (rangeInfo) {
                        rangeInfo.textContent = `${oldestDate} - ${latestDate}`;
                    }
                }
            }
        }

        // Update current readings
        function updateCurrentReadings() {
            if (marketData.length === 0) return;
            
            // Use the same data source as the chart: get unfiltered data in chronological order
            const chronologicalData = marketData.slice().reverse(); // Oldest to newest
            const latest = chronologicalData[chronologicalData.length - 1]; // Get the most recent
            
            if (!latest || !latest.Date) {
                return;
            }
            const container = document.getElementById('current-readings');
            
            const dataSource = latest;
            const readings = [
                { label: 'Stocks Up 4%+', value: dataSource['Number of stocks up 4% plus today'], format: 'number' },
                { label: 'Stocks Down 4%+', value: dataSource['Number of stocks down 4% plus today'], format: 'number' },
                { label: '5-Day Ratio', value: dataSource['5 day ratio'], format: 'decimal' },
                { label: 'T2108', value: dataSource['T2108'], format: 'percent' },
                { label: 'S&P 500', value: dataSource['S&P'], format: 'number' }
            ];
            
            container.innerHTML = readings.map(reading => {
                let displayValue = '--';
                if (reading.value !== undefined && reading.value !== null) {
                    if (reading.format === 'number') {
                        displayValue = reading.value.toLocaleString();
                    } else if (reading.format === 'decimal') {
                        displayValue = reading.value.toFixed(2);
                    } else if (reading.format === 'percent') {
                        displayValue = reading.value.toFixed(1) + '%';
                    }
                }
                
                return `
                    <div class="flex justify-between">
                        <span>${reading.label}:</span>
                        <span class="font-semibold">${displayValue}</span>
                    </div>
                `;
            }).join('');
            
            // Update market stats
            const statsContainer = document.getElementById('market-stats');
            const ratio5day = latest['5 day ratio'] || 0;
            const t2108 = latest['T2108'] || 0;
            const upStocks = latest['Number of stocks up 4% plus today'] || 0;
            const downStocks = latest['Number of stocks down 4% plus today'] || 0;
            
            statsContainer.innerHTML = `
                <div class="flex justify-between">
                    <span>Trend:</span>
                    <span class="${ratio5day > 1.5 ? 'text-green-600' : ratio5day < 0.8 ? 'text-red-600' : 'text-yellow-600'}">${ratio5day > 1.5 ? 'Bullish' : ratio5day < 0.8 ? 'Bearish' : 'Neutral'}</span>
                </div>
                <div class="flex justify-between">
                    <span>Breadth:</span>
                    <span class="${upStocks > downStocks ? 'text-green-600' : 'text-red-600'}">${upStocks > downStocks ? 'Positive' : 'Negative'}</span>
                </div>
                <div class="flex justify-between">
                    <span>T2108 Level:</span>
                    <span class="${t2108 > 60 ? 'text-green-600' : t2108 < 30 ? 'text-red-600' : 'text-yellow-600'}">${t2108 > 60 ? 'Strong' : t2108 < 30 ? 'Weak' : 'Neutral'}</span>
                </div>
            `;
            
            // Update sentiment
            updateSentiment(latest);
        }

        // Update selected indicators based on chart view
        function updateSelectedIndicatorsForView(view) {
            // Clear current selection
            selectedIndicators.clear();
            
            // Add indicators based on the selected view
            switch (view) {
                case 'overview':
                    selectedIndicators.add('Number of stocks up 4% plus today');
                    selectedIndicators.add('Number of stocks down 4% plus today');
                    selectedIndicators.add('T2108');
                    break;
                case 'breadth':
                    selectedIndicators.add('Number of stocks up 4% plus today');
                    selectedIndicators.add('Number of stocks down 4% plus today');
                    selectedIndicators.add('Number of stocks up 25% plus in a quarter');
                    selectedIndicators.add('Number of stocks down 25% + in a quarter');
                    break;
                case 'ratios':
                    selectedIndicators.add('5 day ratio');
                    selectedIndicators.add('10 day  ratio ');
                    selectedIndicators.add('T2108');
                    break;
                case 'momentum':
                    selectedIndicators.add('Number of stocks up 25% + in a month');
                    selectedIndicators.add('Number of stocks down 25% + in a month');
                    selectedIndicators.add('Number of stocks up 50% + in a month');
                    selectedIndicators.add('Number of stocks down 50% + in a month');
                    break;
                case 'analysis':
                    // For analysis view, keep current selection or use default
                    selectedIndicators.add('Number of stocks up 4% plus today');
                    selectedIndicators.add('Number of stocks down 4% plus today');
                    break;
                default:
                    selectedIndicators.add('Number of stocks up 4% plus today');
                    selectedIndicators.add('Number of stocks down 4% plus today');
                    selectedIndicators.add('T2108');
            }
            
            // Update checkbox states
            createIndicatorCheckboxes();
        }

        // Update market sentiment
        function updateSentiment(latest) {
            const sentimentText = document.getElementById('sentiment-text');
            const sentimentDesc = document.getElementById('sentiment-desc');
            
            const upStocks = latest['Number of stocks up 4% plus today'] || 0;
            const downStocks = latest['Number of stocks down 4% plus today'] || 0;
            const ratio5day = latest['5 day ratio'] || 0;
            const t2108 = latest['T2108'] || 0;
            
            let sentiment = 'Neutral';
            let color = '#f59e0b';
            let description = 'Mixed breadth signals';
            
            if (upStocks > 1000 && ratio5day > 2.0) {
                sentiment = 'Extremely Bullish';
                color = '#00C851';
                description = 'Massive breadth thrust in progress';
            } else if (downStocks > 500 && t2108 < 20) {
                sentiment = 'Extremely Bearish';
                color = '#ff4444';
                description = 'Severe selling with oversold conditions';
            } else if (upStocks > 400 && ratio5day > 1.8) {
                sentiment = 'Very Bullish';
                color = '#10b981';
                description = 'Strong positive breadth momentum';
            } else if (downStocks > 300 && ratio5day < 0.7) {
                sentiment = 'Very Bearish';
                color = '#ef4444';
                description = 'Significant selling pressure';
            } else if (ratio5day > 1.3) {
                sentiment = 'Bullish';
                color = '#22c55e';
                description = 'Positive breadth momentum';
            } else if (ratio5day < 0.8) {
                sentiment = 'Bearish';
                color = '#f87171';
                description = 'Negative breadth momentum';
            }
            
            sentimentText.textContent = sentiment;
            sentimentText.style.color = color;
            sentimentDesc.textContent = description;
        }

        // Chart rendering with Chart.js - Fully responsive
        let chartInstance = null;
        let resizeTimeout = null;
        let isDarkTheme = false;
        let currentChartView = 'overview';
        
        // Theme management
        function toggleTheme() {
            isDarkTheme = !isDarkTheme;
            const body = document.body;
            const tooltipEl = document.getElementById('custom-tooltip');
            const themeButton = document.getElementById('theme-toggle');
            
            if (isDarkTheme) {
                body.classList.add('dark');
                tooltipEl.classList.remove('light');
                tooltipEl.classList.add('dark');
                themeButton.textContent = '☀️';
                themeButton.title = 'Switch to Light Theme';
                localStorage.setItem('isDarkTheme', 'true');
            } else {
                body.classList.remove('dark');
                tooltipEl.classList.remove('dark');
                tooltipEl.classList.add('light');
                themeButton.textContent = '🌙';
                themeButton.title = 'Switch to Dark Theme';
                localStorage.setItem('isDarkTheme', 'false');
            }
        }
        
        // Format numeric values for tooltip display
        function formatTooltipValue(value, key) {
            if (value === null || value === undefined) return '--';
            
            // Different formatting for different types of values
            if (key === 'T2108') {
                return value.toFixed(1) + '%';
            } else if (key.includes('ratio')) {
                return value.toFixed(2);
            } else if (key.includes('S&P')) {
                return value.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
            } else if (typeof value === 'number' && value > 1000) {
                return value.toLocaleString('en-US');
            } else if (typeof value === 'number') {
                return value.toFixed(0);
            }
            
            return value.toString();
        }
        
        // Update tooltip content with series swatches and formatted values
        function updateTooltipContent(chart, tooltip, dataPoint, dataIndex) {
            const dateEl = document.getElementById('tooltip-date');
            const seriesEl = document.getElementById('tooltip-series');
            const summaryEl = document.getElementById('tooltip-summary');
            
            // Update date
            dateEl.innerHTML = `📅 ${dataPoint.Date}`;
            
            // Clear previous content
            seriesEl.innerHTML = '';
            
            // Add series items with color swatches
            tooltip.dataPoints.forEach((tp, index) => {
                const datasetIndex = tp.datasetIndex;
                const dataset = chart.data.datasets[datasetIndex];
                // Find the config by matching dataset label with indicator name
                const configKey = Object.keys(indicatorConfig).find(key => 
                    indicatorConfig[key].name === dataset.label
                );
                const config = configKey ? indicatorConfig[configKey] : null;
                
                if (config) {
                    const seriesItem = document.createElement('div');
                    seriesItem.className = 'tooltip-series-item';
                    
                    // Compute deltas vs previous data point
                    const prevPoint = chart.filteredData[dataIndex + 1];
                    const currVal = typeof tp.parsed?.y === 'number' ? tp.parsed.y : null;
                    const prevVal = prevPoint && typeof prevPoint[configKey] === 'number' ? prevPoint[configKey] : null;
                    let delta = null;
                    let pct = null;
                    if (currVal !== null && prevVal !== null && prevVal !== 0) {
                        delta = currVal - prevVal;
                        pct = (delta / prevVal) * 100;
                    }
                    
                    seriesItem.innerHTML = `
                        <div class="series-info">
                            <div class="series-swatch" style="background-color: ${config.color}"></div>
                            <span class="series-name">${config.name}</span>
                        </div>
                        <span class="series-value">${formatTooltipValue(currVal, config.name)}${delta !== null ? ` <span style="color:${delta>=0 ? '#16a34a' : '#dc2626'}; font-weight:600">(${delta>=0?'+':''}${formatTooltipValue(Math.abs(delta), config.name)}${pct!==null?` / ${pct>=0?'+':''}${pct.toFixed(1)}%`:''})</span>` : ''}</span>
                    `;
                    
                    seriesEl.appendChild(seriesItem);
                }
            });
            
            // Add market summary - get values from the actual data point
            let summaryHtml = '<div style="font-weight: 600; margin-bottom: 4px;">📊 Market Summary</div>';
            
            // Try to find common indicators in the data point
            const upStocks = dataPoint['Number of stocks up 4% plus today'];
            const downStocks = dataPoint['Number of stocks down 4% plus today'];
            const ratio5day = dataPoint['5 day ratio'];
            const t2108 = dataPoint['T2108'];
            
            if (upStocks !== undefined && downStocks !== undefined) {
                const netBreadth = upStocks - downStocks;
                const netColor = netBreadth > 0 ? '#10b981' : netBreadth < 0 ? '#f43f5e' : '#6b7280';
                summaryHtml += `<div>Net Breadth: <span style="color: ${netColor}; font-weight: 600;">${netBreadth > 0 ? '+' : ''}${netBreadth.toLocaleString()}</span></div>`;
            }
            if (ratio5day !== undefined && ratio5day !== null) {
                const ratioColor = ratio5day > 1.5 ? '#10b981' : ratio5day < 0.8 ? '#f43f5e' : '#f59e0b';
                summaryHtml += `<div>5D Ratio: <span style="color: ${ratioColor}; font-weight: 600;">${ratio5day.toFixed(2)}</span></div>`;
            }
            if (t2108 !== undefined && t2108 !== null) {
                const t2108Color = t2108 > 70 ? '#10b981' : t2108 < 30 ? '#f43f5e' : '#f59e0b';
                summaryHtml += `<div>T2108: <span style="color: ${t2108Color}; font-weight: 600;">${t2108.toFixed(1)}%</span></div>`;
            }
            
            summaryEl.innerHTML = summaryHtml;
        }
        
        // Enhanced chart interactivity management
        let hoveredSeriesIndex = null;
        let crosshairVisible = false;
        
        // Update crosshair region
        function updateCrosshairRegion(chart, tooltip, show = true) {
            const crosshairEl = document.getElementById('crosshair-region');
            const canvas = chart.canvas;
            const canvasRect = canvas.getBoundingClientRect();
            
            if (!show || tooltip.opacity === 0) {
                crosshairEl.classList.remove('show');
                crosshairVisible = false;
                return;
            }
            
            const chartArea = chart.chartArea;
            const x = tooltip.caretX;
            const regionWidth = containerWidth < 640 ? 20 : 30; // Responsive width
            
            // Position the vertical region
            crosshairEl.style.left = (x - regionWidth / 2) + 'px';
            crosshairEl.style.top = chartArea.top + 'px';
            crosshairEl.style.width = regionWidth + 'px';
            crosshairEl.style.height = (chartArea.bottom - chartArea.top) + 'px';
            
            crosshairEl.classList.add('show');
            crosshairVisible = true;
        }
        
        // Animate hover points with scale and pulse effects
        function animateHoverPoints(chart, tooltip, activeElements) {
            // Reset all point animations
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                if (dataset._meta && dataset._meta[chart.id]) {
                    dataset._meta[chart.id].data.forEach((point, pointIndex) => {
                        if (point && point.options) {
                            point.options.radius = point.options.baseRadius || (containerWidth < 640 ? 3 : 4);
                            point.options.hoverRadius = point.options.baseHoverRadius || (containerWidth < 640 ? 6 : 8);
                        }
                    });
                }
            });
            
            // Animate hovered points
            if (activeElements && activeElements.length > 0) {
                activeElements.forEach(element => {
                    const point = element.element;
                    if (point && point.options) {
                        // Store base values if not already stored
                        if (!point.options.baseRadius) {
                            point.options.baseRadius = point.options.radius;
                            point.options.baseHoverRadius = point.options.hoverRadius;
                        }
                        
                        // Animated scaling
                        point.options.radius = (point.options.baseRadius * 1.5);
                        point.options.hoverRadius = (point.options.baseHoverRadius * 1.3);
                        point.options.borderWidth = 3;
                        point.options.hoverBorderWidth = 4;
                    }
                });
            }
        }
        
        // Manage series emphasis and dimming
        function updateSeriesEmphasis(chart, activeElements) {
            if (!activeElements || activeElements.length === 0) {
                // No active elements - reset all series
                chart.data.datasets.forEach((dataset, index) => {
                    const meta = chart.getDatasetMeta(index);
                    if (meta && meta.$context && meta.$context.element) {
                        meta.$context.element.options.borderWidth = dataset.borderWidth || 2;
                        meta.$context.element.options.borderColor = dataset.borderColor;
                        meta.$context.element.options.backgroundColor = dataset.backgroundColor;
                    }
                });
                hoveredSeriesIndex = null;
                return;
            }
            
            const activeDatasetIndex = activeElements[0].datasetIndex;
            
            // Only update if hovering a different series
            if (hoveredSeriesIndex === activeDatasetIndex) return;
            hoveredSeriesIndex = activeDatasetIndex;
            
            chart.data.datasets.forEach((dataset, index) => {
                const meta = chart.getDatasetMeta(index);
                if (meta && meta.$context) {
                    if (index === activeDatasetIndex) {
                        // Emphasize active series
                        dataset._originalBorderWidth = dataset._originalBorderWidth || dataset.borderWidth;
                        dataset.borderWidth = (dataset._originalBorderWidth * 1.5);
                        
                        // Add glow effect by manipulating colors
                        if (dataset.borderColor && typeof dataset.borderColor === 'string') {
                            dataset._glowColor = dataset.borderColor;
                        }
                    } else {
                        // Dim non-active series
                        dataset.borderWidth = (dataset._originalBorderWidth || dataset.borderWidth) * 0.7;
                        
                        // Reduce opacity for non-hovered series
                        if (dataset.borderColor && typeof dataset.borderColor === 'string') {
                            dataset.borderColor = dataset.borderColor + '60'; // Add transparency
                        }
                        if (dataset.backgroundColor && typeof dataset.backgroundColor === 'string') {
                            dataset.backgroundColor = dataset.backgroundColor + '40'; // More transparent
                        }
                    }
                }
            });
            
            // Trigger chart update
            chart.update('none'); // Update without animation for smooth interaction
        }
        
        // Reset series emphasis when leaving chart
        function resetSeriesEmphasis(chart) {
            chart.data.datasets.forEach((dataset, index) => {
                if (dataset._originalBorderWidth) {
                    dataset.borderWidth = dataset._originalBorderWidth;
                }
                
                // Restore original colors
                Object.entries(indicatorConfig).forEach(([key, config]) => {
                    if (config.name === dataset.label) {
                        dataset.borderColor = dataset._originalBorderGradient || config.color;
                        dataset.backgroundColor = dataset._originalBackgroundGradient || (config.color + '20');
                    }
                });
            });
            
            hoveredSeriesIndex = null;
            chart.update('none');
        }
        
        // Intelligent tooltip positioning to avoid clipping
        function positionTooltip(tooltipEl, chart, tooltip) {
            const canvas = chart.canvas;
            const canvasRect = canvas.getBoundingClientRect();
            const tooltipRect = tooltipEl.getBoundingClientRect();
            const arrow = tooltipEl.querySelector('.tooltip-arrow');
            
            let left = canvasRect.left + tooltip.caretX;
            let top = canvasRect.top + tooltip.caretY;
            
            // Check for right edge clipping
            if (left + tooltipRect.width > window.innerWidth - 20) {
                left = canvasRect.left + tooltip.caretX - tooltipRect.width;
            }
            
            // Check for left edge clipping
            if (left < 20) {
                left = 20;
            }
            
            // Check for top edge clipping
            if (top - tooltipRect.height < 20) {
                // Position below the point
                top = canvasRect.top + tooltip.caretY + 20;
                arrow.className = 'tooltip-arrow top';
            } else {
                // Position above the point (default)
                top = canvasRect.top + tooltip.caretY - tooltipRect.height - 10;
                arrow.className = 'tooltip-arrow bottom';
            }
            
            // Check for bottom edge clipping
            if (top + tooltipRect.height > window.innerHeight - 20) {
                top = window.innerHeight - tooltipRect.height - 20;
            }
            
            // Apply positioning
            tooltipEl.style.left = left + 'px';
            tooltipEl.style.top = top + 'px';
            
            // Center arrow horizontally relative to the caret
            const arrowLeft = Math.max(16, Math.min(tooltipRect.width - 16, 
                (canvasRect.left + tooltip.caretX) - left
            ));
            arrow.style.left = arrowLeft + 'px';
            arrow.style.transform = 'translateX(-50%)';
        }
        
        function getResponsiveChartOptions(timeRange, rangeText, containerWidth, visiblePoints) {
            // Determine legend position based on container width
            const legendPosition = containerWidth < 640 ? 'bottom' : 'top';
            const legendAlign = containerWidth < 640 ? 'center' : 'start';
            
            // Adjust font sizes based on screen size
            const titleFontSize = containerWidth < 640 ? 12 : 14;
            const legendFontSize = containerWidth < 640 ? 10 : 12;
            const axisFontSize = containerWidth < 640 ? 9 : 11;
            const isDense = (visiblePoints || 0) > 600;
            
            return {
                responsive: true,
                maintainAspectRatio: false,
                devicePixelRatio: isDense ? Math.min(1.5, window.devicePixelRatio || 1) : (window.devicePixelRatio || 1),
                interaction: { 
                    mode: "index", 
                    intersect: false,
                    axis: 'x'
                },
                animation: {
                    duration: isDense ? 120 : (containerWidth < 640 ? 200 : 300) // Faster or minimal animations on dense data
                },
                plugins: {
                    decimation: {
                        enabled: true,
                        algorithm: 'lttb',
                        samples: isDense ? 200 : (containerWidth < 640 ? 50 : 100),
                        threshold: 1000
                    },
                    legend: { 
                        display: true,
                        position: legendPosition,
                        align: legendAlign,
                        labels: {
                            font: { size: legendFontSize },
                            usePointStyle: true,
                            boxWidth: containerWidth < 640 ? 8 : 12,
                            padding: containerWidth < 640 ? 10 : 15
                        }
                    },
                    title: { 
                        display: true, 
                        text: `📅 ${rangeText}`,
                        font: { 
                            size: titleFontSize,
                            weight: 'bold'
                        },
                        padding: containerWidth < 640 ? 10 : 15
                    },
                    tooltip: {
                        enabled: false, // Disable default tooltip
                        external: function(context) {
                            // Enhanced custom tooltip with animations and interactivity
                            const tooltipEl = document.getElementById('custom-tooltip');
                            const chart = context.chart;
                            const tooltip = context.tooltip;
                            const activeElements = chart.getActiveElements();
                            
                            // Hide tooltip and reset interactions when no data
                            if (tooltip.opacity === 0) {
                                tooltipEl.classList.remove('show');
                                tooltipEl.classList.add('fade-out');
                                updateCrosshairRegion(chart, tooltip, false);
                                resetSeriesEmphasis(chart);
                                setTimeout(() => {
                                    tooltipEl.style.opacity = '0';
                                    tooltipEl.style.pointerEvents = 'none';
                                }, 200);
                                return;
                            }
                            
                            // Show tooltip with animation
                            tooltipEl.style.opacity = '1';
                            tooltipEl.style.pointerEvents = 'none';
                            tooltipEl.classList.remove('fade-out');
                            tooltipEl.classList.add('slide-in', 'show');
                            
                            // Update crosshair region
                            updateCrosshairRegion(chart, tooltip, true);
                            
                            // Animate hover points
                            animateHoverPoints(chart, tooltip, activeElements);
                            
                            // Update series emphasis
                            updateSeriesEmphasis(chart, activeElements);
                            
                            // Get data point
                            const dataIndex = tooltip.dataPoints[0].dataIndex;
                            const dataPoint = chart.filteredData[dataIndex];
                            
                            if (dataPoint) {
                            // Update tooltip content
                            updateTooltipContent(chart, tooltip, dataPoint, dataIndex);
                                
                                // Intelligent positioning
                                positionTooltip(tooltipEl, chart, tooltip);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: containerWidth >= 640, // Hide grid on mobile for cleaner look
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            font: { size: axisFontSize },
                            autoSkip: true,
                            maxTicksLimit: isDense ? (containerWidth < 640 ? 3 : 6) : (containerWidth < 640 ? 4 : containerWidth < 1024 ? 6 : 8),
                            callback: function(value, index, values) {
                                // Format dates based on screen size
                                const date = new Date(this.getLabelForValue(value));
                                if (containerWidth < 640) {
                                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                }
                                return this.getLabelForValue(value);
                            }
                        }
                    },
                    y: { 
                        type: "linear", 
                        position: "left",
                        display: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            font: { size: axisFontSize },
                            callback: function(value) {
                                // Format large numbers
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K';
                                }
                                return value.toLocaleString();
                            }
                        }
                    },
                    y1: { 
                        type: "linear", 
                        position: "right",
                        display: containerWidth >= 768, // Hide right axis on small screens
                        grid: { 
                            drawOnChartArea: false,
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            font: { size: axisFontSize },
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        radius: isDense ? 0 : (containerWidth < 640 ? 2 : 3),
                        hoverRadius: isDense ? 0 : (containerWidth < 640 ? 6 : 8),
                        hitRadius: isDense ? 4 : (containerWidth < 640 ? 10 : 14),
                        borderWidth: containerWidth < 640 ? 2 : 3,
                        hoverBorderWidth: containerWidth < 640 ? 3 : 4,
                        pointStyle: 'circle',
                        // Enhanced hover animation properties
                        hoverBackgroundColor: function(context) {
                            return context.element.options.backgroundColor;
                        },
                        hoverBorderColor: '#ffffff'
                    },
                    line: {
                        borderWidth: containerWidth < 640 ? 2 : 3,
                        tension: 0.4, // Smooth curves
                        borderJoinStyle: 'round',
                        borderCapStyle: 'round',
                        // Enhanced hover effects
                        hoverBorderWidth: function(context) {
                            return (context.dataset.borderWidth || 3) * 1.3;
                        }
                    }
                },
                // Enhanced animations for smoother interactions
                animation: {
                    duration: 300,
                    easing: 'easeOutQuart',
                    onComplete: function() {
                        // Ensure crosshair is properly positioned after animation
                        if (crosshairVisible && this.tooltip && this.tooltip.opacity > 0) {
                            updateCrosshairRegion(this, this.tooltip, true);
                        }
                    }
                },
                animations: {
                    // Smooth property animations
                    radius: {
                        duration: 200,
                        easing: 'easeOutBack'
                    },
                    borderWidth: {
                        duration: 150,
                        easing: 'easeOutQuad'
                    }
                },
                // Enhanced hover interactions
                interaction: {
                    mode: 'index',
                    intersect: false,
                    axis: 'x',
                    includeInvisible: false
                },
                // Enhanced chart area styling
                layout: {
                    padding: {
                        left: containerWidth < 640 ? 10 : 20,
                        right: containerWidth < 640 ? 10 : 20,
                        top: containerWidth < 640 ? 10 : 20,
                        bottom: containerWidth < 640 ? 10 : 20
                    }
                }
            };
        }
        
        // Get chart configuration based on current view
        function getChartConfigForView(view, filteredData, containerWidth) {
            const orderedData = filteredData.slice(); // Keep newest-first order
            const labels = orderedData.map(d => {
                if (containerWidth < 640) {
                    return new Date(d.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
                return d.Date;
            });

            switch (view) {
                case 'overview':
                    return {
                        type: 'line',
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: 'Stocks Up 4%+',
                                    data: orderedData.map(d => d['Number of stocks up 4% plus today']),
                                    borderColor: '#10b981',
                                    backgroundColor: '#10b98120',
                                    borderWidth: 3,
                                    fill: false,
                                    yAxisID: 'y'
                                },
                                {
                                    label: 'Stocks Down 4%+',
                                    data: orderedData.map(d => d['Number of stocks down 4% plus today']),
                                    borderColor: '#f43f5e',
                                    backgroundColor: '#f43f5e20',
                                    borderWidth: 3,
                                    fill: false,
                                    yAxisID: 'y'
                                },
                                {
                                    label: 'T2108 (%)',
                                    data: orderedData.map(d => d['T2108']),
                                    borderColor: '#ea580c',
                                    backgroundColor: '#ea580c20',
                                    borderWidth: 2,
                                    borderDash: [8, 4],
                                    fill: false,
                                    yAxisID: 'y1'
                                }
                            ]
                        }
                    };

                case 'breadth':
                    return {
                        type: 'line',
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: 'Stocks Up 4%+ Daily',
                                    data: orderedData.map(d => d['Number of stocks up 4% plus today']),
                                    borderColor: '#10b981',
                                    backgroundColor: '#10b98120',
                                    borderWidth: 3,
                                    fill: false
                                },
                                {
                                    label: 'Stocks Down 4%+ Daily',
                                    data: orderedData.map(d => d['Number of stocks down 4% plus today']),
                                    borderColor: '#f43f5e',
                                    backgroundColor: '#f43f5e20',
                                    borderWidth: 3,
                                    fill: false
                                },
                                {
                                    label: 'Stocks Up 25%+ Quarter',
                                    data: orderedData.map(d => d['Number of stocks up 25% plus in a quarter']),
                                    borderColor: '#34d399',
                                    backgroundColor: '#34d39920',
                                    borderWidth: 2,
                                    fill: false
                                },
                                {
                                    label: 'Stocks Down 25%+ Quarter',
                                    data: orderedData.map(d => d['Number of stocks down 25% + in a quarter']),
                                    borderColor: '#fb7185',
                                    backgroundColor: '#fb718520',
                                    borderWidth: 2,
                                    fill: false
                                }
                            ]
                        }
                    };

                case 'ratios':
                    return {
                        type: 'bar',
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: '5-Day Ratio',
                                    data: orderedData.map(d => d['5 day ratio']),
                                    backgroundColor: '#8b5cf6',
                                    borderColor: '#7c3aed',
                                    borderWidth: 1,
                                    yAxisID: 'y',
                                    type: 'bar'
                                },
                                {
                                    label: '10-Day Ratio',
                                    data: orderedData.map(d => d['10 day  ratio ']),
                                    backgroundColor: '#06b6d4',
                                    borderColor: '#0891b2',
                                    borderWidth: 1,
                                    yAxisID: 'y',
                                    type: 'bar'
                                },
                                {
                                    label: 'T2108 (%)',
                                    data: orderedData.map(d => d['T2108']),
                                    borderColor: '#ea580c',
                                    backgroundColor: '#ea580c00',
                                    borderWidth: 4,
                                    fill: false,
                                    yAxisID: 'y1',
                                    type: 'line'
                                }
                            ]
                        }
                    };

                case 'momentum':
                    return {
                        type: 'line',
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: 'Stocks Up 50%+ Month',
                                    data: orderedData.map(d => d['Number of stocks up 50% + in a month']),
                                    borderColor: '#10b981',
                                    backgroundColor: '#10b981',
                                    borderWidth: 0,
                                    fill: 'origin'
                                },
                                {
                                    label: 'Stocks Up 25%+ Month',
                                    data: orderedData.map(d => d['Number of stocks up 25% + in a month']),
                                    borderColor: '#34d399',
                                    backgroundColor: '#34d399',
                                    borderWidth: 0,
                                    fill: 'origin'
                                },
                                {
                                    label: 'Stocks Down 25%+ Month',
                                    data: orderedData.map(d => d['Number of stocks down 25% + in a month']),
                                    borderColor: '#f87171',
                                    backgroundColor: '#f87171',
                                    borderWidth: 0,
                                    fill: 'origin'
                                },
                                {
                                    label: 'Stocks Down 50%+ Month',
                                    data: orderedData.map(d => d['Number of stocks down 50% + in a month']),
                                    borderColor: '#ef4444',
                                    backgroundColor: '#ef4444',
                                    borderWidth: 0,
                                    fill: 'origin'
                                }
                            ]
                        }
                    };

                case 'analysis':
                    return {
                        type: 'scatter',
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: 'Breadth Scatter',
                                    data: orderedData.map(d => ({
                                        x: d['Number of stocks up 4% plus today'] || 0,
                                        y: d['Number of stocks down 4% plus today'] || 0
                                    })),
                                    backgroundColor: '#8b5cf6',
                                    borderColor: '#7c3aed',
                                    borderWidth: 2,
                                    pointRadius: 6,
                                    pointHoverRadius: 8
                                }
                            ]
                        }
                    };

                default:
                    return getChartConfigForView('overview', filteredData, containerWidth);
            }
        }

        function drawChart() {
            if (marketData.length === 0) return;

            const canvas = document.getElementById('stockChart');
            const ctx = canvas.getContext('2d');
            const container = canvas.parentElement;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // Set canvas size to match container
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            
            const timeRange = parseInt(document.getElementById('time-range').value);
            currentChartView = document.getElementById('chart-view').value;

            let filteredData = marketData;
            if (timeRange > 0) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - timeRange);
                filteredData = marketData.filter(d => {
                    if (!d.Date) return false;
                    return new Date(d.Date) >= cutoffDate;
                });
            }
            if (filteredData.length === 0) return;

            // Debug: Check data ordering
            
            // Keep newest-first order so latest date appears on the right
            const orderedData = filteredData.slice(); // No reverse - keep as newest first
            
            
            const labels = orderedData.map(d => {
                // Format labels based on container width
                if (containerWidth < 640) {
                    return new Date(d.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
                return d.Date;
            });

            const activeIndicators = Array.from(selectedIndicators).filter(key =>
                orderedData.some(d => d[key] !== undefined && d[key] !== null)
            );
            if (activeIndicators.length === 0) return;

            // Create datasets with SVG-inspired gradients
            const datasets = activeIndicators.map((key, index) => {
                const config = indicatorConfig[key];
                
                // Create Canvas gradients based on SVG gradient definitions
                let backgroundGradient = null;
                let borderGradient = null;
                
                if (config.gradientColors && config.gradientId) {
                    // Create smooth monotone background gradient (subtle fill)
                    backgroundGradient = ctx.createLinearGradient(0, 0, 0, containerHeight);
                    backgroundGradient.addColorStop(0, config.gradientColors[0] + '60'); // 38% opacity at top
                    backgroundGradient.addColorStop(0.7, config.gradientColors[1] + '30'); // 19% opacity 
                    backgroundGradient.addColorStop(1, config.gradientColors[1] + '10'); // 6% opacity at bottom
                    
                    // Create horizontal gradient for border (matching SVG gradients)
                    borderGradient = ctx.createLinearGradient(0, 0, containerWidth, 0);
                    borderGradient.addColorStop(0, config.gradientColors[0]); // Light color at left
                    borderGradient.addColorStop(0.3, config.color); // Main color
                    borderGradient.addColorStop(0.7, config.color); // Main color
                    borderGradient.addColorStop(1, config.gradientColors[1]); // Dark color at right
                }
                
                return {
                    label: config.name,
                    data: orderedData.map(d => d[key] !== undefined && d[key] !== null ? d[key] : null),
                    borderColor: borderGradient || config.color,
                    backgroundColor: backgroundGradient || (config.color + '20'),
                    borderDash: config.dashArray || undefined,
                    yAxisID: containerWidth >= 768 && config.yAxis === 'right' ? 'y1' : 'y',
                    
                    // Enhanced smoothing and styling
                    tension: 0.4, // Increased for smoother curves (monotone-like effect)
                    cubicInterpolationMode: 'monotone', // Smooth monotone interpolation
                    spanGaps: true,
                    fill: backgroundGradient ? 'origin' : false, // Enable subtle gradient fill
                    
                    // Modern point styling
                    pointBackgroundColor: config.color,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: containerWidth < 640 ? 2 : 3,
                    pointRadius: containerWidth < 640 ? 3 : 4,
                    pointHoverRadius: containerWidth < 640 ? 5 : 7,
                    pointHoverBorderWidth: 3,
                    
                    // Enhanced line styling
                    borderWidth: containerWidth < 640 ? 2 : 3,
                    borderJoinStyle: 'round', // Rounded line joins
                    borderCapStyle: 'round'  // Rounded line caps
                };
            });

            // Destroy existing chart
            if (chartInstance) {
                chartInstance.destroy();
            }

            const newest = filteredData[0]?.Date;
            const oldest = filteredData[filteredData.length - 1]?.Date;
            const rangeText = timeRange > 0 && newest && oldest
                ? `${oldest} to ${newest}`
                : "All Historical Data";

            // Create new chart with responsive options using the datasets from selected indicators
            chartInstance = new Chart(ctx, {
                type: 'line', // Use line chart for custom indicator selection
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: getResponsiveChartOptions(timeRange, rangeText, containerWidth, labels.length)
            });
            
            // Store filtered data on chart instance for tooltip access
            chartInstance.filteredData = filteredData;
            
            // Add enhanced mouse interaction event listeners
            canvas.addEventListener('mouseleave', function() {
                // Clean up interactions when mouse leaves chart
                const crosshairEl = document.getElementById('crosshair-region');
                crosshairEl.classList.remove('show');
                crosshairVisible = false;
                resetSeriesEmphasis(chartInstance);
            });
            
            canvas.addEventListener('mouseenter', function() {
                // Prepare for interactions when mouse enters chart
                canvas.style.cursor = 'crosshair';
            });
        }
        
        // Optimized resize handler
        function handleResize() {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            
            resizeTimeout = setTimeout(() => {
                if (chartInstance) {
                    // Force redraw with new responsive settings
                    drawChart();
                }
            }, 250); // Debounce resize events
        }

        // Event listeners
        document.getElementById('chart-view').addEventListener('change', function() {
            const view = this.value;
            // Update selected indicators based on view
            updateSelectedIndicatorsForView(view);
            drawChart();
        });
        document.getElementById('time-range').addEventListener('change', drawChart);
        document.getElementById('refresh-data').addEventListener('click', () => loadMarketData({ quiet: false }));
        document.getElementById('auto-refresh-toggle').addEventListener('click', toggleAutoRefresh);
        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            // Restore theme
            const savedTheme = localStorage.getItem('isDarkTheme');
            if (savedTheme === 'true') {
                // toggleTheme flips the flag, so set to opposite first
                isDarkTheme = false;
                toggleTheme();
            }
            // Restore auto-refresh UI state
            if (autoRefreshEnabled) {
                const toggleButton = document.getElementById('auto-refresh-toggle');
                toggleButton.textContent = 'Auto: ON';
                toggleButton.className = 'px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700';
                autoRefreshInterval = setInterval(async () => {
                    await loadMarketData({ quiet: true });
                }, 120000);
            }
            const hadCache = restoreFromCache();
            loadMarketData({ quiet: hadCache });
        });
        
        // Responsive resize handling
        window.addEventListener('resize', handleResize);
        
        // Handle orientation change on mobile devices
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 100); // Small delay to account for orientation change
        });
