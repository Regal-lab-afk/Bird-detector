import * as tf from "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.14.0/dist/tf.min.js";
import { YOLO } from "https://cdn.jsdelivr.net/npm/@ultralytics/yolov8/dist/yolov8.js";

const video = document.getElementById("video");
const canvas = document.getElementById("laserCanvas");
const ctx = canvas.getContext("2d");
const activeLasers = [];

// SAFER CAMERA INITIALIZATION
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: "environment" } })
  .then(stream => {
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play();
      // Delay to ensure dimensions are ready
      setTimeout(() => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        console.log("Camera ready:", canvas.width, canvas.height);
      }, 500);
    };
  })
  .catch(err => {
    console.error("Camera error:", err);
    alert("Camera error: " + err.message);
  });

// Load YOLOv8 model
const modelPromise = YOLO.load("https://ultralytics.com/assets/yolov8n-tfjs/model.json");

async function detectBirds() {
  const model = await modelPromise;
  if (video.readyState === 4) {
    try {
      const predictions = await model.detect(video);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      predictions.forEach(pred => {
        if (pred.class === "bird") {
          const [x, y, width, height] = pred.bbox;
          ctx.strokeStyle = "lime";
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);
          ctx.font = "16px sans-serif";
          ctx.fillStyle = "lime";
          ctx.fillText(pred.class, x, y > 10 ? y - 5 : y + 15);
        }
      });
    } catch (err) {
      console.warn("Detection error:", err);
    }
  }

  drawLasers();
  requestAnimationFrame(detectBirds);
}

detectBirds();

// Fire laser button
document.getElementById("fireButton").addEventListener("click", fireLaser);

function fireLaser() {
  const w = canvas.width;
  const h = canvas.height;
  const laserStartX = w / 2;
  const laserStartY = h;

  modelPromise.then(async model => {
    const predictions = await model.detect(video);
    predictions.forEach(pred => {
      if (pred.class === "bird") {
        const [x, y, width, height] = pred.bbox;
        const targetX = x + width / 2;
        const targetY = y + height / 2;

        activeLasers.push({
          sx: laserStartX,
          sy: laserStartY,
          tx: targetX,
          ty: targetY,
          progress: 0,
          pulse: 0
        });
      }
    });
  });
}

// Detailed glowing, pulsing lasers
function drawLasers() {
  activeLasers.forEach((laser, index) => {
    laser.progress += 0.04;
    laser.pulse += 0.3;

    const x = laser.sx + (laser.tx - laser.sx) * laser.progress;
    const y = laser.sy + (laser.ty - laser.sy) * laser.progress;

    const opacity = 1 - laser.progress;
    const pulseWidth = 3 + Math.sin(laser.pulse) * 2;

    // Create a green gradient beam
    const grad = ctx.createLinearGradient(laser.sx, laser.sy, x, y);
    grad.addColorStop(0, `rgba(0, 255, 0, ${opacity})`);
    grad.addColorStop(0.5, `rgba(180, 255, 180, ${opacity * 0.9})`);
    grad.addColorStop(1, `rgba(255, 255, 255, ${opacity * 0.5})`);

    ctx.lineWidth = pulseWidth;
    ctx.strokeStyle = grad;
    ctx.shadowColor = "lime";
    ctx.shadowBlur = 25;

    ctx.beginPath();
    ctx.moveTo(laser.sx, laser.sy);
    ctx.lineTo(x, y);
    ctx.stroke();

    // When laser hits target
    if (laser.progress >= 1) {
      drawHitEffect(x, y);
      activeLasers.splice(index, 1);
    }
  });
}

// Hit sparkle effect
function drawHitEffect(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * 8;
    const ex = x + Math.cos(angle) * dist;
    const ey = y + Math.sin(angle) * dist;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = "rgba(0, 255, 0, 0.6)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.stroke();
  }
}
