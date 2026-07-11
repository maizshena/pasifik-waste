# Pasifik Waste - Multiplatform Application

Pasifik Waste is a comprehensive ecosystem designed to manage, record, and report waste disposal and processing. The project contains both a web platform and a mobile application, working together to provide user authentication, accurate location tagging, visual waste reporting, and data management.

## Project Structure

This is a multiplatform repository divided into distinct environments to serve different user needs:
* **Web Application**: Serves as the central landing page and dashboard platform.
* **Mobile Application**: Actively handles field operations, user reports, and on-site submissions.

---

## Web Application

The web platform functions as the main portal for public information, project onboarding, and administrative tracking.

### Web Tech Stack
* **Core Framework**: Next.js (React)
* **Styling and Components**: Tailwind CSS and shadcn/ui
* **Deployment Platform**: Vercel

### Web Key Features
* **Landing Page**: A professional interface showcasing the project purpose, waste reduction goals, and service overview.
* **Storefront Integration**: Interface components to view or request specialized waste management and recycling equipment.
* **Responsive Layout**: Optimized for desktop and mobile browsers to ensure seamless data visibility across all screen sizes.

---

## Mobile Application

The mobile app is designed for users on the go to submit instant waste reports and pinpoint physical pickup locations.

### Mobile Tech Stack
* **Core Framework**: Expo (React Native)
* **Programming Language**: TypeScript
* **Maps and Location Services**: `react-native-maps` and `expo-location`
* **Media Handling**: `expo-image-picker`
* **Navigation Router**: `expo-router`

### Mobile Key Features
* **Authentication System**: Secure user registration and login forms to protect user profiles and tracking data.
* **Waste Report Management**: Form fields to capture waste type categorization, precise weight values, photo attachments, and pickup scheduling.
* **Cross-Platform Map Picker**: Custom location selection architecture. It uses platform-specific file extensions to isolate code:
  * `.native.tsx` handles interactive map pinning and reverse geocoding for Android and iOS devices.
  * `.tsx` serves as a stable fallback component for web previewers, preventing internal native-only compiler crashes.
* **Tab-Based Navigation**: A clean bottom tab navigation flow that isolates guest actions from authenticated member actions.

---

## Core Workflows and Usage

### 1. Account Creation and Authentication
Users sign up or log in to establish their identity. The application stores session tokens to keep the user authenticated across app restarts.

### 2. Submitting a Waste Report
Inside the mobile app, users navigate to the report submission tab to complete a guided reporting process:
* **Input Details**: The user selects the type of waste and inputs the estimated weight.
* **Attach Image**: The app triggers the device camera or photo library to document the waste visually.
* **Tag Location**: The user interacts with the map component to set a pickup pin. The app automatically resolves the coordinates into a readable physical address string.
* **Schedule**: The user sets the preferred date and time for waste collection before final submission.

### 3. Monitoring and Administration
Submissions are tracked dynamically. The data flows into the ecosystem to ensure that waste collection routes, statistics, and platform states update accurately across both web and mobile environments.
