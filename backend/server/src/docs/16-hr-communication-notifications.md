# HR Communication & Real-time Notifications

Base URL

/hr/communication

Authentication

Bearer Token Required

---

# Messages

POST /messages

Send message to employee, HR, or company admin.

GET /messages

List sent and received messages.

GET /messages/:id

Message detail.

PATCH /messages/:id/read

Mark message as read.

---

# Notifications

POST /notifications

Send notification manually.

GET /notifications

List my notifications.

GET /notifications/unread-count

Get unread notification count.

PATCH /notifications/:id/read

Mark one notification as read.

PATCH /notifications/read-all

Mark all notifications as read.

---

# Real-time Events

Socket.IO Events

notification:new

message:new

---

# Supported Notification Types

message

leave

attendance

payroll

meeting

event

holiday

system

---

# Flow

HR sends message

↓

Message saved in database

↓

Notification created

↓

Socket.IO emits to recipient

↓

Frontend notification bell updates instantly

---

# Frontend Socket Example

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:8080", {
  auth: {
    token: localStorage.getItem("accessToken"),
  },
});

socket.on("notification:new", (notification) => {
  console.log("New notification", notification);
});

socket.on("message:new", (message) => {
  console.log("New message", message);
});