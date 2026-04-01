/**
 * HomeMade Serial Plot
 * © 2026 Lysandre LABORDE
 * Mines Saint-Étienne — ISMIN 2A — ECG Elective Project, 2025–2026
 *
 * MIT License — Free to use, modify, and redistribute.
 * You must keep this copyright notice in all copies or substantial portions.
 * Full license: see LICENSE file or https://opensource.org/licenses/MIT
 */

// Global App State
const state = {
    port: null,
    reader: null,
    keepReading: true,
    channels: [],     // Array of chart objects configured dynamically
    startTime: 0,
    baseColors: [
        '#00f0ff', // Cyan
        '#ff0055', // Pink/Red
        '#00ff66', // Green
        '#ffaa00', // Orange
        '#aa00ff', // Purple
        '#ffff00'  // Yellow
    ]
};

// DOM Elements
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const baudRateSelect = document.getElementById('baud-rate');
const chartsContainer = document.getElementById('charts-container');
const emptyState = document.getElementById('empty-state');
const template = document.getElementById('chart-card-template');
const pauseAllBtn = document.getElementById('pause-all-btn');

// Chart initialization defaults
Chart.defaults.color = '#8b8b99';
Chart.defaults.font.family = "'Inter', sans-serif";

/**
 * Serial Port Logic
 */
connectBtn.addEventListener('click', async () => {
    try {
        state.port = await navigator.serial.requestPort();
        const baudRate = parseInt(baudRateSelect.value, 10);
        
        await state.port.open({ baudRate });
        
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'inline-flex';
        pauseAllBtn.style.display = 'inline-flex';
        baudRateSelect.disabled = true;
        
        state.keepReading = true;
        state.startTime = performance.now();
        
        readLoop();
    } catch (err) {
        console.error('Error connecting to serial port:', err);
        alert('Could not connect: ' + err.message);
    }
});

disconnectBtn.addEventListener('click', async () => {
    state.keepReading = false;
    if (state.reader) {
        await state.reader.cancel();
    }
    
    connectBtn.style.display = 'inline-flex';
    disconnectBtn.style.display = 'none';
    pauseAllBtn.style.display = 'none';
    baudRateSelect.disabled = false;
});

class LineBreakTransformer {
    constructor() {
        this.chunks = '';
    }

    transform(chunk, controller) {
        this.chunks += chunk;
        const lines = this.chunks.split('\n');
        this.chunks = lines.pop(); // Keep the last incomplete line
        lines.forEach(line => controller.enqueue(line.trim()));
    }

    flush(controller) {
        if (this.chunks) {
            controller.enqueue(this.chunks);
        }
    }
}

async function readLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = state.port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable
        .pipeThrough(new TransformStream(new LineBreakTransformer()))
        .getReader();
        
    state.reader = reader;

    try {
        while (state.keepReading) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) processDataLine(value);
        }
    } catch (error) {
        console.error('Error reading serial data:', error);
    } finally {
        reader.releaseLock();
    }
    
    await state.port.close();
}

/**
 * Data Processing
 */
function processDataLine(line) {
    if (!line) return;
    
    // Split by comma
    const valuesList = line.split(',').map(s => parseFloat(s.trim()));
    
    // Check if lengths match up with our current channels
    if (valuesList.length > 0 && !isNaN(valuesList[0])) {
        // Expand channels if necessary
        while (state.channels.length < valuesList.length) {
            createChartChannel(state.channels.length);
        }
        
        const currentTime = (performance.now() - state.startTime) / 1000; // time in seconds
        
        valuesList.forEach((val, idx) => {
            if (isNaN(val)) return;
            const channel = state.channels[idx];
            
            // Only push to data if not paused
            if (!channel.isPaused) {
                channel.data.push({ x: currentTime, y: val });
                
                // Keep max data points to avoid memory bloat over very very long sessions
                // Or limit by time window. If user wants to scroll, we keep more data.
                if (channel.data.length > 50000) {
                    channel.data.shift();
                }
            }
        });
    }
}

/**
 * Chart Creation & Rendering
 */
function createChartChannel(index) {
    if (index === 0 && state.channels.length === 0) {
        emptyState.style.display = 'none';
    }
    
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.chart-card');
    
    card.querySelector('.channel-index').textContent = index + 1;
    
    const canvas = clone.querySelector('canvas');
    const defaultColor = state.baseColors[index % state.baseColors.length];
    
    // Set UI color bindings
    const lineColorInput = clone.querySelector('.line-color-input');
    const bgColorInput = clone.querySelector('.bg-color-input');
    const linePreview = clone.querySelector('.line-preview');
    const bgPreview = clone.querySelector('.bg-preview');
    const chartBody = clone.querySelector('.chart-body');
    
    lineColorInput.value = defaultColor;
    linePreview.style.background = defaultColor;
    bgColorInput.value = '#000000'; // Default black bg natively via css opacity, let's allow actual bg picking
    
    // Config controls
    const yMinInput = clone.querySelector('.y-min-input');
    const yMaxInput = clone.querySelector('.y-max-input');
    const timeWindowInput = clone.querySelector('.time-window-input');
    const pauseBtn = clone.querySelector('.pause-btn');
    const exportBtn = clone.querySelector('.export-btn');
    
    chartsContainer.appendChild(clone);
    
    const ctx = canvas.getContext('2d');
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: `Channel ${index + 1}`,
                data: [],
                borderColor: defaultColor,
                borderWidth: 2,
                pointRadius: 0, // Disable points for performance
                tension: 0.1,   // slightly smooth but mostly direct
                fill: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // High performance
            parsing: false,   // High performance mode bypassing default parsing
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                zoom: { // chartjs-plugin-zoom configuration
                    pan: { enabled: true, mode: 'xy' },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'xy',
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Time (s)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    type: 'linear',
                    title: { display: true, text: 'Value' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
    
    const channelState = {
        index,
        chart,
        card,
        data: chart.data.datasets[0].data,
        isPaused: false,
        timeWindow: parseFloat(timeWindowInput.value) || 10
    };
    
    // Connect visual settings
    lineColorInput.addEventListener('input', (e) => {
        const val = e.target.value;
        linePreview.style.background = val;
        chart.data.datasets[0].borderColor = val;
        chart.update('none');
    });
    
    bgColorInput.addEventListener('input', (e) => {
        const val = e.target.value;
        bgPreview.style.background = val;
        chartBody.style.background = val;
    });
    
    // Scale settings
    const updateYScales = () => {
        if (yMinInput.value !== '') chart.options.scales.y.min = parseFloat(yMinInput.value);
        else delete chart.options.scales.y.min;
        
        if (yMaxInput.value !== '') chart.options.scales.y.max = parseFloat(yMaxInput.value);
        else delete chart.options.scales.y.max;
        
        chart.update('none');
    };
    yMinInput.addEventListener('input', updateYScales);
    yMaxInput.addEventListener('input', updateYScales);
    
    timeWindowInput.addEventListener('change', (e) => {
        channelState.timeWindow = parseFloat(e.target.value) || 10;
        // The redraw loop will pick this up
    });
    
    // Connect functional settings
    pauseBtn.addEventListener('click', () => {
        channelState.isPaused = !channelState.isPaused;
        if (channelState.isPaused) {
            pauseBtn.classList.add('active-pause');
            pauseBtn.innerHTML = '<i class="ph ph-play"></i>';
        } else {
            pauseBtn.classList.remove('active-pause');
            pauseBtn.innerHTML = '<i class="ph ph-pause"></i>';
        }
    });
    
    exportBtn.addEventListener('click', () => {
        exportToCSV(channelState);
    });
    
    state.channels.push(channelState);
}

/**
 * Exporter
 */
function exportToCSV(channel) {
    const data = channel.data; // The current dataset
    if (!data || data.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,Time(s),Value\n";
    data.forEach(row => {
        csvContent += `${row.x.toFixed(4)},${row.y}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `channel_${channel.index + 1}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Render Loop
 */
function updateCharts() {
    if (state.channels.length > 0) {
        const currentTime = (performance.now() - state.startTime) / 1000;
        
        state.channels.forEach(ch => {
            // Update X axis scale based on time unless paused (if paused, let user zoom/pan without window moving)
            if (!ch.isPaused) {
                // If the dataset has points, smoothly shift the X window along
                const maxTime = Math.max(currentTime, ch.data.length > 0 ? ch.data[ch.data.length-1].x : 0);
                ch.chart.options.scales.x.max = maxTime;
                ch.chart.options.scales.x.min = Math.max(0, maxTime - ch.timeWindow);
                ch.chart.update('none');
            }
        });
    }
    
    requestAnimationFrame(updateCharts);
}

// Pause All Logic
let isAllPaused = false;
pauseAllBtn.addEventListener('click', () => {
    isAllPaused = !isAllPaused;
    if (isAllPaused) {
        pauseAllBtn.classList.add('active-pause');
        pauseAllBtn.innerHTML = '<i class="ph ph-play"></i> Resume All';
    } else {
        pauseAllBtn.classList.remove('active-pause');
        pauseAllBtn.innerHTML = '<i class="ph ph-pause"></i> Pause All';
    }
    
    state.channels.forEach(ch => {
        ch.isPaused = isAllPaused;
        const btn = ch.card.querySelector('.pause-btn');
        if (ch.isPaused) {
            btn.classList.add('active-pause');
            btn.innerHTML = '<i class="ph ph-play"></i>';
        } else {
            btn.classList.remove('active-pause');
            btn.innerHTML = '<i class="ph ph-pause"></i>';
        }
    });
});

// Start visual loop
requestAnimationFrame(updateCharts);
