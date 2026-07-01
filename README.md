# Real-Time Order Book Visualizer

A live order matching engine with a web-based dashboard. It uses a Node.js/WebSocket backend to stream data, while the actual heavy lifting (order matching and market monitoring) is handled by a high-performance C++ core.

## The Architecture

* **Frontend:** HTML/JS dashboard receiving live data via WebSockets.
* **Backend:** Node.js (socket.io) acting as the bridge between the UI and the matching engine.
* **Algorithmic Core:** Compiled C++ executable processing the order book.

## How the Engine Works

### 1. Order Matching (Min/Max Heaps)
To ensure the engine can handle high-throughput trading, the C++ core uses a Max-Heap for Buy orders (Bids) and a Min-Heap for Sell orders (Asks). This structure guarantees $O(\log N)$ time complexity for both inserting new orders and extracting the best available price matches.

### 2. Native Anomaly Detection (Circuit Breaker)
Rather than introducing the latency of an external ML service (like a Python microservice), the anomaly detection is built natively into the C++ engine. 

As trades are processed, the system calculates a rolling Z-Score to monitor trade velocity. If the algorithm detects a statistically significant spike in sell orders (simulating a flash crash), it instantly halts the matching engine and broadcasts a "CIRCUIT BREAKER TRIGGERED" alert to the frontend.

## Local Setup

### 1. Clone the repository
```bash
git clone [https://github.com/shaivatva/order-book-visualizer.git](https://github.com/shaivatva/order-book-visualizer.git)
cd order-book-visualizer
