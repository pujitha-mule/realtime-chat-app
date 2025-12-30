Real-Time Chat Application (MERN Stack)
📌 Overview

This project is a real-time chat application built using the MERN stack with WebSockets (Socket.IO).
It enables authenticated users to communicate instantly in chat rooms with messages persisted in a MongoDB database, similar to real-world applications like Slack or WhatsApp.

The application focuses on real-time communication, secure authentication, and message persistence.

🚀 Key Features

User Authentication (Register & Login using JWT)

Real-time messaging using WebSockets (Socket.IO)

Chat rooms support

Persistent chat history stored in MongoDB

Protected APIs using authentication middleware

Responsive and simple UI

Clean separation of frontend and backend

🛠 Tech Stack

Frontend

React.js

Axios

Socket.IO Client

React Router DOM

Backend

Node.js

Express.js

MongoDB (Mongoose)

Socket.IO

JWT Authentication

⚙️ Project Structure
realtime-chat-app/
├── client/        # React frontend
├── server/        # Node.js backend
└── README.md

🔧 Setup Instructions (Run Locally)
Prerequisites

Node.js (v18+ recommended)

MongoDB (running locally)

npm

Backend Setup
cd server
npm install
npm run dev


Backend runs on:

http://localhost:5000

Frontend Setup
cd client
npm install
npm start


Frontend runs on:

http://localhost:3000

🔐 Authentication Flow

User registers with email and password

Password is hashed and stored securely

On login, a JWT token is generated

Token is stored on the client and sent with API requests

Protected routes validate the token before access

🔄 Real-Time Communication Flow

Client establishes a WebSocket connection using Socket.IO

User joins a chat room

Messages are sent through WebSockets

Messages are stored in MongoDB

Stored messages are fetched on page refresh to maintain chat history

🖼 Screenshots

(Add screenshots here in the email submission)

Login Page

Register Page

Chat Room

Message persistence after refresh

✅ How This Meets the Assignment Requirements

Real-time communication → Socket.IO
WebSockets → Implemented on both client & server

Message persistence → MongoDB

Authentication → JWT-based

Responsive UI → React

Real-world relevance → Similar to Slack / WhatsApp

📬 Submission Notes

Project runs locally without deployment

All requirements implemented as per assignment

Screenshots included in submission email

README contains setup and explanation details

🔚 Final Note

This project demonstrates a practical implementation of real-time systems, backend integration, and secure authentication using the MERN stack.