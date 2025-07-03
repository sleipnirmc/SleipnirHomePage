# Sleipnir MC Homepage

Official website for Sleipnir MC Reykjavík 🏍️

## 🚀 Quick Start

### Automated Setup

Run the setup script to install all dependencies:

```bash
./setup.sh
```

### Manual Setup

1. **Install Node.js** (if not already installed)
   ```bash
   # Using NVM (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Copy `.env.example` to `.env`
   - Add your Firebase project credentials

4. **Start development server**
   ```bash
   npm start
   # or
   python3 -m http.server 8000
   ```

5. **Open in browser**
   ```
   http://localhost:8000
   ```

## 📋 Requirements

- **Node.js** >= 16.0.0
- **Python** 3.x (for development server)
- **Modern web browser**
- **Firebase account** (for backend services)

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Firebase (Authentication, Firestore)
- **Hosting**: Firebase Hosting (optional)
- **Fonts**: Google Fonts (Cinzel, Cormorant Garamond, Iceland)
- **Icons**: Font Awesome

## 📁 Project Structure

```
sleipnir-homepage/
├── Sleipnir1212aa/          # Main website files
│   ├── javascript/          # JavaScript files
│   ├── Images/             # Image assets
│   ├── styles.css          # Main stylesheet
│   └── *.html              # HTML pages
├── package.json            # NPM configuration
├── requirements.txt        # Project requirements documentation
├── setup.sh               # Automated setup script
├── .nvmrc                 # Node version specification
└── README.md              # This file
```

## 🔥 Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Copy your Firebase config to `javascript/firebase-config.js`

## 🚢 Deployment

### Firebase Hosting

1. Install Firebase CLI
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize Firebase
   ```bash
   firebase init
   ```

3. Deploy
   ```bash
   firebase deploy
   ```

## 🔧 Development

### Available Scripts

- `npm start` - Start development server
- `npm install` - Install dependencies
- `npm test` - Run tests (when configured)

### Code Style

- ES6+ JavaScript
- Semantic HTML5
- CSS3 with CSS Variables
- Mobile-first responsive design

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is private and proprietary to Sleipnir MC Reykjavík.

---

**Ride Free** 🏍️