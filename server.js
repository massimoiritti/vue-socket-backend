const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const ExcelJS = require('exceljs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"]
  }
});

let clickedNumbers = [];
let removedNumbers = [];
let logs = [];
let firstArrivedTimestamp = null;
let lastArrivedTimestamp = null;

const logToFile = (text) => {
  fs.appendFileSync('log.txt', text + '\n');
};

const getTimeDifference = (previous, current) => {
  if (!previous) return "N/A";
  const diff = Math.floor((current - previous) / 1000);
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

io.on('connection', (socket) => {
  socket.emit('updateList', clickedNumbers);
  socket.emit('updateRemovedList', removedNumbers);
  socket.emit('updateLogs', logs);

  socket.on('addNumber', ({ num, logEntry }) => {
    if (!clickedNumbers.includes(num)) {
      clickedNumbers.push(num);
      removedNumbers = removedNumbers.filter(n => n !== num);
      logs.push(logEntry);
      logToFile(logEntry.text);
      io.emit('updateList', clickedNumbers);
      io.emit('updateRemovedList', removedNumbers);
      io.emit('updateLogs', logs);
    }
  });

  socket.on('removeNumber', ({ num, timestamp }) => {
    clickedNumbers = clickedNumbers.filter(n => n !== num);
    if (!removedNumbers.includes(num)) {
      removedNumbers.push(num);
    }

    const currentTimestamp = new Date();
    const firstDiff = getTimeDifference(firstArrivedTimestamp, currentTimestamp);
    const prevDiff = getTimeDifference(lastArrivedTimestamp, currentTimestamp);

    if (!firstArrivedTimestamp) {
      firstArrivedTimestamp = currentTimestamp;
    }
    lastArrivedTimestamp = currentTimestamp;

    const logEntry = { 
      type: "success-text",
      text: `ARRIVATO - ${num} - ${timestamp} - ${firstDiff} - ${prevDiff}`
    };

    logs.push(logEntry);
    logToFile(logEntry.text);

    io.emit('updateList', clickedNumbers);
    io.emit('updateRemovedList', removedNumbers);
    io.emit('updateLogs', logs);
  });

  socket.on('exportToExcel', () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Log');

    worksheet.addRow(["Attività", "Numero", "Data Ora", "Diff Primo", "Diff Precedente"]);

    logs.forEach(log => {
      const parts = log.text.split(" - ");
      worksheet.addRow([parts[0], parts[1], parts[2], parts[3], parts[4]]);
    });

    workbook.xlsx.writeFile('log.xlsx').then(() => {
      console.log("File Excel generato!");
    });
  });
});

server.listen(3000, () => {
  console.log('Server WebSocket in ascolto su http://localhost:3000');
});
