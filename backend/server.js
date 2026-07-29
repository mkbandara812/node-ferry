const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const DB_FILE = path.join(__dirname, 'usage.json');

// Database initialization
let usageDb = {};
if (fs.existsSync(DB_FILE)) {
  try {
    usageDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    usageDb = {};
  }
} else {
  fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

const WHITELIST_FILE = path.join(__dirname, 'whitelist.json');
const REQUESTS_FILE = path.join(__dirname, 'admin_requests.json');

if (!fs.existsSync(WHITELIST_FILE)) fs.writeFileSync(WHITELIST_FILE, JSON.stringify([]));
if (!fs.existsSync(REQUESTS_FILE)) fs.writeFileSync(REQUESTS_FILE, JSON.stringify([]));

// Periodically save database to disk (every 10 seconds)
setInterval(() => {
  fs.writeFile(DB_FILE, JSON.stringify(usageDb), (err) => {
    if (err) console.error("Failed to save usage database:", err);
  });
}, 10000);

const MAX_BYTES_PER_DAY = 5 * 1024 * 1024 * 1024; // 5GB

const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

const checkAndAddUsage = (ip, size) => {
  let whitelist = [];
  try { whitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE, 'utf8')); } catch(e){}
  if (whitelist.includes(ip)) {
      return true; // Bypass limit for whitelisted IPs
  }

  const date = getTodayDateString();
  
  if (!usageDb[date]) {
    usageDb[date] = {};
  }
  
  const currentBytes = usageDb[date][ip] || 0;
  
  if (currentBytes + size > MAX_BYTES_PER_DAY) {
    return false; // Limit exceeded
  }
  
  usageDb[date][ip] = currentBytes + size;
  
  return true;
};

// Rooms management
const rooms = new Map();

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Extract room ID from URL (e.g. /room/abc1234)
  const urlParts = req.url.split('/');
  if (urlParts.length < 3 || urlParts[1] !== 'room') {
    ws.close(1008, "Invalid room URL");
    return;
  }
  const roomId = urlParts[2];
  
  ws.clientId = crypto.randomUUID();

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);
  
  // Inform the client of their ID
  ws.send(JSON.stringify({ type: 'welcome', clientId: ws.clientId }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Attach from ID
      data.from = ws.clientId;
      
      // Enforce 5GB limit on file metadata declaration
      if (data.type === 'meta') {
        const fileSize = data.size || 0;
        const allowed = checkAndAddUsage(ip, fileSize);
        
        if (!allowed) {
          ws.send(JSON.stringify({ 
            type: 'limit_exceeded', 
            message: 'Daily transfer limit of 5GB reached for your IP.' 
          }));
          return; // Do not broadcast to peers
        }
      }

      const room = rooms.get(roomId);
      if (room) {
        if (data.target) {
          // Route to specific peer
          for (const client of room) {
            if (client.clientId === data.target && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
              break;
            }
          }
        } else {
          // Broadcast to other peers in the room
          for (const client of room) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse message or handle logic", e);
    }
  });

  ws.on('close', () => {
    const room = rooms.get(roomId);
    if (room) {
      room.delete(ws);
      // Notify others that this peer left
      for (const client of room) {
          if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'leave', from: ws.clientId }));
          }
      }
      
      if (room.size === 0) {
        rooms.delete(roomId);
      }
    }
  });
  
  ws.on('error', () => {
    const room = rooms.get(roomId);
    if (room) {
      room.delete(ws);
    }
  });
});

app.get('/', (req, res) => {
  res.send('NodeFerry Signaling Server is running.');
});

// Admin API
app.post('/request-quota', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  // if behind proxy, x-forwarded-for can be a comma separated list, take first
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
  
  const { reason, amount, donatedBefore, planToDonate } = req.body;
  
  let requests = [];
  try { requests = JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8')); } catch(e){}
  
  if (!requests.some(r => r.ip === ip)) {
      requests.push({ ip, reason, amount, donatedBefore, planToDonate, date: new Date().toISOString() });
      fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
  }
  
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
          await transporter.sendMail({
              from: `"NodeFerry System" <${process.env.SMTP_USER}>`,
              to: 'support@nodeferry.com',
              subject: 'New Quota Increase Request',
              text: `IP Address: ${ip}\nRequested Amount: ${amount}\nDonated Before: ${donatedBefore}\nPlan To Donate: ${planToDonate}\n\nReason:\n${reason}\n\nYou can whitelist this IP manually in your server.`
          });
      } catch (e) {
          console.error("Quota email error:", e);
      }
  }
  
  res.json({ success: true });
});

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) return res.status(400).json({ error: 'Missing fields' });
        
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            await transporter.sendMail({
                from: `"${name}" <${process.env.SMTP_USER}>`, 
                replyTo: email,
                to: 'support@nodeferry.com',
                subject: 'New Support Message from NodeFerry',
                text: `Name: ${name}\nEmail: ${email}\nIP: ${ip}\n\nMessage:\n${message}`
            });
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Email service not configured on server' });
        }
    } catch (e) {
        console.error("Email error:", e);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

app.get('/admin/requests', (req, res) => {
  const { key } = req.query;
  if (key !== 'mkbsoft2026') return res.status(401).send("Unauthorized");
  
  let requests = [];
  try { requests = JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8')); } catch(e){}
  res.json(requests);
});

app.post('/admin/approve', (req, res) => {
  const { key } = req.query;
  if (key !== 'mkbsoft2026') return res.status(401).send("Unauthorized");
  
  const { ip } = req.body;
  if (!ip) return res.status(400).send("IP required");

  let whitelist = [];
  try { whitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE, 'utf8')); } catch(e){}
  if (!whitelist.includes(ip)) {
      whitelist.push(ip);
      fs.writeFileSync(WHITELIST_FILE, JSON.stringify(whitelist, null, 2));
  }
  
  let requests = [];
  try { requests = JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8')); } catch(e){}
  requests = requests.filter(r => r.ip !== ip);
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
  
  res.json({ success: true, ip });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
