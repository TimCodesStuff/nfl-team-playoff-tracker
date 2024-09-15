document.addEventListener('DOMContentLoaded', function() {
    fetchProbabilities();
});

function fetchProbabilities() {
    fetch('/api/probabilities')
        .then(response => response.json())
        .then(data => {
            createCharts(data.probabilities);
            updateLastUpdated(data.last_updated);
        })
        .catch(error => {
            console.error('Error fetching probabilities:', error);
        });
}

function updateLastUpdated(timestamp) {
    const lastUpdatedElement = document.getElementById('last-updated');
    const date = new Date(timestamp);
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true, timeZoneName: 'short' };
    lastUpdatedElement.textContent = `Last updated: ${date.toLocaleString(undefined, options)}`;
}

function createGlobalLegend(data) {
    const legendContainer = document.getElementById('global-legend');
    legendContainer.innerHTML = '';
    Object.keys(data).forEach(team => {
        const teamItem = document.createElement('div');
        teamItem.className = 'legend-item';
        const displayName = formatTeamName(team);
        teamItem.innerHTML = `<span class="legend-color" style="background-color: ${getTeamColor(displayName)}"></span>${displayName}`;
        legendContainer.appendChild(teamItem);
    });
}

function formatTeamName(team) {
    if (team === '49ers' || team === "49'ers") {
        return 'Forty-Niners';
    }
    return team.replace("49'ers", "");
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
    return teamColors[team] || '#' + Math.floor(Math.random()*16777215).toString(16);
}

function createCharts(data) {
    createGlobalLegend(data);
    const chartContainer = document.getElementById('chart-container');
    chartContainer.innerHTML = '';

    /*
    const stages = [
        {id: 'round1', name: 'Round 1', dataKey: 'make_playoffs'},
        {id: 'round2', name: 'Round 2', dataKey: 'win_division'},
        {id: 'conference-championship', name: 'Conference Championship', dataKey: 'first_round_bye'},
        {id: 'super-bowl-appearance', name: 'Super Bowl Appearance', dataKey: 'win_conference'},
        {id: 'super-bowl-winner', name: 'Super Bowl Winner', dataKey: 'win_super_bowl'}
    ];
    */

    const stages = [
        {id: 'super-bowl-winner', name: 'Round 1', dataKey: 'win_super_bowl'},
        {id: 'super-bowl-appearance', name: 'Round 2', dataKey: 'win_conference'},
        {id: 'conference-championship', name: 'Conference Championship', dataKey: 'first_round_bye'},
        {id: 'round2', name: 'Super Bowl Appearance', dataKey: 'win_division'},
        {id: 'round1', name: 'Super Bowl Winner', dataKey: 'make_playoffs'}
    ];

    stages.forEach((stage, index) => {
        const chartDiv = document.createElement('div');
        chartDiv.className = 'chart';
        chartDiv.innerHTML = `<canvas id="${stage.id}-chart"></canvas>`;
        chartContainer.appendChild(chartDiv);

        const ctx = document.getElementById(`${stage.id}-chart`).getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                datasets: Object.entries(data).map(([team, probabilities]) => {
                    const formattedTeamName = formatTeamName(team);
                    const teamColor = getTeamColor(formattedTeamName);
                    return {
                        label: formattedTeamName,
                        data: probabilities[stage.dataKey].map(point => ({
                            x: new Date(point.x),
                            y: point.y * 100 // Convert to percentage
                        })),
                        borderColor: teamColor,
                        backgroundColor: teamColor,
                        fill: false,
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
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 5,
                            bottom: 10
                        },
                        color: '#333'
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true, 
                        mode: 'nearest',
                        intersect: true,
                        callbacks: {
                            title: function(tooltipItems) {
                                return new Date(tooltipItems[0].parsed.x).toLocaleDateString();
                            },
                            label: function(context) {
                                const teamName = context.dataset.label;
                                const percentage = context.parsed.y.toFixed(2);
                                return `${teamName}: ${percentage}%`;
                            },
                            labelColor: function(context) {
                                return {
                                    borderColor: context.dataset.borderColor,
                                    backgroundColor: context.dataset.borderColor
                                };
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {    unit: 'hour',    stepSize: 2,    displayFormats: {        hour: 'MMM d ha' // This format shows month, day, and hour (am/pm)    
                            }},
                        title: {
                            display: true,
                            text: 'Date',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            source: 'data',
                            autoSkip: true,
                            maxTicksLimit: 100,
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        },
                        stacked: true  // Enable stacking on the x-axis
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Probability',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 25,
                            callback: function(value) {
                                return value + '%';
                            },
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                elements: {
                point: {
                radius: 2,
                hoverRadius: 5
                },
                line: {
                borderWidth: 2
                }
                }
            }
        });
    });
}
