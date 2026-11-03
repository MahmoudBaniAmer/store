
# Marvet — MERN E-Commerce

Marvet is a full-stack e-commerce web application built using the MERN stack. It provides a modern shopping experience where users can browse products, manage their carts and favorites, place demo orders, and interact with the store through a customer support assistant.

## Features

- User registration and login
- Product browsing, search, filtering, sorting, and pagination
- Shopping cart and favorites
- Demo checkout and order history
- Product reviews and ratings
- Admin dashboard for managing products, categories, users, and orders
- Sales analytics dashboard
- Email notifications
- Optional delivery location sharing and map integration
- Gemini-powered store assistant
- Responsive interface with light and dark themes

## Technologies Used

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication

## Project Structure

```text
Marvet/
├── backend/   # Express API, models, controllers, routes, and middleware
├── frontend/  # React application
└── postman/   # API collection and local testing environment
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd Marvet
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a local `.env` file based on `backend/.env.example` and configure the required environment variables.

Start the backend:

```bash
npm run dev
```

### 3. Set up the frontend

Open a separate terminal:

```bash
cd frontend
npm install
```

Create a local `.env.local` file based on `frontend/.env.example` if needed.

Start the frontend:

```bash
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Open the application at:

```text
http://127.0.0.1:5175
```

## Environment Variables

The backend requires:

- `DATABASE_URI`
- `SECRET`

Optional backend integrations:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

The frontend may use:

- `VITE_API_BASE_URL`
- `VITE_GOOGLE_MAPS_API_KEY`

**Do not commit `.env` or `.env.local` files, or include real credentials in the repository.**

## Demo Limitations

- Checkout is for demonstration purposes and does not process real payments.
- Google Sign-In is currently disabled.
- Gemini, email notifications, and maps require their respective configuration.
- Checkout and order cancellation require MongoDB transaction support.

