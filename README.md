# EventTrackPro

EventTrackPro is a comprehensive event management system that helps you create, manage, and track events and registrations. This repository is a blueprint version that can be used as a starting point for your own event management system.

## ⚠️ Important Note

This repository contains known issues that need to be fixed. Feel free to duplicate the repository and work on the fixes. The original Replit app link can be obtained by contacting:

📧 **Contact**: consultant@dedigitalmonk.com
💬 **Message**: "Link to the original Replit app can be shared through mail"

## 🎯 Features

### 📊 Dashboard
- Real-time overview of all events and registrations
  ![Dashboard](https://github.com/user-attachments/assets/4ce6a174-99be-44c8-a046-b2f5d9fc0290)
- Quick statistics on event attendance and registration counts
- Visual graphs and charts for event analytics
- Recent activity feed showing latest registrations and updates
- Quick actions for managing events and registrations

### 📝 Form Builder
- Intuitive drag-and-drop form builder
- Customizable form fields:
  - Text inputs (short & long)
  - Multiple choice questions
  - Checkboxes
  - Date/time selectors
  - File uploads
- Form styling options
- Custom success messages
- Field validation rules
- Optional and required field settings
- Real-time form preview

### 📅 Events Overview
- Comprehensive list of all events
- Event details including:
  - Date and time
  - Location (physical or virtual)
  - Capacity and remaining spots
  - Registration status
  - Attendance tracking
- Event filtering and sorting
- Quick actions:
  - Edit event details
  - Manage registrations
  - Export attendee lists
  - Send notifications
- Calendar view for event scheduling

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/eventtrackpro-blueprint.git
cd eventtrackpro-blueprint
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:
- Create `.env` file in the backend directory
- Add your database URL and other configuration

5. Start the development servers:

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

## 🏗️ Project Structure

```
eventtrackpro-blueprint/
├── backend/               # Backend API server
│   ├── src/              # Source code
│   ├── dist/             # Compiled code
│   └── package.json      # Backend dependencies
├── frontend/             # React frontend
│   ├── src/             # Source code
│   ├── dist/            # Built files
│   └── package.json     # Frontend dependencies
├── shared/              # Shared types and utilities
└── render.yaml          # Render deployment configuration
```

## 🔧 Configuration

### Backend Configuration
- Database connection (PostgreSQL)
- Session management
- Webhook configurations
- API rate limiting

### Frontend Configuration
- API endpoint configuration
- Theme customization
- Form builder settings
- Dashboard layout options

## 📦 Deployment

This project is configured for deployment on Render.com using the included `render.yaml` Blueprint. The configuration includes:

- Frontend web service
- Backend API service
- PostgreSQL database connection

## 🤝 Contributing

Feel free to fork this repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## 🙏 Acknowledgments

- Built with React and Express
- UI components from Radix UI
- Form handling with React Hook Form
- Database management with Drizzle ORM 
