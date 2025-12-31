🗨️ Real-Time Chat Application (MERN + WebSockets)

A full-stack real-time chat application built using the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.IO.
The project focuses on real-time communication, room-based collaboration, authentication, and persistent chat history, inspired by applications like Slack and WhatsApp.

🚀 Features
🔐 Authentication & Security

JWT-based user authentication

Secure login and logout flow

Protected routes for authenticated users

🏠 Room & Chat Management

Public chat rooms (joinable by all users)

Private chat rooms with 6-character invite codes

Create public or private rooms

Role-based room ownership (admin/member)

Direct messaging between users

💬 Real-Time Communication

Real-time messaging using Socket.IO

System messages (e.g., “User joined the room”)

Multi-user chat support

Live room updates without page refresh

📨 Messaging & Media

Text messaging

Image and file sharing

Persistent message history stored in MongoDB

Old messages visible when users join later

📱 UI & Experience

Responsive design

Clean room-based sidebar layout

Room info panel showing members and invite codes

Admin indicators for room creators

🛠️ Tech Stack
Frontend

React

CSS

Backend

Node.js

Express.js

Database

MongoDB

Mongoose

Real-Time

Socket.IO (WebSockets)

Authentication

JWT (JSON Web Tokens)

BCrypt for password hashing

⚙️ Installation & Setup
Prerequisites

Node.js

MongoDB (Local or MongoDB Atlas)

Backend Setup
cd server
npm install
npm start


Server runs at:

http://localhost:5000

Frontend Setup
cd client
npm install
npm start


App runs at:

http://localhost:3000

Environment Variables (.env)
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key

📂 Project Structure
├── client
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   ├── services
│   │   └── App.js
│   └── package.json
│
├── server
│   ├── models
│   ├── routes
│   ├── middleware
│   ├── socket.js
│   └── index.js
│
├── screenshots
├── .env.example
└── README.md

🟢 Project Screenshots

Login / Register Screen

Chat Dashboard with Rooms

Public Room Chat

Private Room with Invite Code

Media Message Preview

Room Info Modal

🖥️ Screenshots / Demo
🔐 Login / Register
<p align="center"> <img src="screenshots/Screenshot%202025-12-31%20200216.png" width="800" /> </p>
🌍 Public Room Chat (Multiple Users)
<p align="center"> <img src="screenshots/Screenshot%202025-12-31%20192544.png" width="800" /> </p>
🔒 Private Room with Invite Code
<p align="center"> <img src="screenshots/Screenshot%202025-12-31%20200044.png" width="800" /> </p>
🎥 Video Call Screen
<p align="center"> <img src="screenshots/Screenshot%202025-12-31%20202237.png" width="800" /> </p>
👥 Room Info (Members & Invite Code)
<p align="center"> <img src="screenshots/Screenshot%202025-12-31%20200132.png" width="800" /> </p>

🛠️ Planned Enhancements

The following features were planned but not completed due to time constraints:

Unread message indicators (blue-dot notifications)

Incoming audio/video call notifications

Accept / reject call UI

Call history and missed call indicators

These enhancements can be added using additional Socket.IO events and WebRTC.

📌 Key Notes

Focused on real-time architecture and scalability

Prioritized core functionality over UI polish

Designed to be easily extensible for future features

👤 Author

Pujitha Mule
Aspiring Full-Stack Developer (MERN)
Real-Time Systems • WebSockets • Scalable Application Design