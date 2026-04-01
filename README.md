# HomeMade Serial Plot

> **The best open-source, browser-based serial port plotter.**  
> Real-time multi-channel plotting from any USB/UART device — no installation required.

**Author:** Lysandre LABORDE  
**Origin:** ISMIN 2A, Mines Saint-Étienne — ECG Elective Project, 2025–2026  
**License:** MIT (see [LICENSE](LICENSE))

---

## What is it?

**HomeMade Serial Plot** is a lightweight, high-performance web application that reads data from a serial port (USB/UART) and plots it **in real time** directly in your browser. No installation, no drivers, no software to install — just open the HTML file in Chrome or Edge and connect your device.

It was originally created to visualize ECG (electrocardiogram) signals from an STM32 microcontroller, but it works with **any device that outputs data over a serial connection**.

---

## Features

- **Multi-channel plotting** — automatically creates one graph per data channel (up to 6+ simultaneous channels)
- **Real-time streaming** — high performance, up to 50,000 data points per channel with zero lag
- **Configurable baud rate** — 9600, 19200, 38400, 57600, 115200 (default)
- **Zoom & Pan** — mouse wheel to zoom, drag to pan on any chart (powered by Chart.js)
- **Per-channel controls:**
  - Adjustable Y-axis min/max
  - Adjustable time window (seconds)
  - Custom line color picker
  - Custom background color picker
  - Pause/Resume individual channels
- **Global Pause All** button
- **Export to CSV** — download raw data from any channel at any time
- **No dependencies to install** — all libraries are loaded from CDN (Chart.js, Hammer.js, Phosphor Icons)
- Works 100% in the browser — no backend, no server, no Python, no Node.js required

---

## How to Use

### Requirements

- A **Chromium-based browser**: Google Chrome, Microsoft Edge, or Brave  
  *(Firefox does not support the Web Serial API without flags)*
- A device connected via **USB serial / UART** (e.g., Arduino, STM32 Nucleo, ESP32, Raspberry Pi Pico...)
- The device must be **sending data as text over serial**, one line per sample

---

### Data Format

Your microcontroller must send data as **comma-separated values**, one line per time step, terminated by `\n`.

**Single channel:**
```
512\n
487\n
531\n
```

**Multi-channel (3 channels):**
```
512,1023,255\n
487,1010,240\n
531,998,270\n
```

Each value becomes its own chart. The number of channels is detected **automatically** from the first line received.

**Example C code for STM32 (UART):**
```c
// Single value
printf("%d\r\n", adc_value);

// Multi-channel
printf("%d,%d,%d\r\n", ch1, ch2, ch3);
```

**Example Arduino code:**
```cpp
// Single value
Serial.println(analogRead(A0));

// Multi-channel
Serial.print(analogRead(A0));
Serial.print(",");
Serial.println(analogRead(A1));
```

---

### Step-by-Step Usage

1. **Open `index.html`** in Google Chrome or Microsoft Edge  
   *(double-click the file, or drag it into the browser)*

2. **Select the baud rate** matching your device (default: 115200)

3. **Click "Connect Serial"** — a browser dialog will appear listing available serial ports

4. **Select your device** (e.g., `COM3` on Windows, `/dev/ttyUSB0` on Linux/macOS)

5. **Start receiving data** — charts appear automatically as data flows in

6. **Customize your view:**
   - Scroll the mouse wheel on any chart to zoom in/out
   - Click and drag to pan left/right
   - Set Y-axis limits to lock the scale
   - Change the time window to see more or less history
   - Change line and background colors

7. **Export data** by clicking the download icon on any chart — saves a `.csv` file

8. **Click "Disconnect"** to stop the serial connection

---

## File Structure

```
HomeMade Serial Plot/
├── index.html    ← Main application (open this in your browser)
├── app.js        ← All application logic (serial reading, chart management)
├── style.css     ← UI styling (glassmorphism dark theme)
├── README.md     ← This file
└── LICENSE       ← MIT License
```

---

## Browser Compatibility

| Browser         | Support        |
|-----------------|---------------|
| Google Chrome   | ✅ Full support |
| Microsoft Edge  | ✅ Full support |
| Brave           | ✅ Full support |
| Firefox         | ❌ Web Serial API not supported by default |
| Safari          | ❌ Web Serial API not supported |

> The Web Serial API is required. It is available in all Chromium-based browsers version 89+.

---

## Troubleshooting

**"Connect Serial" button does nothing / no port listed:**
- Make sure your device is plugged in and recognized by your OS
- Check Device Manager (Windows) or `ls /dev/tty*` (Linux/macOS)
- Try a different USB cable (some are charge-only)
- Make sure no other application (Arduino IDE, PuTTY, etc.) is using the port

**Charts appear but values look wrong:**
- Check that your baud rate matches what the device is sending
- Verify the data format is comma-separated values on single lines

**The page opens but nothing happens on click:**
- You must open the file in Chrome/Edge, not Firefox or Safari
- On some systems, you may need to enable the flag: `chrome://flags/#enable-experimental-web-platform-features`

**Data is too slow to display:**
- Reduce the time window (e.g., set to 5s instead of 10s)
- Make sure your device is not sending data too fast (>500 Hz may lag in browser)

---

## Contributing

Contributions are welcome! If you improve the app, add features, or fix bugs:

1. Fork the repository on GitHub
2. Create a branch: `git checkout -b feature/my-improvement`
3. Commit your changes: `git commit -m "Add: my improvement"`
4. Push and open a Pull Request

**Important:** Per the MIT License, you must keep the original copyright notice in all copies or substantial portions of the code. The author's name (`© Lysandre LABORDE`) must remain visible.

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for the full text.

**In short:**
- ✅ You can use it freely, commercially or personally
- ✅ You can modify it and redistribute it
- ✅ You can include it in your own projects
- ❌ You cannot remove the author's name and copyright notice
- ❌ The author provides no warranty

---

## Credits & Acknowledgements

**Created by [Lysandre LABORDE](https://github.com/lysandrelaborde)**  
ISMIN 2A — Mines Saint-Étienne, 2025–2026  
Originally developed as part of the ECG Portable project (ECG Elective, clean room electrode fabrication + signal acquisition + display).

Built with:
- [Chart.js](https://www.chartjs.org/) — MIT License
- [chartjs-plugin-zoom](https://www.chartjs.org/chartjs-plugin-zoom/latest/) — MIT License
- [Hammer.js](https://hammerjs.github.io/) — MIT License
- [Phosphor Icons](https://phosphoricons.com/) — MIT License

---

*If this tool helped you, a ⭐ on GitHub is always appreciated!*
