<h1 align="center">🗨️ Real-Time Chat Application</h1>
<p align="center"><b>MERN Stack • Socket.IO • JWT Authentication</b></p>

---

## 📌 Overview

A full-stack real-time chat application built using the **MERN stack (MongoDB, Express.js, React, Node.js)** and **Socket.IO**.  
The project focuses on real-time communication, room-based collaboration, authentication, and persistent chat history, inspired by platforms like **Slack** and **WhatsApp**.

---

## 🚀 Features

### 🔐 Authentication & Security
- JWT-based user authentication  
- Secure login and logout flow  
- Protected routes for authenticated users  

---

### 🏠 Room & Chat Management
- Public chat rooms (joinable by all users)  
- Private chat rooms with **6-character invite codes**  
- Create public or private rooms  
- Role-based room ownership (admin/member)  
- Direct messaging between users  

---

### 💬 Real-Time Communication
- Real-time messaging using **Socket.IO**  
- System messages (e.g., *“User joined the room”*)  
- Multi-user chat support  
- Live room updates without page refresh  

---

### 📨 Messaging & Media
- Text messaging  
- Image and file sharing  
- Persistent message history stored in MongoDB  
- Old messages visible when users join later  

---

### 📱 UI & Experience
- Responsive design  
- Clean room-based sidebar layout  
- Room info panel showing members and invite codes  
- Admin indicators for room creators  

---

## 🛠️ Tech Stack

### Frontend
- React  
- CSS  

### Backend
- Node.js  
- Express.js  

### Database
- MongoDB  
- Mongoose  

### Real-Time
- Socket.IO (WebSockets)  

### Authentication
- JWT (JSON Web Tokens)  
- BCrypt for password hashing  

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js  
- MongoDB (Local or MongoDB Atlas)  

---

### Backend Setup
```bash
cd server
npm install
npm start
