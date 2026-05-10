# 🚀 ScoreSites

A Chrome Extension for tracking productivity scores on sites.

![Demo](demo.gif)

## 📌 Features

- ⏱️ Tracks time spent on each website
- 📊 Calculates a productivity score
- 🔔 Shows notifications for tracking updates
- 🌐 Detects tab switches and focus changes
- 💾 Stores data using Chrome Storage API
- ⚡ Lightweight and runs in background (Manifest V3)


## 🧠 How It Works

1. Tracks the currently active website.
2. Records the time spent on it.
3. Users can assign custom productivity scores to websites.
4. Updates total score based on usage.
5. Detects:
   - Tab changes
   - Page loads
   - Chrome focus loss


## 🛠️ Tech Stack

- JavaScript (Vanilla)
- Chrome Extensions API (Manifest V3)
- Chrome Storage API
- Chrome Notifications API

## ⚙️ Installation

1. Clone the repository

```bash
git clone https://github.com/shruti202x/scoresites.git
```

2. Open chrome and navigate to `chrome://extensions/`

3. Enable `Developer Mode`

4. Click `Load Unpacked`

5. Select the project folder.

## 🚧 Challenges Faced

- Handling unreliable Chrome events like `windows.onRemoved`.

- Managing service worker lifecycle (`Manifest V3`).

- Detecting focus changes accurately.

- Avoiding duplicate event triggers.

## ✨ Unique Features

- Smart scoring system based on time spent
- Real-time tracking using Chrome events
- Lightweight and efficient background processing

## 🤝 Contributing

Feel free to fork this repository and submit pull requests to improve the project.