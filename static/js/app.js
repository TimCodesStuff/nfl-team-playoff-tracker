document.addEventListener('DOMContentLoaded', async function() {
    try {
        await trackPageView();
        await fetchProbabilities();
    } catch (error) {
        console.error('Error during initialization:', error);
    }

    const toggleButton = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');

    toggleButton.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
    });
});

function fetchProbabilities() {
    console.log('Fetching probabilities...');
    return fetch('/api/probabilities')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);
            if (!data || !data.probabilities) {
                throw new Error('Invalid data format received');
            }
            createCharts(data.probabilities);
            updateLastUpdated(data.last_updated);
            return data; // Return data for promise chaining
        })
        .catch(error => {
            console.error('Error fetching probabilities:', error);
            // Display error message to user
            const chartContainer = document.getElementById('chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="error-message">
                        Error loading probability data. Please try refreshing the page.
                        <br>
                        Error details: ${error.message}
                    </div>
                `;
            }
            throw error; // Re-throw to maintain promise rejection
        });
}

function updateLastUpdated(timestamp) {
    const lastUpdatedElement = document.getElementById('last-updated');
    const date = new Date(timestamp);
    const options = { 
        weekday: 'short', month: 'short', day: 'numeric', 
        hour: 'numeric', minute: 'numeric', hour12: true, timeZoneName: 'short' 
    };
    lastUpdatedElement.textContent = `Last updated: ${date.toLocaleString(undefined, options)}`;
}

function toggleTeamData(team) {
    const charts = Object.values(Chart.instances);  // Get all active chart instances

    charts.forEach(chart => {
        const datasetIndex = chart.data.datasets.findIndex(dataset => dataset.label === team);
        if (datasetIndex !== -1) {
            const meta = chart.getDatasetMeta(datasetIndex);
            meta.hidden = !meta.hidden;  // Toggle visibility
            chart.update();  // Update the chart with new visibility
        }
    });
}

function createGlobalLegend(data) {
    const legendContainer = document.getElementById('global-legend');
    legendContainer.innerHTML = ''; // Clear previous content

    const nfcTeams = {
        'NFC East': ['Cowboys', 'Giants', 'Eagles', 'Commanders'],
        'NFC North': ['Bears', 'Lions', 'Packers', 'Vikings'],
        'NFC South': ['Falcons', 'Panthers', 'Saints', 'Buccaneers'],
        'NFC West': ['Cardinals', 'Forty-Niners', 'Seahawks', 'Rams']
    };

    const afcTeams = {
        'AFC East': ['Bills', 'Dolphins', 'Patriots', 'Jets'],
        'AFC North': ['Ravens', 'Bengals', 'Browns', 'Steelers'],
        'AFC South': ['Texans', 'Colts', 'Jaguars', 'Titans'],
        'AFC West': ['Broncos', 'Chiefs', 'Raiders', 'Chargers']
    };

    // Create sections for NFC and AFC
    createTeamSection('NFC', nfcTeams, data, legendContainer);
    createTeamSection('AFC', afcTeams, data, legendContainer);
}

function createTeamSection(conference, teamGroups, data, container) {
    const section = document.createElement('div');
    section.className = `legend-section ${conference.toLowerCase()}`;

    const header = document.createElement('h3');
    header.textContent = `${conference} Teams`;
    section.appendChild(header);

    // Select/Deselect All buttons container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';

    // Select All button
    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = `Select All`;
    selectAllBtn.className = 'select-all-btn';
    selectAllBtn.addEventListener('click', () => toggleAllTeams(Object.values(teamGroups).flat(), true));

    // Deselect All button
    const deselectAllBtn = document.createElement('button');
    deselectAllBtn.textContent = `Deselect All`;
    deselectAllBtn.className = 'deselect-all-btn';
    deselectAllBtn.addEventListener('click', () => toggleAllTeams(Object.values(teamGroups).flat(), false));

    buttonContainer.appendChild(selectAllBtn);
    buttonContainer.appendChild(deselectAllBtn);
    section.appendChild(buttonContainer);

    // Create divisions and individual team buttons
    Object.keys(teamGroups).forEach(division => {
        const divisionHeader = document.createElement('h4');
        divisionHeader.textContent = division;
        section.appendChild(divisionHeader);

        const teamButtonsGrid = document.createElement('div');
        teamButtonsGrid.className = 'team-buttons-grid';

        teamGroups[division].forEach(team => {
            if (data.hasOwnProperty(getTeamFromTeamName(team))) {
                const displayName = formatTeamName(team);
                const teamColor = getTeamColor(displayName);

                const teamButton = document.createElement('button');
                teamButton.className = 'legend-item';
                teamButton.style.backgroundColor = teamColor;
                teamButton.style.borderColor = teamColor;
                teamButton.style.color = '#fff'; // Ensure text is readable
                teamButton.innerHTML = displayName;
                teamButton.dataset.team = displayName;

                // Toggle chart data on button click
                teamButton.addEventListener('click', function () {
                    toggleTeamData(displayName);
                    teamButton.classList.toggle('inactive');
                });

                teamButtonsGrid.appendChild(teamButton);
            }
        });

        section.appendChild(teamButtonsGrid);
    });

    container.appendChild(section);
}

function toggleAllTeams(teams, show) {
    teams.forEach(team => {
        const formattedTeamName = formatTeamName(team);
        const charts = Object.values(Chart.instances);

        charts.forEach(chart => {
            const datasetIndex = chart.data.datasets.findIndex(dataset => dataset.label === formattedTeamName);
            if (datasetIndex !== -1) {
                const meta = chart.getDatasetMeta(datasetIndex);
                meta.hidden = !show;
                chart.update();
            }
        });

        const teamButton = document.querySelector(`[data-team="${formattedTeamName}"]`);
        if (teamButton) {
            if (show) {
                teamButton.classList.remove('inactive');
            } else {
                teamButton.classList.add('inactive');
            }
        }
    });
}

function formatTeamName(team) {
    if(team === "Forty-Niners49'ers" || team === '49ers'){
        return 'Forty-Niners';
    }
    return team;
}

function getTeamFromTeamName(teamName){
    if(teamName === 'Forty-Niners'){
        return "Forty-Niners49'ers";
    }
    return teamName;
}

function getTeamColor(team) {
    const teamColors = {
        'Cardinals': '#97233F', 'Falcons': '#A71930', 'Ravens': '#241773', 'Bills': '#00338D',
        'Panthers': '#0085CA', 'Bears': '#0B162A', 'Bengals': '#FB4F14', 'Browns': '#311D00',
        'Cowboys': '#003594', 'Broncos': '#FB4F14', 'Lions': '#0076B6', 'Packers': '#203731',
        'Texans': '#03202F', 'Colts': '#002C5F', 'Jaguars': '#006778', 'Chiefs': '#E31837',
        'Raiders': '#000000', 'Chargers': '#002244', 'Rams': '#003594', 'Dolphins': '#008E97',
        'Vikings': '#4F2683', 'Patriots': '#002244', 'Saints': '#D3BC8D', 'Giants': '#0B2265',
        'Jets': '#125740', 'Eagles': '#004C54', 'Steelers': '#FFB612', '49ers': '#AA0000',
        'Forty-Niners': '#AA0000', 'Seahawks': '#002244', 'Buccaneers': '#D50A0A', 'Titans': '#0C2340',
        'Commanders': '#773141'
    };
    return teamColors[team] || '#' + Math.floor(Math.random() * 16777215).toString(16);
}

function createCharts(data) {
    createGlobalLegend(data);

    const chartContainer = document.getElementById('chart-container');
    chartContainer.innerHTML = '';

    const stages = [
        { id: 'super-bowl-winner', name: 'Playoffs', dataKey: 'win_super_bowl' },
        { id: 'super-bowl-appearance', name: 'Divisional Round', dataKey: 'win_conference' },
        { id: 'conference-championship', name: 'Conference Championship', dataKey: 'first_round_bye' },
        { id: 'round2', name: 'Super Bowl Appearance', dataKey: 'win_division' },
        { id: 'round1', name: 'Super Bowl Winner', dataKey: 'make_playoffs' }
    ];

    stages.forEach(stage => {
        const chartDiv = document.createElement('div');
        chartDiv.className = 'chart';
        chartDiv.innerHTML = `<canvas id="${stage.id}-chart"></canvas>`;
        chartContainer.appendChild(chartDiv);

        const ctx = document.getElementById(`${stage.id}-chart`).getContext('2d');

        // Calculate the maximum value across all datasets
        const maxValue = Math.max(
            ...Object.values(data).flatMap(probabilities => 
                probabilities[stage.dataKey].map(point => point.y * 100)
            )
        );

        const yAxisMax = Math.min(maxValue + 5, 100);

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: Object.entries(data).map(([team, probabilities]) => {
                    const formattedTeamName = formatTeamName(team);
                    const teamColor = getTeamColor(formattedTeamName);
                    return {
                        label: formattedTeamName,
                        data: probabilities[stage.dataKey].map(point => ({
                            x: new Date(point.x),
                            y: point.y * 100  // Convert to percentage
                        })),
                        borderColor: teamColor,
                        backgroundColor: teamColor,
                        fill: false,
                        hidden: false,
                        tension: 0 // Make lines straight
                    };
                })
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: stage.name,
                        font: { size: 16, weight: 'bold' },
                        padding: { top: 5, bottom: 10 },
                        color: '#333'
                    },
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        mode: 'nearest',
                        intersect: true,
                        callbacks: {
                            title: (tooltipItems) => new Date(tooltipItems[0].parsed.x).toLocaleDateString(),
                            label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`,
                            labelColor: (context) => ({
                                borderColor: context.dataset.borderColor,
                                backgroundColor: context.dataset.borderColor
                            })
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'hour', stepSize: 2, displayFormats: { hour: 'MMM d ha' }},
                        title: { display: true, text: 'Date', font: { size: 12, weight: 'bold' }},
                        ticks: {
                            source: 'data',
                            autoSkip: true,
                            maxTicksLimit: 100,
                            maxRotation: 45,
                            minRotation: 45,
                            font: { size: 10 }
                        },
                        stacked: true
                    },
                    y: {
                        title: { display: true, text: 'Probability', font: { size: 12, weight: 'bold' }},
                        min: 0,
                        max: yAxisMax, // Use the calculated maximum value
                        ticks: {
                            callback: value => `${value}%`,
                            font: { size: 10 }
                        }
                    }
                },
                elements: {
                    point: { radius: 2, hoverRadius: 5 },
                    line: { borderWidth: 2 }
                }
            }
        });

        // Add click event listener for graph expansion
        ctx.canvas.addEventListener('click', () => expandGraph(chart, stage.name));
    });
}

function expandGraph(chart, title) {
    const modal = document.createElement('div');
    modal.className = 'graph-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>${title}</h2>
            <canvas id="expanded-chart"></canvas>
        </div>
    `;
    document.body.appendChild(modal);

    const expandedCtx = document.getElementById('expanded-chart').getContext('2d');
    const expandedChart = new Chart(expandedCtx, {
        type: chart.config.type,
        data: chart.config.data,
        options: {
            ...chart.config.options,
            responsive: true,
            maintainAspectRatio: false
        }
    });

    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

async function trackPageView() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const country = data.country_name || 'Unknown';
        await fetch('/track-page-view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country: country })
        });
    } catch (error) {
        console.error('Error tracking page view:', error);
    }
}